// Thin client for our Lemon Squeezy edge functions.
import { supabase } from "@/integrations/supabase/client";

export type LsPlan = "pro" | "elite";
export type LsBilling = "monthly" | "yearly";

export type CheckoutArgs = {
  plan: LsPlan;
  billing?: LsBilling;
  coupon?: string;
  email?: string;
  name?: string;
  country?: string;
  zip?: string;
};

export async function createCheckoutUrl(args: CheckoutArgs): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ls-checkout", { body: args });
  if (error) throw new Error(error.message ?? "Checkout failed");
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Checkout URL missing");
  return url;
}

// Back-compat: legacy callers that want a redirect flow.
export async function startCheckout(plan: LsPlan): Promise<void> {
  const url = await createCheckoutUrl({ plan });
  window.location.href = url;
}

export type CouponResult = {
  valid: boolean;
  code?: string;
  amount?: number;
  amount_type?: "percent" | "fixed";
  label?: string;
  name?: string;
  error?: string;
};

export async function validateCoupon(args: { code: string; plan: LsPlan; billing?: LsBilling }): Promise<CouponResult> {
  const { data, error } = await supabase.functions.invoke("ls-validate-coupon", { body: args });
  if (error) return { valid: false, error: error.message };
  return data as CouponResult;
}

export async function openCustomerPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("ls-portal", { method: "POST" });
  if (error) throw new Error(error.message ?? "Could not open billing portal");
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Portal URL not available yet");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function syncSubscription(): Promise<void> {
  await supabase.functions.invoke("ls-sync-subscription", { method: "POST" });
}
