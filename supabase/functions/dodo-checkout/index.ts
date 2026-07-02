// Create a Dodo Payments hosted checkout session for the signed-in user.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { dodoApiBase, dodoAuthHeaders, productIdForPlan, type Billing, type Plan } from "../_shared/dodo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const claimEmail = (claimsData.claims as any).email as string | undefined;

    let body: {
      plan?: Plan; billing?: Billing;
      email?: string; name?: string;
      country?: string; zip?: string;
    } = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const plan = body.plan;
    if (plan !== "pro" && plan !== "elite") {
      return new Response(JSON.stringify({ error: "invalid_plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const billing: Billing = body.billing === "yearly" ? "yearly" : "monthly";

    if (!Deno.env.get("DODO_API_KEY")) {
      return new Response(JSON.stringify({ error: "dodo_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const productId = productIdForPlan(plan, billing);
    if (!productId) {
      return new Response(JSON.stringify({ error: "product_id_missing", detail: `${plan}_${billing}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const returnUrl = origin ? `${origin}/billing/success` : undefined;
    const email = (body.email && body.email.trim()) || claimEmail || undefined;

    const payload: Record<string, unknown> = {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: email ? {
        email,
        name: body.name?.trim() || undefined,
      } : undefined,
      billing_address: (body.country || body.zip) ? {
        country: body.country?.trim() || undefined,
        zipcode: body.zip?.trim() || undefined,
      } : undefined,
      return_url: returnUrl,
      metadata: { user_id: userId, plan, billing },
    };

    const res = await fetch(`${dodoApiBase()}/checkouts`, {
      method: "POST",
      headers: dodoAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("dodo-checkout: dodo error", res.status, json);
      return new Response(JSON.stringify({ error: "checkout_failed", detail: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = (json?.checkout_url ?? json?.payment_link ?? json?.url) as string | undefined;
    if (!url) {
      return new Response(JSON.stringify({ error: "no_checkout_url", detail: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url, session_id: json?.session_id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dodo-checkout error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
