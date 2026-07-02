// Shared Dodo Payments helpers used by dodo-* edge functions.
export type Plan = "pro" | "elite";
export type Billing = "monthly" | "yearly";

export function dodoApiBase(): string {
  const env = (Deno.env.get("DODO_ENV") ?? "live").toLowerCase();
  return env === "test" || env === "test_mode" || env === "sandbox"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export function productIdForPlan(plan: Plan, billing: Billing): string | null {
  const key = (() => {
    if (plan === "pro" && billing === "monthly") return "DODO_PRODUCT_PRO_MONTHLY";
    if (plan === "pro" && billing === "yearly")  return "DODO_PRODUCT_PRO_YEARLY";
    if (plan === "elite" && billing === "monthly") return "DODO_PRODUCT_ELITE_MONTHLY";
    if (plan === "elite" && billing === "yearly")  return "DODO_PRODUCT_ELITE_YEARLY";
    return null;
  })();
  if (!key) return null;
  const v = Deno.env.get(key);
  return v && v.trim() ? v.trim() : null;
}

const PRODUCT_TO_PLAN_CACHE = new Map<string, { plan: Plan; billing: Billing }>();

export function planFromProductId(productId: string | null | undefined): { plan: Plan; billing: Billing } | null {
  if (!productId) return null;
  if (PRODUCT_TO_PLAN_CACHE.size === 0) {
    const entries: Array<[string | undefined, Plan, Billing]> = [
      [Deno.env.get("DODO_PRODUCT_PRO_MONTHLY"),   "pro",   "monthly"],
      [Deno.env.get("DODO_PRODUCT_PRO_YEARLY"),    "pro",   "yearly"],
      [Deno.env.get("DODO_PRODUCT_ELITE_MONTHLY"), "elite", "monthly"],
      [Deno.env.get("DODO_PRODUCT_ELITE_YEARLY"),  "elite", "yearly"],
    ];
    for (const [id, plan, billing] of entries) {
      if (id && id.trim()) PRODUCT_TO_PLAN_CACHE.set(id.trim(), { plan, billing });
    }
  }
  return PRODUCT_TO_PLAN_CACHE.get(String(productId)) ?? null;
}

export function dodoAuthHeaders(): Record<string, string> {
  const key = Deno.env.get("DODO_API_KEY") ?? "";
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Map Dodo subscription status -> the mirror we store on `profiles.subscription_status`.
export function mirrorStatus(dodoStatus: string): string {
  switch ((dodoStatus ?? "").toLowerCase()) {
    case "active":         return "active";
    case "trialing":
    case "on_trial":       return "trialing";
    case "on_hold":
    case "past_due":       return "past_due";
    case "cancelled":
    case "canceled":       return "canceled";
    case "expired":
    case "failed":
    case "paused":         return "inactive";
    default:               return dodoStatus || "inactive";
  }
}

// ─── Standard Webhooks HMAC verification ─────────────────────────────────────
// https://www.standardwebhooks.com/verify
// Signature header is space-separated list of `v1,<base64_signature>`.
// The secret is often prefixed `whsec_` and its remainder is base64-encoded.

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

export async function verifyStandardWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !sigHeader || !secret) return false;

  // Timestamp tolerance: 5 minutes.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(rawSecret);
  } catch {
    keyBytes = new TextEncoder().encode(rawSecret);
  }

  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const toSign = `${id}.${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const expected = bytesToBase64(mac);

  // Header may contain multiple space-separated signatures like: "v1,abc v1,def"
  const parts = sigHeader.split(" ");
  for (const p of parts) {
    const [, sig] = p.split(",");
    if (!sig) continue;
    if (sig.length === expected.length) {
      let diff = 0;
      for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
      if (diff === 0) return true;
    }
  }
  return false;
}
