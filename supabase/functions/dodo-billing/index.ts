// Native TradeNova billing management. Reads/acts on the signed-in user's own
// Dodo subscription server-side; the Dodo API key never leaves this function.
// Billing state in the DB is still written only by dodo-webhook / dodo-sync.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { dodoApiBase, dodoAuthHeaders } from "../_shared/dodo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ACTIONS = new Set(["summary", "cancel", "reactivate", "update_payment_method", "invoice"]);

async function dodo(path: string, init: RequestInit = {}) {
  const res = await fetch(`${dodoApiBase()}${path}`, { ...init, headers: dodoAuthHeaders() });
  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await res.json().catch(() => ({})) : null;
  return { ok: res.ok, status: res.status, body, res };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
    const userId = claims?.claims?.sub as string | undefined;
    if (cErr || !userId) return json({ error: "Unauthorized" }, 401);
    if (!Deno.env.get("DODO_API_KEY")) return json({ ok: false, error: "billing_not_configured" });

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "summary";
    if (!ACTIONS.has(action)) return json({ error: "invalid_action" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: row, error: rowErr } = await admin.from("billing_subscriptions")
      .select("customer_id,subscription_id").eq("user_id", userId).maybeSingle();
    if (rowErr) throw rowErr;
    const subId = row?.subscription_id as string | undefined;
    const customerId = row?.customer_id as string | undefined;
    if (!subId || !customerId) return json({ ok: false, error: "no_subscription" });
    const sp = encodeURIComponent(subId);

    if (action === "summary") {
      const sub = await dodo(`/subscriptions/${sp}`);
      if (!sub.ok) { console.error("dodo-billing sub", sub.status); return json({ ok: false, error: "provider_unavailable" }); }
      const s = sub.body ?? {};
      // Payments are listed only for this user's own customer id, then filtered to their subscription.
      let payments: unknown[] = [];
      {
        const p = await dodo(`/payments?customer_id=${encodeURIComponent(customerId)}&subscription_id=${sp}&page_size=24`);
        if (p.ok) {
          const items = (p.body?.items ?? []) as any[];
          payments = items
            .filter((x) => x.customer?.customer_id === customerId && x.subscription_id === subId)
            .map((x) => ({
              id: String(x.payment_id ?? ""),
              created_at: x.created_at ?? null,
              amount: typeof x.total_amount === "number" ? x.total_amount : null,
              currency: x.currency ?? null,
              status: x.status ?? null,
            }))
            .filter((x) => x.id);
        }
      }
      return json({
        ok: true,
        subscription: {
          status: s.status ?? null,
          amount: typeof s.recurring_pre_tax_amount === "number" ? s.recurring_pre_tax_amount : null,
          currency: s.currency ?? null,
          interval: s.payment_frequency_interval ?? null,
          interval_count: s.payment_frequency_count ?? null,
          next_billing_date: s.next_billing_date ?? null,
          cancel_at_next_billing_date: !!s.cancel_at_next_billing_date,
          cancelled_at: s.cancelled_at ?? null,
          created_at: s.created_at ?? null,
        },
        payments,
      });
    }

    // Ownership of every mutating action: the provider's subscription must belong to this user's customer.
    const current = await dodo(`/subscriptions/${sp}`);
    if (!current.ok || current.body?.customer?.customer_id !== customerId) return json({ ok: false, error: "not_found" }, 404);
    const curStatus = String(current.body?.status ?? "").toLowerCase();

    if (action === "cancel" || action === "reactivate") {
      if (!["active", "on_hold"].includes(curStatus)) return json({ ok: false, error: "not_allowed_in_status" });
      const r = await dodo(`/subscriptions/${sp}`, {
        method: "PATCH",
        body: JSON.stringify({ cancel_at_next_billing_date: action === "cancel" }),
      });
      if (!r.ok) { console.error("dodo-billing patch", r.status); return json({ ok: false, error: "action_failed" }); }
      return json({ ok: true, cancel_at_next_billing_date: !!r.body?.cancel_at_next_billing_date });
    }

    if (action === "update_payment_method") {
      if (!["active", "on_hold"].includes(curStatus)) return json({ ok: false, error: "not_allowed_in_status" });
      const origin = req.headers.get("origin");
      const returnUrl = origin && /^https:\/\/(www\.)?tradenovaos\.com$|^https:\/\/[a-z0-9-]+\.lovable\.app$|^http:\/\/localhost:\d+$/.test(origin)
        ? `${origin}/billing` : "https://tradenovaos.com/billing";
      const r = await dodo(`/subscriptions/${sp}/update-payment-method`, {
        method: "POST",
        body: JSON.stringify({ type: "new", return_url: returnUrl }),
      });
      const url = r.body?.payment_link ?? r.body?.url;
      if (!r.ok || typeof url !== "string") { console.error("dodo-billing pm", r.status); return json({ ok: false, error: "action_failed" }); }
      return json({ ok: true, url });
    }

    // invoice: verify the payment belongs to this user's customer before streaming the PDF.
    const paymentId = typeof body?.payment_id === "string" ? body.payment_id : "";
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(paymentId)) return json({ error: "invalid_payment" }, 400);
    const pay = await dodo(`/payments/${encodeURIComponent(paymentId)}`);
    if (!pay.ok || pay.body?.customer?.customer_id !== customerId || pay.body?.status !== "succeeded") return json({ ok: false, error: "not_found" }, 404);
    const pdf = await fetch(`${dodoApiBase()}/invoices/payments/${encodeURIComponent(paymentId)}`, { headers: dodoAuthHeaders() });
    if (!pdf.ok) return json({ ok: false, error: "invoice_unavailable" }, 404);
    return new Response(pdf.body, { headers: { ...cors, "Content-Type": "application/octet-stream" } });
  } catch (e) {
    console.error("dodo-billing error", e instanceof Error ? e.message : "unknown");
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
