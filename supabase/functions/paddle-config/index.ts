// Returns public Paddle client token + environment + price IDs so the
// browser can initialize Paddle.js without those values being baked in at build time.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = {
    clientToken: Deno.env.get("PADDLE_CLIENT_TOKEN") ?? "",
    environment: (Deno.env.get("PADDLE_ENVIRONMENT") ?? "sandbox").toLowerCase(),
    priceIds: {
      pro: Deno.env.get("PADDLE_PRO_PRICE_ID") ?? "",
      elite: Deno.env.get("PADDLE_ELITE_PRICE_ID") ?? "",
    },
  };

  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
