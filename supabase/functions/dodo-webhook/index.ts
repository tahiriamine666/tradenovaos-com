// Dodo Payments webhook handler.
// Verifies Standard Webhooks HMAC and writes canonical billing state to public.billing_subscriptions.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { mirrorStatus, planFromProductId, verifyStandardWebhook } from "../_shared/dodo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "webhook-id, webhook-signature, webhook-timestamp, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function findUserId(opts: {
  hintUserId?: string;
  email?: string;
  customerId?: string;
  subscriptionId?: string;
}): Promise<string | null> {
  if (opts.hintUserId) {
    const { data } = await admin.from("profiles").select("id").eq("id", opts.hintUserId).maybeSingle();
    if (data?.id) return data.id;
  }

  if (opts.subscriptionId) {
    const { data } = await admin.from("billing_subscriptions")
      .select("user_id").eq("subscription_id", opts.subscriptionId).maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (opts.customerId) {
    const { data } = await admin.from("billing_subscriptions")
      .select("user_id").eq("customer_id", opts.customerId).maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (opts.email) {
    const { data } = await admin.from("profiles")
      .select("id").ilike("email", opts.email).maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: corsHeaders });

  const raw = await req.text();
  const secret = Deno.env.get("DODO_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("dodo-webhook: secret missing");
    return new Response("misconfigured", { status: 500, headers: corsHeaders });
  }

  if (!(await verifyStandardWebhook(raw, req.headers, secret))) {
    console.warn("dodo-webhook: invalid signature");
    return new Response("invalid_signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const type = String(event?.type ?? "");
  const data = event?.data ?? {};

  try {
    if (type.startsWith("subscription.")) {
      const subscriptionId = String(data.subscription_id ?? data.id ?? "") || null;
      const customerId = String(data.customer?.customer_id ?? data.customer_id ?? "") || null;
      const email: string | undefined = data.customer?.email ?? data.email;
      const productId = String(data.product_id ?? "") || null;
      const statusRaw = String(data.status ?? "");
      const metadata = data.metadata ?? {};
      const trialEnd = data.trial_end ?? data.trial_ends_at ?? null;
      const renewsAt = data.next_billing_date ?? data.renews_at ?? null;
      const endsAt = data.cancelled_at ?? data.ends_at ?? null;

      const planInfo = planFromProductId(productId);
      const plan = planInfo?.plan ?? null;
      const status = mirrorStatus(statusRaw);

      const userId = await findUserId({
        hintUserId: metadata?.user_id,
        email,
        customerId: customerId ?? undefined,
        subscriptionId: subscriptionId ?? undefined,
      });

      if (!userId) {
        console.error("dodo-webhook: no user match", { subscriptionId, customerId, email });
        return new Response(JSON.stringify({ ok: false, note: "no_user_match" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only write the canonical Dodo record. Manual overrides and historical billing remain separate.
      const { data: previous, error: lookupError } = await admin.from("billing_subscriptions")
        .select("plan,variant_id").eq("user_id", userId).maybeSingle();
      if (lookupError) throw lookupError;
      const effectivePlan = plan ?? previous?.plan;
      if (!effectivePlan) throw new Error("Unknown Dodo product; cannot resolve plan");
      const { error: upErr } = await admin.rpc("apply_dodo_welcome_billing_event", {
        p_event_id: req.headers.get("webhook-id"),
        p_user_id: userId,
        p_status_only: false,
        p_subscription: {
        user_id: userId,
        provider: "dodo",
        customer_id: customerId,
        subscription_id: subscriptionId,
        variant_id: productId ?? previous?.variant_id,
        plan: effectivePlan,
        status,
        trial_ends_at: trialEnd,
        renews_at: renewsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString(),
        },
      });
      if (upErr) throw upErr;

    } else if (type === "payment.succeeded" || type === "payment.failed") {
      const subscriptionId = String(data.subscription_id ?? "");
      if (subscriptionId) {
        const status = type === "payment.succeeded" ? "active" : "past_due";
        const { data: existing } = await admin.from("billing_subscriptions")
          .select("user_id,plan")
          .eq("subscription_id", subscriptionId)
          .maybeSingle();

        if (!existing?.user_id) throw new Error("Subscription event arrived before its subscription record");
        const { error } = await admin.rpc("apply_dodo_welcome_billing_event", {
          p_event_id: req.headers.get("webhook-id"),
          p_user_id: existing.user_id,
          p_status_only: true,
          p_subscription: { status, subscription_id: subscriptionId, updated_at: new Date().toISOString() },
        });
        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dodo-webhook handler error", e);
    return new Response("handler_error", { status: 500, headers: corsHeaders });
  }
});
