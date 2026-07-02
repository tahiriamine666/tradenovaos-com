// Dodo Payments webhook handler (Standard Webhooks spec).
// Verifies HMAC signature, then upserts billing_subscriptions (source of truth)
// and mirrors plan/status onto profiles.
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
  hintUserId?: string; email?: string; customerId?: string; subscriptionId?: string;
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
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const secret = Deno.env.get("DODO_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("dodo-webhook: secret missing");
    return new Response("misconfigured", { status: 500, headers: corsHeaders });
  }

  const ok = await verifyStandardWebhook(raw, req.headers, secret);
  if (!ok) {
    console.warn("dodo-webhook: invalid signature");
    return new Response("invalid_signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const type: string = event?.type ?? "";
  const data = event?.data ?? {};
  console.log("dodo-webhook:", type, "id=", data?.subscription_id ?? data?.payment_id ?? data?.id);

  try {
    if (type.startsWith("subscription.")) {
      const subscriptionId: string = String(data.subscription_id ?? data.id ?? "");
      const customerId: string = String(data.customer?.customer_id ?? data.customer_id ?? "");
      const email: string | undefined = data.customer?.email ?? data.email;
      const productId: string = String(data.product_id ?? "");
      const status: string = String(data.status ?? "");
      const metadata = data.metadata ?? {};
      const trialEndsAt: string | null = data.trial_end ?? data.trial_ends_at ?? null;
      const renewsAt: string | null = data.next_billing_date ?? data.renews_at ?? null;
      const endsAt: string | null = data.cancelled_at ?? data.ends_at ?? null;

      const planInfo = planFromProductId(productId);
      const plan = planInfo?.plan ?? null;

      const userId = await findUserId({
        hintUserId: metadata?.user_id,
        email,
        customerId,
        subscriptionId,
      });
      if (!userId) {
        console.error("dodo-webhook: no user match", { subscriptionId, customerId, email });
        return new Response(JSON.stringify({ ok: true, note: "no_user_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const row = {
        user_id: userId,
        provider: "dodo",
        customer_id: customerId || null,
        subscription_id: subscriptionId || null,
        variant_id: productId || null,
        plan: plan ?? "free",
        status,
        trial_ends_at: trialEndsAt,
        renews_at: renewsAt,
        ends_at: endsAt,
        customer_portal_url: null,
        update_payment_method_url: null,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await admin
        .from("billing_subscriptions")
        .upsert(row, { onConflict: "user_id" });
      if (upErr) {
        console.error("dodo-webhook upsert error", upErr);
        return new Response("upsert_failed", { status: 500, headers: corsHeaders });
      }

      // Mirror onto profiles for gates / admin tools.
      const mirror = mirrorStatus(status);
      const profUpdate: Record<string, unknown> = {
        subscription_status: mirror,
        trial_ends_at: trialEndsAt,
        current_period_end: renewsAt,
        upgraded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (plan && mirror !== "canceled" && mirror !== "inactive") {
        profUpdate.plan_type = plan;
        profUpdate.subscription_plan = plan;
      }
      await admin.from("profiles").update(profUpdate).eq("id", userId);
    } else if (type === "payment.succeeded" || type === "payment.failed") {
      // For payments tied to a subscription, refresh the row's status if we can.
      const subscriptionId: string = String(data.subscription_id ?? "");
      if (subscriptionId) {
        const newStatus = type === "payment.succeeded" ? "active" : "past_due";
        const { data: existing } = await admin
          .from("billing_subscriptions")
          .select("user_id, plan")
          .eq("subscription_id", subscriptionId)
          .maybeSingle();
        if (existing?.user_id) {
          await admin.from("billing_subscriptions")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("subscription_id", subscriptionId);
          await admin.from("profiles")
            .update({
              subscription_status: mirrorStatus(newStatus),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.user_id);
        }
      }
    } else {
      console.log("dodo-webhook: ignoring event", type);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dodo-webhook handler error", e);
    return new Response("handler_error", { status: 500, headers: corsHeaders });
  }
});
