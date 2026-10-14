// Client for the native TradeNova billing screen (server function `dodo-billing`).
import { supabase } from "@/integrations/supabase/client";

export type NativeSubscription = {
  status: string | null;
  amount: number | null; // smallest currency unit
  currency: string | null;
  interval: string | null;
  interval_count: number | null;
  next_billing_date: string | null;
  cancel_at_next_billing_date: boolean;
  cancelled_at: string | null;
  created_at: string | null;
};
export type NativePayment = { id: string; created_at: string | null; amount: number | null; currency: string | null; status: string | null };
export type BillingSummary = { subscription: NativeSubscription; payments: NativePayment[] };

async function call(body: Record<string, unknown>): Promise<{ ok?: boolean; subscription?: NativeSubscription; payments?: NativePayment[]; cancel_at_next_billing_date?: boolean; url?: string }> {
  const { data, error } = await supabase.functions.invoke("dodo-billing", { body });
  if (error) throw new Error("Billing service unavailable");
  return data;
}

/** Returns null when native data is unavailable (caller shows stored data + fallback). */
export async function fetchBillingSummary(): Promise<BillingSummary | null> {
  try {
    const d = await call({ action: "summary" });
    return d?.ok ? { subscription: d.subscription, payments: d.payments ?? [] } : null;
  } catch {
    return null;
  }
}

export async function setCancelAtPeriodEnd(cancel: boolean): Promise<boolean> {
  const d = await call({ action: cancel ? "cancel" : "reactivate" });
  if (!d?.ok) throw new Error("We couldn't update your subscription. Please try again.");
  return !!d.cancel_at_next_billing_date;
}

export async function startPaymentMethodUpdate(): Promise<void> {
  const d = await call({ action: "update_payment_method" });
  if (!d?.ok || typeof d.url !== "string") throw new Error("Secure payment update is unavailable right now.");
  window.location.assign(d.url);
}

export async function downloadInvoice(paymentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("dodo-billing", { body: { action: "invoice", payment_id: paymentId } });
  if (error || !(data instanceof Blob)) throw new Error("Invoice not available");
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `TradeNova-invoice-${paymentId}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Formats a provider amount (smallest unit) — null when unknown, never invented. */
export function formatMinorAmount(amount: number | null | undefined, currency: string | null | undefined): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return null;
  }
}

export function intervalLabel(interval: string | null, count: number | null): string {
  if (!interval) return "";
  const unit = interval.toLowerCase();
  return count && count > 1 ? `every ${count} ${unit}s` : `per ${unit}`;
}
