// Thin client for our Dodo Payments edge functions.
import { supabase } from "@/integrations/supabase/client";

export type DodoPlan = "pro" | "elite";
export type DodoBilling = "monthly" | "yearly";

export type CheckoutArgs = {
  plan: DodoPlan;
  billing?: DodoBilling;
  email?: string;
  name?: string;
  country?: string;
  zip?: string;
};

export async function createCheckoutUrl(args: CheckoutArgs): Promise<string> {
  const { data, error } = await supabase.functions.invoke("dodo-checkout", { body: args });
  if (error) throw new Error(error.message ?? "Checkout failed");
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Checkout URL missing");
  return url;
}

/** Convenience: create checkout and redirect. */
export async function startCheckout(plan: DodoPlan, billing: DodoBilling = "monthly"): Promise<void> {
  const url = await createCheckoutUrl({ plan, billing });
  window.location.href = url;
}

export async function openCustomerPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("dodo-portal", { method: "POST" });
  if (error) throw new Error(error.message ?? "Could not open billing portal");
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Portal URL not available yet");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function syncSubscription(): Promise<void> {
  await supabase.functions.invoke("dodo-sync-subscription", { method: "POST" });
}
