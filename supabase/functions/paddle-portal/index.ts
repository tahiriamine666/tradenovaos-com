// Creates a Paddle customer portal session URL so the user can manage their subscription.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";
const PADDLE_ENV_RAW = (Deno.env.get("PADDLE_ENVIRONMENT") ?? "sandbox").toLowerCase();
const IS_PROD = PADDLE_ENV_RAW.includes("prod") || PADDLE_ENV_RAW.includes("live");
const API_BASE = IS_PROD ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (pErr || !profile?.paddle_customer_id) {
      return new Response(JSON.stringify({ error: "no_paddle_customer" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {};
    if (profile.paddle_subscription_id) {
      body.subscription_ids = [profile.paddle_subscription_id];
    }

    const res = await fetch(
      `${API_BASE}/customers/${profile.paddle_customer_id}/portal-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      console.error("paddle-portal: paddle api error", res.status, json);
      return new Response(JSON.stringify({ error: "paddle_api_error", details: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = json?.data?.urls?.general?.overview ?? json?.data?.urls?.subscriptions?.[0]?.cancel_subscription ?? null;
    if (!url) {
      return new Response(JSON.stringify({ error: "no_portal_url", details: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paddle-portal: error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
