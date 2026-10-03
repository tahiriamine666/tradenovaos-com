// On-demand Dodo sync for the signed-in user.
// Canonical billing state is public.subscriptions; profiles only mirrors access fields.
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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const email = (claims.claims as any).email as string | undefined;
    if (!email) {
      return new Response(JSON.stringify({ ok: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Deno.env.get("DODO_API_KEY")) {
      return new Response(JSON.stringify({ ok: false, reason: "dodo_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const res = await fetch(
      `${dodoApiBase()}/subscriptions?email=${encodeURIComponent(email)}&page_size=5`,
      { headers: dodoAuthHeaders() },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("dodo-sync API error", res.status, json);
      return new Response(JSON.stringify({ ok: false, reason: "dodo_api_error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (json?.items ?? json?.data ?? []) as any[];
    items.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    const sub = items[0];
    if (!sub) {
      return new Response(JSON.stringify({ ok: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = String(sub.product_id ?? "");
    const planInfo = planFromProductId(productId);
    const plan = planInfo?.plan ?? null;
    const billing = planInfo?.billing ?? null;
    const status = String(sub.status ?? "");
    const mirror = mirrorStatus(status);
    const customerId = String(sub.customer?.customer_id ?? sub.customer_id ?? "") || null;
    const subscriptionId = String(sub.subscription_id ?? sub.id ?? "") || null;
    const trialEnd = sub.trial_end ?? sub.trial_ends_at ?? null;
    const renewsAt = sub.next_billing_date ?? sub.renews_at ?? null;
    const endsAt = sub.cancelled_at ?? sub.ends_at ?? null;

    const row = {
      user_id: userId,
      billing_provider: "dodo",
      dodo_customer_id: customerId,
      dodo_subscription_id: subscriptionId,
      dodo_product_id: productId || null,
      plan,
      status: mirror,
      billing_interval: billing,
      trial_end: trialEnd,
      renews_at: renewsAt,
      current_period_end: renewsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("subscriptions")
      .upsert(row, { onConflict: "user_id" });
    if (upErr) throw upErr;

    const activePlan = plan && !["canceled", "inactive"].includes(mirror) ? plan : null;
    const { error: profErr } = await admin.from("profiles").update({
      subscription_status: mirror,
      plan_type: activePlan,
      subscription_plan: activePlan,
      trial_ends_at: trialEnd,
      current_period_end: renewsAt,
      dodo_customer_id: customerId,
      dodo_subscription_id: subscriptionId,
      dodo_product_id: productId || null,
      upgraded_at: activePlan ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (profErr) throw profErr;

    return new Response(JSON.stringify({ ok: true, plan, status: mirror }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dodo-sync error", e);
    return new Response(JSON.stringify({ ok: false, error: "sync_internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
