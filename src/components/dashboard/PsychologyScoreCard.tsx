// Dashboard Psychology Score — reuses the same source as the Trading Calendar "Psych" view:
// real per-trade 1–10 ratings (discipline, execution, confidence, inverse stress) averaged per day → 0–100.
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveAccount } from "@/contexts/ActiveAccountContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "all";
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" }, { id: "week", label: "Week" },
  { id: "month", label: "Month" }, { id: "all", label: "All Time" },
];

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function rangeFor(p: Period, offset = 0): [string, string] | null {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (p === "all") return null;
  if (p === "today") { const d = new Date(now); d.setDate(d.getDate() - offset); return [key(d), key(d)]; }
  if (p === "week") {
    const s = new Date(now); s.setDate(s.getDate() - ((s.getDay() + 6) % 7) - offset * 7);
    const e = new Date(s); e.setDate(e.getDate() + 6); return [key(s), key(e)];
  }
  const s = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const e = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
  return [key(s), key(e)];
}

type PsyTrade = { trade_date: string; discipline_score: number | null; execution_score: number | null; confidence_score: number | null; stress_score: number | null;
  followed_plan: boolean | null; impulsive_entry: boolean | null; emotion_before: string | null; emotion_after: string | null };
// Per-trade score (0–100) from the real 1–10 ratings only; stress counts inversely. Null when nothing was rated.
function tradeScore(t: PsyTrade) {
  const v = [t.discipline_score, t.execution_score, t.confidence_score, t.stress_score == null ? null : 11 - t.stress_score].filter((x): x is number => x != null);
  return v.length ? (v.reduce((a, b) => a + Number(b), 0) / v.length) * 10 : null;
}
const avgOf = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? (v.reduce((a, b) => a + Number(b), 0) / v.length).toFixed(1) : null; };
const pctOf = (xs: (boolean | null)[]) => { const v = xs.filter((x) => x != null); return v.length ? Math.round(v.filter(Boolean).length / v.length * 100) : null; };
function topEmotions(ts: PsyTrade[]) { const m: Record<string, number> = {}; ts.forEach((t) => [t.emotion_before, t.emotion_after].forEach((e) => { if (e) m[e] = (m[e] ?? 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3); }

const status = (s: number) => (s >= 80 ? "Excellent" : s >= 60 ? "Moderate" : "Challenging");

interface Props { onNavigate: (id: string) => void }

export default function PsychologyScoreCard({ onNavigate }: Props) {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const [period, setPeriod] = useState<Period>("week");
  const [trades, setTrades] = useState<PsyTrade[]>([]);
  const [journal, setJournal] = useState<{ entry_date: string; confidence_level: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("trades").select("trade_date, discipline_score, execution_score, confidence_score, stress_score, followed_plan, impulsive_entry, emotion_before, emotion_after")
      .eq("user_id", user.id).or("discipline_score.not.is.null,execution_score.not.is.null,confidence_score.not.is.null,stress_score.not.is.null,followed_plan.not.is.null,impulsive_entry.not.is.null,emotion_before.not.is.null,emotion_after.not.is.null");
    if (activeAccountId) q = q.eq("trading_account_id", activeAccountId);
    const [{ data: t }, { data: j }] = await Promise.all([
      q,
      supabase.from("journal_entries").select("entry_date, confidence_level").eq("user_id", user.id),
    ]);
    setTrades((t ?? []));
    setJournal((j ?? []));
    setLoading(false);
  }, [user, activeAccountId]);

  useEffect(() => { load(); }, [load, version]);
  useEffect(() => {
    const f = () => load();
    window.addEventListener("focus", f);
    window.addEventListener("tradenova:trades-changed", f);
    return () => { window.removeEventListener("focus", f); window.removeEventListener("tradenova:trades-changed", f); };
  }, [load]);

  const days = useMemo(() => {
    const m: Record<string, { sum: number; n: number }> = {};
    trades.forEach((t) => { const sc = tradeScore(t); if (sc == null) return; (m[t.trade_date] ??= { sum: 0, n: 0 }); m[t.trade_date].sum += sc; m[t.trade_date].n++; });
    return Object.entries(m).map(([date, v]) => ({ date, score: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [trades]);

  const inRange = (d: string, r: [string, string] | null) => !r || (d >= r[0] && d <= r[1]);

  const stats = useMemo(() => {
    const r = rangeFor(period), prevR = period === "all" ? null : rangeFor(period, 1);
    const cur = days.filter((d) => inRange(d.date, r));
    const ct = trades.filter((t) => inRange(t.trade_date, r));
    if (!cur.length && !ct.length) return null;
    const avg = cur.length ? Math.round(cur.reduce((s, d) => s + d.score, 0) / cur.length) : null;
    const prev = prevR ? days.filter((d) => inRange(d.date, prevR)) : [];
    const prevAvg = prev.length ? Math.round(prev.reduce((s, d) => s + d.score, 0) / prev.length) : null;
    const moods = (activeAccountId ? [] : journal).filter((j) => j.confidence_level != null && inRange(j.entry_date, r));
    const avgMood = moods.length ? Math.round(moods.reduce((s, j) => s + Number(j.confidence_level), 0) / moods.length) : null;
    return {
      avg, delta: prevAvg == null || avg == null ? null : avg - prevAvg,
      high: cur.length ? Math.max(...cur.map((d) => d.score)) : "—", low: cur.length ? Math.min(...cur.map((d) => d.score)) : "—",
      entries: cur.length,
      excellent: cur.filter((d) => d.score >= 80).length,
      moderate: cur.filter((d) => d.score >= 60 && d.score < 80).length,
      challenging: cur.filter((d) => d.score < 60).length,
      avgMood, recent: cur.slice(0, 4),
      disc: avgOf(ct.map((t) => t.discipline_score)), conf: avgOf(ct.map((t) => t.confidence_score)), stress: avgOf(ct.map((t) => t.stress_score)),
      plan: pctOf(ct.map((t) => t.followed_plan)), impulsive: pctOf(ct.map((t) => t.impulsive_entry)),
      emotions: topEmotions(ct),
    };
  }, [days, journal, period, activeAccountId]);

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <section className="rounded-xl border border-border bg-card p-5 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Psychology Score</h2>
        <div className="flex rounded-lg border border-border bg-background p-0.5">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={cn("rounded-md px-2.5 py-1 text-xs transition-colors duration-300",
                period === p.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted/30" />
      ) : !stats ? (
        <div key={period} className="content-crossfade mt-6 flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-foreground">No psychology data yet</p>
          <p className="text-xs text-muted-foreground">Rate discipline, confidence or stress in the Psychology section when you log a trade.</p>
          <Button size="sm" className="mt-2" onClick={() => onNavigate("journal")}>Add Journal Entry</Button>
        </div>
      ) : (
        <div key={period} className="content-crossfade mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-end gap-4 rounded-lg border border-primary/30 bg-background/60 px-4 py-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Average Score</p>
                <p className="font-mono text-4xl font-bold text-foreground">{stats.avg ?? "—"}</p>
              </div>
              {stats.delta != null && (
                <p className={cn("pb-1.5 text-xs", stats.delta > 0 ? "text-primary" : "text-muted-foreground")}>
                  {stats.delta > 0 ? `↑ +${stats.delta}` : stats.delta < 0 ? `↓ ${stats.delta}` : "— No change"} vs previous period
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {[
                ["Highest", stats.high], ["Lowest", stats.low], ["Entries", stats.entries],
                ...(stats.disc != null ? [["Avg Discipline", `${stats.disc}/10`]] : []),
                ...(stats.conf != null ? [["Avg Confidence", `${stats.conf}/10`]] : []),
                ...(stats.stress != null ? [["Avg Stress", `${stats.stress}/10`]] : []),
                ...(stats.plan != null ? [["Followed Plan", `${stats.plan}%`]] : []),
                ...(stats.impulsive != null ? [["Impulsive", `${stats.impulsive}%`]] : []),
                ...(stats.avgMood != null ? [["Avg Mood", `${stats.avgMood}/10`]] : []),
                ["Excellent", stats.excellent], ["Moderate", stats.moderate], ["Challenging", stats.challenging],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{l}{["Excellent", "Moderate", "Challenging"].includes(l as string) ? " Days" : ""}</p>
                  <p className="font-mono text-sm font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent Scores</p>
            <div className="flex-1 divide-y divide-border rounded-lg border border-border">
              {stats.recent.map((d) => (
                <div key={d.date} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{fmt(d.date)}</span>
                  <span className="font-mono font-semibold text-foreground">{d.score}</span>
                  <span className={cn("w-20 text-right", d.score >= 80 ? "text-primary" : "text-muted-foreground")}>{status(d.score)}</span>
                </div>
              ))}
            </div>
            {stats.emotions.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Common emotions: <span className="text-foreground">{stats.emotions.map(([e, n]) => `${e} (${n})`).join(", ")}</span></p>}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate("journal")}>View Journal Entries</Button>
          </div>
        </div>
      )}
    </section>
  );
}
