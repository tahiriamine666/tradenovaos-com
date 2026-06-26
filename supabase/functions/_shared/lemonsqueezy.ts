// Shared Lemon Squeezy helpers used by ls-* edge functions.
export const PRO_MONTHLY_VARIANT_ID = "1825642";
export const ELITE_MONTHLY_VARIANT_ID = "1825635";
// Optional yearly variants — set these envs in LS dashboard if available.
export const PRO_YEARLY_VARIANT_ID = Deno.env.get("LS_PRO_YEARLY_VARIANT_ID") ?? "";
export const ELITE_YEARLY_VARIANT_ID = Deno.env.get("LS_ELITE_YEARLY_VARIANT_ID") ?? "";

// Back-compat exports
export const PRO_VARIANT_ID = PRO_MONTHLY_VARIANT_ID;
export const ELITE_VARIANT_ID = ELITE_MONTHLY_VARIANT_ID;

export const LS_API = "https://api.lemonsqueezy.com/v1";

export type Plan = "pro" | "elite";
export type Billing = "monthly" | "yearly";

export function planFromVariant(variantId: string | number | undefined | null): Plan | null {
  const v = String(variantId ?? "");
  if (v === PRO_MONTHLY_VARIANT_ID || v === PRO_YEARLY_VARIANT_ID) return "pro";
  if (v === ELITE_MONTHLY_VARIANT_ID || v === ELITE_YEARLY_VARIANT_ID) return "elite";
  return null;
}

export function variantFromPlan(plan: Plan, billing: Billing = "monthly"): string {
  if (plan === "pro") {
    return billing === "yearly" && PRO_YEARLY_VARIANT_ID
      ? PRO_YEARLY_VARIANT_ID
      : PRO_MONTHLY_VARIANT_ID;
  }
  return billing === "yearly" && ELITE_YEARLY_VARIANT_ID
    ? ELITE_YEARLY_VARIANT_ID
    : ELITE_MONTHLY_VARIANT_ID;
}

export function lsHeaders(apiKey: string) {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function resolveStoreIdForVariant(apiKey: string, variantId: string): Promise<string | null> {
  const variantRes = await fetch(`${LS_API}/variants/${variantId}`, {
    headers: lsHeaders(apiKey),
  });
  const variantJson = await variantRes.json().catch(() => null);
  if (!variantRes.ok) {
    console.error("lemonsqueezy: variant lookup failed", variantRes.status, variantJson);
    return null;
  }

  const productId = variantJson?.data?.relationships?.product?.data?.id;
  if (!productId) return null;

  const productRes = await fetch(`${LS_API}/products/${productId}`, {
    headers: lsHeaders(apiKey),
  });
  const productJson = await productRes.json().catch(() => null);
  if (!productRes.ok) {
    console.error("lemonsqueezy: product lookup failed", productRes.status, productJson);
    return null;
  }

  return productJson?.data?.relationships?.store?.data?.id ?? null;
}

export async function listAccessibleStoreIds(apiKey: string): Promise<string[]> {
  const storesRes = await fetch(`${LS_API}/stores`, {
    headers: lsHeaders(apiKey),
  });
  const storesJson = await storesRes.json().catch(() => null);
  if (!storesRes.ok) {
    console.error("lemonsqueezy: stores lookup failed", storesRes.status, storesJson);
    return [];
  }

  return Array.isArray(storesJson?.data)
    ? storesJson.data.map((store: any) => String(store?.id ?? "").trim()).filter(Boolean)
    : [];
}

export function hasStoreRelationshipError(json: unknown): boolean {
  return Array.isArray((json as any)?.errors)
    && (json as any).errors.some((err: any) => err?.source?.pointer === "/data/relationships/store");
}

// Map Lemon Squeezy status → our subscription_status mirror on profiles
export function mirrorStatus(lsStatus: string): string {
  switch (lsStatus) {
    case "on_trial":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "paused":
      return "past_due";
    case "cancelled":
      return "canceled";
    case "expired":
    case "unpaid":
      return "inactive";
    default:
      return lsStatus;
  }
}
