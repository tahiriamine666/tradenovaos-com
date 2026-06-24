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
