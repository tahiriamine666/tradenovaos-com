// On-demand sync: query Dodo for the user's most recent subscription and
// upsert billing_subscriptions. Used by /billing/success as a fallback
// in case the webhook hasn't landed yet.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { dodoApiBase, dodoAuthHeaders, mirrorStatus, planFromProductId } from "../_shared/dodo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;
    const email = (claims.claims as any).email as string | undefined;

    if (!Deno.env.get("DODO_API_KEY")) {
      return new Response(JSON.stringify({ ok: false, reason: "dodo_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Try to find recent subscriptions for this email.
    if (!email) {
      return new Response(JSON.stringify({ ok: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${dodoApiBase()}/subscriptions?email=${encodeURIComponent(email)}&page_size=5`;
    const res = await fetch(url, { headers: dodoAuthHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("dodo-sync error", res.status, json);
      return new Response(JSON.stringify({ ok: false, reason: "dodo_api_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const items = (json?.items ?? json?.data ?? []) as any[];
    // Newest first.
    items.sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });
    const sub = items[0];
    if (!sub) {
      return new Response(JSON.stringify({ ok: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = String(sub.product_id ?? "");
    const planInfo = planFromProductId(productId);
    const plan = planInfo?.plan ?? null;
    const status = String(sub.status ?? "");

    const row = {
      user_id: userId,
      provider: "dodo",
      customer_id: String(sub.customer?.customer_id ?? sub.customer_id ?? ""),
      subscription_id: String(sub.subscription_id ?? sub.id ?? ""),
      variant_id: productId || null,
      plan: plan ?? "free",
      status,
      trial_ends_at: sub.trial_end ?? sub.trial_ends_at ?? null,
      renews_at: sub.next_billing_date ?? sub.renews_at ?? null,
      ends_at: sub.cancelled_at ?? sub.ends_at ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("billing_subscriptions")
      .upsert(row, { onConflict: "user_id" });
    if (upErr) {
      console.error("dodo-sync upsert error", upErr);
      return new Response(JSON.stringify({ ok: false, reason: "upsert_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mirror = mirrorStatus(status);
    const profUpdate: Record<string, unknown> = {
      subscription_status: mirror,
      trial_ends_at: row.trial_ends_at,
      current_period_end: row.renews_at,
      upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (plan && mirror !== "canceled" && mirror !== "inactive") {
      profUpdate.plan_type = plan;
      profUpdate.subscription_plan = plan;
    }
    await admin.from("profiles").update(profUpdate).eq("id", userId);

    return new Response(JSON.stringify({ ok: true, plan, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dodo-sync error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
