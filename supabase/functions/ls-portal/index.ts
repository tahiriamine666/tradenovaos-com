// Return the Lemon Squeezy customer portal URL for the signed-in user.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { LS_API, lsHeaders } from "../_shared/lemonsqueezy.ts";

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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: sub } = await admin
      .from("billing_subscriptions")
      .select("subscription_id, customer_portal_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.customer_portal_url) {
      return new Response(JSON.stringify({ url: sub.customer_portal_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: fetch fresh portal URL from Lemon Squeezy.
    const apiKey = Deno.env.get("LEMON_SQUEEZY_API_KEY");
    if (!apiKey || !sub?.subscription_id) {
      return new Response(JSON.stringify({ error: "no_subscription" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${LS_API}/subscriptions/${sub.subscription_id}`, {
      headers: lsHeaders(apiKey),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("ls-portal lemonsqueezy error", res.status, json);
      return new Response(JSON.stringify({ error: "portal_unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = json?.data?.attributes?.urls?.customer_portal as string | undefined;
    if (!url) {
      return new Response(JSON.stringify({ error: "no_portal_url" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("billing_subscriptions")
      .update({ customer_portal_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ls-portal error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
