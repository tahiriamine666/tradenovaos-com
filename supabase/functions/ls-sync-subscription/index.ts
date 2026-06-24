// On-demand sync: query Lemon Squeezy for the user's most recent subscription
// and upsert billing_subscriptions. Used by /billing/success as a fallback
// in case the webhook hasn't landed yet.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { LS_API, lsHeaders, mirrorStatus, planFromVariant } from "../_shared/lemonsqueezy.ts";

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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const email = userData.user.email ?? "";

    const apiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    const storeId = Deno.env.get("LEMON_SQUEEZY_STORE_ID");
    if (!apiKey || !storeId) {
      return new Response(JSON.stringify({ ok: false, reason: "lemonsqueezy_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Find most recent subscription by user_email.
    const url = `${LS_API}/subscriptions?filter[store_id]=${encodeURIComponent(storeId)}&filter[user_email]=${encodeURIComponent(email)}&sort=-created_at&page[size]=5`;
    const res = await fetch(url, { headers: lsHeaders(apiKey) });
    const json = await res.json();
    if (!res.ok) {
      console.error("ls-sync error", res.status, json);
      return new Response(JSON.stringify({ ok: false, reason: "ls_api_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = (json?.data ?? [])[0];
    if (!sub) {
      return new Response(JSON.stringify({ ok: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const attr = sub.attributes ?? {};
    const variantId = String(attr.variant_id ?? "");
    const plan = planFromVariant(variantId);
    const status = attr.status ?? "";

    const row = {
      user_id: userId,
      customer_id: String(attr.customer_id ?? ""),
      subscription_id: String(sub.id),
      variant_id: variantId,
      plan: plan ?? "free",
      status,
      trial_ends_at: attr.trial_ends_at ?? null,
      renews_at: attr.renews_at ?? null,
      ends_at: attr.ends_at ?? null,
      update_payment_method_url: attr.urls?.update_payment_method ?? null,
      customer_portal_url: attr.urls?.customer_portal ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("billing_subscriptions")
      .upsert(row, { onConflict: "user_id" });
    if (upErr) {
      console.error("ls-sync upsert error", upErr);
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
    console.error("ls-sync error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
