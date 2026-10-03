// NOVA — TradeNova AI trading analyst. Streams answers grounded in the caller's own data.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You are NOVA, the personal AI trading performance analyst inside TradeNova.
You analyze ONLY the logged-in trader's own data provided in the DATA block (trades, journal, trade plans, weekly outlooks, checklists, preferences).
Rules:
- Ground every claim in the DATA. Quote concrete numbers (counts, win rates, P/L, R:R) you can compute from it.
- If the data is insufficient to answer, say so plainly and suggest what to log. Never invent statistics, trades or dates.
- Phrase as "Your recorded trades indicate...", "Your plan says...", "Your journal suggests...".
- You are decision support, not a signal service: never say BUY NOW / SELL NOW, never promise profits or guaranteed setups. The trader stays responsible.
- Use markdown: short paragraphs, bullet points, bold key numbers.
- Respect the trader's preferred response style (concise = under ~150 words; detailed = thorough but structured).`;

function summarize(trades: any[]) {
  const n = trades.length;
  if (!n) return { trades: 0 };
  const wins = trades.filter(t => Number(t.result) > 0);
  const losses = trades.filter(t => Number(t.result) < 0);
  const gw = wins.reduce((s, t) => s + Number(t.result), 0);
  const gl = Math.abs(losses.reduce((s, t) => s + Number(t.result), 0));
  const rr = trades.filter(t => t.rr != null);
  return {
    trades: n, wins: wins.length, losses: losses.length,
    win_rate_pct: +(wins.length / n * 100).toFixed(1),
    net_pnl: +(gw - gl).toFixed(2),
    profit_factor: gl ? +(gw / gl).toFixed(2) : null,
    avg_rr: rr.length ? +(rr.reduce((s, t) => s + Number(t.rr), 0) / rr.length).toFixed(2) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await sb.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub;
  if (cErr || !uid) return json({ error: "Unauthorized" }, 401);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const body = await req.json().catch(() => ({}));
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-20).map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!history.length) return json({ error: "No message" }, 400);

  // Server-side NOVA credit metering (1 credit per message, per billing period).
  const { data: credit, error: crErr } = await sb.rpc("consume_nova_credit");
  if (crErr) return json({ error: "Could not verify NOVA credits." }, 500);
  if (!(credit as any)?.allowed) {
    return json({ error: "You've used your NOVA credits for this billing period.", code: "nova_credits_exhausted", usage: credit }, 402);
  }

  // All reads go through the caller's JWT, so RLS scopes them to this user.
  const [tr, jr, pl, wk, cm, pf, ac, pr] = await Promise.all([
    sb.from("trades").select("trade_date,pair,side,result,rr,outcome,setup,session,timeframe,emotion,mistakes,discipline_score,execution_score,weekly_context,daily_bias,notes,tags,account_type").eq("user_id", uid).order("trade_date", { ascending: false }).limit(150),
    sb.from("journal_entries").select("entry_date,mood,mistakes,lesson,bias,notes,energy_level,confidence_level,rule_adherence,stress_label,what_went_well,mistakes_list,emotional_trigger,summary,session").eq("user_id", uid).order("entry_date", { ascending: false }).limit(40),
    sb.from("trade_plans").select("plan_date,market_bias,notes,psych_notes,emotion,max_risk_per_trade,max_daily_loss,max_trades,ai_analysis").eq("user_id", uid).order("plan_date", { ascending: false }).limit(20),
    sb.from("trade_plan_checklists").select("checklist_type,period_date,data,status").eq("user_id", uid).order("period_date", { ascending: false }).limit(12),
    sb.from("checklist_models").select("name,items").eq("user_id", uid).limit(10),
    sb.from("nova_preferences").select("trading_style,main_session,markets,custom_notes,response_style").eq("user_id", uid).maybeSingle(),
    sb.from("trading_accounts").select("account_name,platform,broker,firm,account_type,currency,balance,equity,status,last_synced_at").eq("user_id", uid).limit(10),
    sb.from("profiles").select("display_name,full_name").eq("id", uid).maybeSingle(),
  ]);
  const trades = tr.data || [];
  const plans = (pl.data || []).map((p: any) => ({ ...p, ai_analysis: p.ai_analysis?.daily_v2 ?? p.ai_analysis?.framework ?? null }));
  const data = {
    today: new Date().toISOString().slice(0, 10),
    trader: pr.data?.display_name || pr.data?.full_name || null,
    preferences: pf.data || null,
    stats_all_loaded_trades: summarize(trades),
    accounts: ac.data || [],
    trades, journal: jr.data || [], trade_plans: plans,
    weekly_outlooks_and_checklists: wk.data || [], checklist_models: cm.data || [],
  };
  const dataStr = JSON.stringify(data).slice(0, 120000);

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: req.signal,
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true, store: false,
      reasoning: { effort: "low" },
      instructions: `${SYSTEM}\n\nDATA (JSON, newest first):\n${dataStr}`,
      input: history.map((m: any) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => "");
    console.error("[nova-chat] gateway", upstream.status, raw.slice(0, 400));
    let msg = "NOVA is unavailable right now.";
    if (upstream.status === 429) msg = "NOVA is busy. Please try again in a moment.";
    if (upstream.status === 402) msg = "AI credits are exhausted for this workspace.";
    try { const j = JSON.parse(raw); if (j?.message || j?.error?.message) msg = j.message || j.error.message; } catch { /* keep */ }
    return json({ error: msg }, upstream.status);
  }

  const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
  const enc = new TextEncoder(); const dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = upstream.body!.getReader(); let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const p = line.slice(5).trim(); if (!p || p === "[DONE]") continue;
            try { const ev = JSON.parse(p); if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta)); } catch { /* partial */ }
          }
        }
      } catch (e) { console.error("[nova-chat] stream", e); }
      ctrl.close();
    },
  });
  const h: Record<string, string> = { ...cors, "Content-Type": "text/plain; charset=utf-8" };
  if (runId) h["X-Lovable-AIG-Run-ID"] = runId;
  return new Response(stream, { headers: h });
});
