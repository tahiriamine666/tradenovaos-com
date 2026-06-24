// Thin client for our Lemon Squeezy edge functions.
import { supabase } from "@/integrations/supabase/client";

export type LsPlan = "pro" | "elite";

export async function startCheckout(plan: LsPlan): Promise<void> {
  const { data, error } = await supabase.functions.invoke("ls-checkout", {
    body: { plan },
  });
  if (error) throw new Error(error.message ?? "Checkout failed");
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Checkout URL missing");
  window.location.href = url;
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
