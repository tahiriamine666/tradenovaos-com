// Paddle Billing webhook handler.
// Verifies Paddle signature, then upserts subscription state onto profiles.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paddle-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRO_PRICE = Deno.env.get("PADDLE_PRO_PRICE_ID") ?? "";
const ELITE_PRICE = Deno.env.get("PADDLE_ELITE_PRICE_ID") ?? "";
const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ── Paddle signature verification ────────────────────────────────────────────
// Header format: "ts=1700000000;h1=<hex hmac sha256 of `${ts}:${rawBody}`>"
async function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader || !WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ts}:${rawBody}`)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // constant-time compare
  if (hex.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

function planFromPriceId(priceId: string | undefined): "pro" | "elite" | null {
  if (!priceId) return null;
  if (priceId === PRO_PRICE) return "pro";
  if (priceId === ELITE_PRICE) return "elite";
  return null;
}

async function findProfileId(opts: { userId?: string; customerId?: string; email?: string }) {
  if (opts.userId) {
    const { data } = await supabase.from("profiles").select("id").eq("id", opts.userId).maybeSingle();
    if (data?.id) return data.id;
  }
  if (opts.customerId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("paddle_customer_id", opts.customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (opts.email) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", opts.email)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  const sig = req.headers.get("paddle-signature");
  const ok = await verifyPaddleSignature(raw, sig);
  if (!ok) {
    console.warn("paddle-webhook: invalid signature");
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const type: string = event.event_type ?? "";
  const data = event.data ?? {};
  console.log("paddle-webhook:", type, "id=", data.id);

  try {
    // subscription.* events
    if (type.startsWith("subscription.")) {
      const subId: string | undefined = data.id;
      const customerId: string | undefined = data.customer_id;
      const customData = data.custom_data ?? {};
      const userIdHint: string | undefined = customData.user_id;
      const items: any[] = data.items ?? [];
      const firstItem = items[0] ?? {};
      const priceId: string | undefined = firstItem.price?.id ?? firstItem.price_id;
      const plan = planFromPriceId(priceId);
      const status: string = data.status ?? "active"; // active | trialing | past_due | paused | canceled
      const trialEndsAt: string | null = firstItem.trial_dates?.ends_at ?? data.trial_dates?.ends_at ?? null;
      const currentPeriodEnd: string | null = data.current_billing_period?.ends_at ?? null;

      // Map Paddle status → our subscription_status
      let mappedStatus = status;
      if (type === "subscription.canceled") mappedStatus = "canceled";
      if (type === "subscription.paused" || status === "paused") mappedStatus = "past_due";

      const profileId = await findProfileId({
        userId: userIdHint,
        customerId,
        email: data.customer?.email,
      });

      if (!profileId) {
        console.error("paddle-webhook: no profile match for sub", subId, "user_id hint:", userIdHint);
        return new Response(JSON.stringify({ ok: true, note: "no_profile_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const update: Record<string, unknown> = {
        paddle_subscription_id: subId,
        paddle_customer_id: customerId,
        paddle_price_id: priceId,
        subscription_status: mappedStatus,
        current_period_end: currentPeriodEnd,
        trial_ends_at: trialEndsAt,
        upgraded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (plan && mappedStatus !== "canceled") {
        update.plan_type = plan;
        update.subscription_plan = plan;
      }
      // Keep access until period end on cancel; do NOT immediately downgrade plan_type.

      const { error } = await supabase.from("profiles").update(update).eq("id", profileId);
      if (error) {
        console.error("paddle-webhook: update error", error);
        return new Response(JSON.stringify({ error: "update_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (type === "transaction.payment_failed") {
      const customerId: string | undefined = data.customer_id;
      const customData = data.custom_data ?? {};
      const profileId = await findProfileId({
        userId: customData.user_id,
        customerId,
        email: data.customer?.email,
      });
      if (profileId) {
        await supabase
          .from("profiles")
          .update({ subscription_status: "past_due", updated_at: new Date().toISOString() })
          .eq("id", profileId);
      }
    }
    // transaction.completed → no DB change; subscription.* drives plan state.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paddle-webhook: error", e);
    return new Response(JSON.stringify({ error: "handler_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
