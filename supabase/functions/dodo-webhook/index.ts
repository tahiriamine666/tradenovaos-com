// Dodo Payments webhook handler.
// Verifies Standard Webhooks HMAC and writes canonical billing state to public.subscriptions.
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
    const { data } = await admin.from("subscriptions")
      .select("user_id").eq("dodo_subscription_id", opts.subscriptionId).maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (opts.customerId) {
    const { data } = await admin.from("subscriptions")
      .select("user_id").eq("dodo_customer_id", opts.customerId).maybeSingle();
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
      const paymentId = String(data.payment_id ?? "") || null;
      const email: string | undefined = data.customer?.email ?? data.email;
      const productId = String(data.product_id ?? "") || null;
      const statusRaw = String(data.status ?? "");
      const metadata = data.metadata ?? {};
      const trialEnd = data.trial_end ?? data.trial_ends_at ?? null;
      const renewsAt = data.next_billing_date ?? data.renews_at ?? null;
      const endsAt = data.cancelled_at ?? data.ends_at ?? null;

      const planInfo = planFromProductId(productId);
      const plan = planInfo?.plan ?? null;
      const billing = planInfo?.billing ?? null;
      const status = mirrorStatus(statusRaw);

      const userId = await findUserId({
        hintUserId: metadata?.user_id,
        email,
        customerId: customerId ?? undefined,
        subscriptionId: subscriptionId ?? undefined,
      });

      if (!userId) {
        console.error("dodo-webhook: no user match", { subscriptionId, customerId, email });
        return new Response(JSON.stringify({ ok: true, note: "no_user_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upErr } = await admin.from("subscriptions").upsert({
        user_id: userId,
        billing_provider: "dodo",
        dodo_customer_id: customerId,
        dodo_subscription_id: subscriptionId,
        dodo_payment_id: paymentId,
        dodo_product_id: productId,
        plan,
        status,
        billing_interval: billing,
        trial_end: trialEnd,
        renews_at: renewsAt,
        current_period_end: renewsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (upErr) throw upErr;

      const { data: prof } = await admin
        .from("profiles").select("upgraded_manually").eq("id", userId).maybeSingle();
      const manuallyUpgraded = Boolean(prof?.upgraded_manually);

      if (!(manuallyUpgraded && ["inactive", "canceled"].includes(status))) {
        const activePlan = plan && !["inactive", "canceled"].includes(status) ? plan : null;
        const { error: profErr } = await admin.from("profiles").update({
          subscription_status: status,
          plan_type: activePlan,
          subscription_plan: activePlan,
          trial_ends_at: trialEnd,
          current_period_end: renewsAt,
          dodo_customer_id: customerId,
          dodo_subscription_id: subscriptionId,
          dodo_payment_id: paymentId,
          dodo_product_id: productId,
          upgraded_at: activePlan ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
        if (profErr) throw profErr;
      }

    } else if (type === "payment.succeeded" || type === "payment.failed") {
      const subscriptionId = String(data.subscription_id ?? "");
      const paymentId = String(data.payment_id ?? data.id ?? "") || null;
      if (subscriptionId) {
        const status = type === "payment.succeeded" ? "active" : "past_due";
        const { data: existing } = await admin.from("subscriptions")
          .select("user_id,plan")
          .eq("dodo_subscription_id", subscriptionId)
          .maybeSingle();

        if (existing?.user_id) {
          await admin.from("subscriptions").update({
            status,
            dodo_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          }).eq("dodo_subscription_id", subscriptionId);

          await admin.from("profiles").update({
            subscription_status: status,
            dodo_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.user_id);
        }
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
