// Validate a Lemon Squeezy discount code against the configured store and a variant.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { LS_API, lsHeaders, variantFromPlan } from "../_shared/lemonsqueezy.ts";

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
    const body = await req.json().catch(() => ({} as any));
    const code = String(body?.code ?? "").trim();
    const plan = body?.plan === "elite" ? "elite" : body?.plan === "pro" ? "pro" : null;
    const billing = body?.billing === "yearly" ? "yearly" : "monthly";
    if (!code || !plan) {
      return new Response(JSON.stringify({ valid: false, error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    const storeId = Deno.env.get("LEMON_SQUEEZY_STORE_ID");
    if (!apiKey || !storeId) {
      return new Response(JSON.stringify({ valid: false, error: "not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variantId = variantFromPlan(plan, billing);

    const url = `${LS_API}/discounts?filter[store_id]=${encodeURIComponent(storeId)}`;
    const res = await fetch(url, { headers: lsHeaders(apiKey) });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("ls-validate-coupon: list failed", res.status, json);
      return new Response(JSON.stringify({ valid: false, error: "lookup_failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list: any[] = Array.isArray(json?.data) ? json.data : [];
    const match = list.find((d) => String(d?.attributes?.code ?? "").toLowerCase() === code.toLowerCase());
    if (!match) {
      return new Response(JSON.stringify({ valid: false, error: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attrs = match.attributes ?? {};
    if (attrs.status && attrs.status !== "published") {
      return new Response(JSON.stringify({ valid: false, error: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (attrs.expires_at && new Date(attrs.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ valid: false, error: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof attrs.max_redemptions === "number" && attrs.max_redemptions > 0
        && typeof attrs.uses === "number" && attrs.uses >= attrs.max_redemptions) {
      return new Response(JSON.stringify({ valid: false, error: "exhausted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the discount is limited to specific variants, ensure ours is included.
    const isLimited = attrs.is_limited_to_products === true;
    if (isLimited) {
      const variantsUrl = `${LS_API}/discounts/${match.id}/variants`;
      const vRes = await fetch(variantsUrl, { headers: lsHeaders(apiKey) });
      const vJson = await vRes.json().catch(() => null);
      const variantIds: string[] = Array.isArray(vJson?.data)
        ? vJson.data.map((v: any) => String(v?.id ?? ""))
        : [];
      if (variantIds.length > 0 && !variantIds.includes(String(variantId))) {
        return new Response(JSON.stringify({ valid: false, error: "not_applicable" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const amount = Number(attrs.amount ?? 0);
    const amountType = attrs.amount_type === "percent" ? "percent" : "fixed";
    const label = amountType === "percent" ? `${amount}% off` : `$${(amount / 100).toFixed(2)} off`;

    return new Response(JSON.stringify({
      valid: true,
      code,
      amount,
      amount_type: amountType,
      label,
      name: attrs.name ?? code,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ls-validate-coupon error", e);
    return new Response(JSON.stringify({ valid: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
