// Nova — TradeNova AI support chat (Lovable AI Gateway)
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
- Learning Hub: Lessons across Fundamentals, SMC, ICT, Price Action, Psychology, Prop Firm

Plans: Free (50 trades/mo), Pro ($29/mo), Elite ($59/mo)
Payment: Currently via Payoneer (manual), Stripe coming soon
14-day free trial on Pro and Elite

Rules:
- Be concise — max 3 short paragraphs per reply
- Use bullet points for lists
- Be warm, helpful, and professional
- For billing/account issues, offer to escalate to human support
- For bugs, ask for steps to reproduce
- Never invent features
- If asked something outside TradeNova, redirect politely
- End with a follow-up question or helpful tip when appropriate`;

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", fallback: true }, 200);

  const t0 = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMsg[] = Array.isArray(body?.messages) ? body.messages : [];
    console.log("[ai-chat] request received", { msgs: messages.length });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("[ai-chat] LOVABLE_API_KEY missing");
      return json({
        error: "AI key not configured",
        code: "missing_key",
        fallback: true,
      });
    }

    // Sanitise + cap history (keep last 12 turns)
    const safeMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const payload = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages],
    };

    console.log("[ai-chat] calling gateway", { model: payload.model, turns: safeMessages.length });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const ms = Date.now() - t0;
    console.log("[ai-chat] gateway responded", { status: res.status, ms });

    if (!res.ok) {
      const raw = await res.text();
      console.error("[ai-chat] gateway error", { status: res.status, body: raw.slice(0, 500) });

      if (res.status === 402) {
        return json({
          error: "AI credits exhausted. Please add credits in Workspace → Plans & credits.",
          code: "no_credits",
          fallback: true,
        });
      }
      if (res.status === 429) {
        return json({
          error: "AI rate limit hit. Please retry in a few seconds.",
          code: "rate_limited",
          fallback: true,
        });
      }
      return json({
        error: `AI gateway error (${res.status})`,
        code: "gateway_error",
        fallback: true,
      });
    }

    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text || !text.trim()) {
      console.error("[ai-chat] empty completion", data);
      return json({ error: "Empty AI response", code: "empty_response", fallback: true });
    }

    console.log("[ai-chat] success", { chars: text.length, ms: Date.now() - t0 });
    return json({ text });
  } catch (e) {
    console.error("[ai-chat] unexpected error", e);
    return json({
      error: e instanceof Error ? e.message : "Unknown error",
      code: "internal_error",
      fallback: true,
    });
  }
});
