// Shared Lemon Squeezy helpers used by ls-* edge functions.
export const PRO_VARIANT_ID = "1825642";
export const ELITE_VARIANT_ID = "1825635";

export const LS_API = "https://api.lemonsqueezy.com/v1";

export function planFromVariant(variantId: string | number | undefined | null): "pro" | "elite" | null {
  const v = String(variantId ?? "");
  if (v === PRO_VARIANT_ID) return "pro";
  if (v === ELITE_VARIANT_ID) return "elite";
  return null;
}

export function variantFromPlan(plan: "pro" | "elite"): string {
  return plan === "pro" ? PRO_VARIANT_ID : ELITE_VARIANT_ID;
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
