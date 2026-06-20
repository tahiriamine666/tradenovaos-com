// Fallback sync: when a user lands on /billing/success but the webhook
// hasn't fired (e.g. webhook destination not configured in Paddle),
// we query the Paddle API for the user's most recent active subscription
// and upgrade their profile directly. Idempotent.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";
const PADDLE_ENV = (Deno.env.get("PADDLE_ENVIRONMENT") ?? "sandbox").toLowerCase();
const PADDLE_BASE = PADDLE_ENV.includes("prod") || PADDLE_ENV.includes("live")
  ? "https://api.paddle.com"
  : "https://sandbox-api.paddle.com";
const PRO_PRICE = Deno.env.get("PADDLE_PRO_PRICE_ID") ?? "";
const ELITE_PRICE = Deno.env.get("PADDLE_ELITE_PRICE_ID") ?? "";

function planFromPriceId(priceId?: string): "pro" | "elite" | null {
  if (!priceId) return null;
  if (priceId === PRO_PRICE) return "pro";
  if (priceId === ELITE_PRICE) return "elite";
  return null;
}

async function paddleGet(path: string) {
  const res = await fetch(`${PADDLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`paddle ${path} ${res.status}: ${await res.text()}`);
  return await res.json();
}

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
    const userEmail = (claims.claims.email as string | undefined) ?? "";

    if (!PADDLE_API_KEY) {
      return new Response(JSON.stringify({ ok: false, reason: "paddle_api_key_missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Find Paddle customer by email
    const { data: prof } = await admin
      .from("profiles")
      .select("paddle_customer_id, email")
      .eq("id", userId)
      .maybeSingle();

    let customerId: string | null = prof?.paddle_customer_id ?? null;
    const email = prof?.email || userEmail;

    if (!customerId && email) {
      const search = await paddleGet(`/customers?email=${encodeURIComponent(email)}`);
      customerId = search?.data?.[0]?.id ?? null;
    }

    if (!customerId) {
      return new Response(JSON.stringify({ ok: false, reason: "no_paddle_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find most recent active/trialing subscription for that customer
    const subs = await paddleGet(
      `/subscriptions?customer_id=${customerId}&status=active,trialing,past_due&per_page=10`,
    );
    const sub = (subs?.data ?? [])[0];
    if (!sub) {
      return new Response(JSON.stringify({ ok: false, reason: "no_active_subscription", customerId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId: string | undefined = sub.items?.[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    if (!plan) {
      return new Response(JSON.stringify({ ok: false, reason: "unknown_price", priceId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trialEnds = sub.items?.[0]?.trial_dates?.ends_at ?? sub.trial_dates?.ends_at ?? null;
    const periodEnd = sub.current_billing_period?.ends_at ?? null;

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        plan_type: plan,
        subscription_plan: plan,
        subscription_status: sub.status,
        paddle_customer_id: customerId,
        paddle_subscription_id: sub.id,
        paddle_price_id: priceId,
        trial_ends_at: trialEnds,
        current_period_end: periodEnd,
        upgraded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updErr) {
      console.error("paddle-sync-subscription update error", updErr);
      return new Response(JSON.stringify({ ok: false, reason: "update_failed", error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, plan, status: sub.status, subscriptionId: sub.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paddle-sync-subscription error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
