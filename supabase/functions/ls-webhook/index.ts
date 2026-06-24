// Lemon Squeezy webhook handler. Verifies HMAC signature, then upserts
// billing_subscriptions (source of truth) and mirrors plan onto profiles.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { mirrorStatus, planFromVariant } from "../_shared/lemonsqueezy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = toHex(mac);
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function findUserId(opts: { hintUserId?: string; email?: string; customerId?: string }): Promise<string | null> {
  if (opts.hintUserId) {
    const { data } = await admin.from("profiles").select("id").eq("id", opts.hintUserId).maybeSingle();
    if (data?.id) return data.id;
  }
  if (opts.customerId) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("user_id")
      .eq("customer_id", opts.customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }
  if (opts.email) {
    const { data } = await admin
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
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const secret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("ls-webhook: secret missing");
    return new Response("misconfigured", { status: 500, headers: corsHeaders });
  }

  const ok = await verifySignature(raw, req.headers.get("x-signature"), secret);
  if (!ok) {
    console.warn("ls-webhook: invalid signature");
    return new Response("invalid_signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const eventName: string = event?.meta?.event_name ?? "";
  const customData = event?.meta?.custom_data ?? {};
  const data = event?.data ?? {};
  const attr = data?.attributes ?? {};
  const subType = data?.type as string | undefined;

  console.log("ls-webhook:", eventName, "type=", subType);

  try {
    // We care about subscription.* events for billing state.
    if (subType === "subscriptions") {
      const subscriptionId = String(data.id ?? "");
      const customerId = String(attr.customer_id ?? "");
      const variantId = String(attr.variant_id ?? "");
      const plan = planFromVariant(variantId);
      const status: string = attr.status ?? "";
      const trialEndsAt: string | null = attr.trial_ends_at ?? null;
      const renewsAt: string | null = attr.renews_at ?? null;
      const endsAt: string | null = attr.ends_at ?? null;
      const updateUrl: string | null = attr.urls?.update_payment_method ?? null;
      const portalUrl: string | null = attr.urls?.customer_portal ?? null;
      const email: string | undefined = attr.user_email;

      const userId = await findUserId({
        hintUserId: customData?.user_id,
        email,
        customerId,
      });

      if (!userId) {
        console.error("ls-webhook: no user match", { subscriptionId, customerId, email });
        return new Response(JSON.stringify({ ok: true, note: "no_user_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const row = {
        user_id: userId,
        customer_id: customerId,
        subscription_id: subscriptionId,
        variant_id: variantId,
        plan: plan ?? "free",
        status,
        trial_ends_at: trialEndsAt,
        renews_at: renewsAt,
        ends_at: endsAt,
        update_payment_method_url: updateUrl,
        customer_portal_url: portalUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await admin
        .from("billing_subscriptions")
        .upsert(row, { onConflict: "user_id" });
      if (upErr) {
        console.error("ls-webhook upsert error", upErr);
        return new Response("upsert_failed", { status: 500, headers: corsHeaders });
      }

      // Mirror onto profiles for back-compat with existing gates / admin tools.
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
    } else if (subType === "orders" && eventName === "order_created") {
      // Orders are informational — subscription.* events carry state.
      // We just log them.
      console.log("ls-webhook: order_created", data.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ls-webhook handler error", e);
    return new Response("handler_error", { status: 500, headers: corsHeaders });
  }
});
