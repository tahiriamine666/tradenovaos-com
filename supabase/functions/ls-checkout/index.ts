// Create a Lemon Squeezy hosted checkout URL for the signed-in user.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { LS_API, hasStoreRelationshipError, listAccessibleStoreIds, lsHeaders, resolveStoreIdForVariant, variantFromPlan } from "../_shared/lemonsqueezy.ts";

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
    const email = (claimsData.claims as any).email as string | undefined;

    let body: { plan?: "pro" | "elite" } = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const plan = body.plan;
    if (plan !== "pro" && plan !== "elite") {
      return new Response(JSON.stringify({ error: "invalid_plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    const storeId = Deno.env.get("LEMON_SQUEEZY_STORE_ID");
    if (!apiKey || !storeId) {
      return new Response(JSON.stringify({ error: "lemonsqueezy_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variantId = variantFromPlan(plan);
    const origin = req.headers.get("origin") ?? "";
    const successUrl = origin ? `${origin}/billing/success` : undefined;

    const buildPayload = (checkoutStoreId: string) => ({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: email ?? undefined,
            custom: { user_id: userId, plan },
          },
          product_options: successUrl ? { redirect_url: successUrl } : undefined,
          checkout_options: { embed: false },
        },
        relationships: {
          store: { data: { type: "stores", id: checkoutStoreId } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    });

    let checkoutStoreId = String(storeId).trim();
    const accessibleStoreIds = await listAccessibleStoreIds(apiKey);
    if (accessibleStoreIds.length > 0 && !accessibleStoreIds.includes(checkoutStoreId)) {
      console.error("ls-checkout: configured store is not accessible by the Lemon Squeezy API key");
      checkoutStoreId = accessibleStoreIds[0];
    }

    let res = await fetch(`${LS_API}/checkouts`, {
      method: "POST",
      headers: lsHeaders(apiKey),
      body: JSON.stringify(buildPayload(checkoutStoreId)),
    });
    let json = await res.json();

    if (!res.ok && res.status === 404 && hasStoreRelationshipError(json)) {
      const resolvedStoreId = await resolveStoreIdForVariant(apiKey, variantId);
      if (resolvedStoreId && resolvedStoreId !== checkoutStoreId) {
        checkoutStoreId = resolvedStoreId;
      } else if (accessibleStoreIds.length > 0 && accessibleStoreIds[0] !== checkoutStoreId) {
        checkoutStoreId = accessibleStoreIds[0];
      }

      if (checkoutStoreId !== String(storeId).trim()) {
        res = await fetch(`${LS_API}/checkouts`, {
          method: "POST",
          headers: lsHeaders(apiKey),
          body: JSON.stringify(buildPayload(checkoutStoreId)),
        });
        json = await res.json();
      }
    }

    if (!res.ok) {
      console.error("ls-checkout: lemonsqueezy error", res.status, json);
      return new Response(JSON.stringify({ error: "checkout_failed", detail: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = json?.data?.attributes?.url as string | undefined;
    if (!url) {
      return new Response(JSON.stringify({ error: "no_checkout_url" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ls-checkout error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
