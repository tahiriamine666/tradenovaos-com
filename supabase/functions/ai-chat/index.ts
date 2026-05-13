// Lovable AI-powered chat for Nova support widget
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Nova, the TradeNova AI Assistant — a friendly, concise, and knowledgeable support agent for TradeNova, a premium trading SaaS.

TradeNova features:
- Trade Journal: Log trades with emotion, execution score, outcome
- Edge Analytics: Win rate, profit factor, expectancy, setup performance
- Mind Journal: Track psychological patterns and emotions
- Playbook Lab: Define setups, rules, checklists
- Replay Studio (Elite): Candle-by-candle session replay
- AI Insights (Pro+): AI analyzes trade patterns
- CSV Import (Pro+): Import from any broker
- Trading Calendar: P&L heatmap

Plans: Free (50 trades/mo), Pro ($29/mo), Elite ($59/mo)
Payment: Currently via Payoneer (manual), Stripe coming soon
14-day free trial on Pro and Elite

Rules:
- Be concise — max 3 short paragraphs per reply
- Use bullet points for lists
- Be warm, helpful, and professional
- For billing/account issues, offer to escalate to human support
- For bugs, ask for steps to reproduce
- Never make up features that don't exist
- If asked something outside TradeNova, redirect politely
- End responses with a follow-up question or helpful tip when appropriate`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(messages ?? []).slice(-12),
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: txt }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "Sorry, I could not generate a response.";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
