// Dashboard Psychology Score — reuses the same source as the Trading Calendar "Psych" view:
// trades.discipline_score (1–10) averaged per day ×10 → 0–100. Avg Mood from journal_entries.confidence_level.
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

const status = (s: number) => (s >= 80 ? "Excellent" : s >= 60 ? "Moderate" : "Challenging");

interface Props { onNavigate: (id: string) => void }

export default function PsychologyScoreCard({ onNavigate }: Props) {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount() as any;
  const [period, setPeriod] = useState<Period>("week");
  const [trades, setTrades] = useState<{ trade_date: string; discipline_score: number }[]>([]);
  const [journal, setJournal] = useState<{ entry_date: string; confidence_level: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("trades").select("trade_date, discipline_score").eq("user_id", user.id).not("discipline_score", "is", null);
    if (activeAccountId) q = q.eq("trading_account_id", activeAccountId);
    const [{ data: t }, { data: j }] = await Promise.all([
      q,
      supabase.from("journal_entries").select("entry_date, confidence_level").eq("user_id", user.id),
    ]);
    setTrades((t ?? []) as any);
    setJournal((j ?? []) as any);
    setLoading(false);
  }, [user, activeAccountId]);

  useEffect(() => { load(); }, [load, version]);
  useEffect(() => {
    const f = () => load();
    window.addEventListener("focus", f);
    window.addEventListener("trades:changed", f);
    return () => { window.removeEventListener("focus", f); window.removeEventListener("trades:changed", f); };
  }, [load]);

  const days = useMemo(() => {
    const m: Record<string, { sum: number; n: number }> = {};
    trades.forEach((t) => { (m[t.trade_date] ??= { sum: 0, n: 0 }); m[t.trade_date].sum += Number(t.discipline_score); m[t.trade_date].n++; });
    return Object.entries(m).map(([date, v]) => ({ date, score: Math.round((v.sum / v.n) * 10) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [trades]);

  const inRange = (d: string, r: [string, string] | null) => !r || (d >= r[0] && d <= r[1]);

  const stats = useMemo(() => {
    const r = rangeFor(period), prevR = period === "all" ? null : rangeFor(period, 1);
    const cur = days.filter((d) => inRange(d.date, r));
    if (!cur.length) return null;
    const avg = Math.round(cur.reduce((s, d) => s + d.score, 0) / cur.length);
    const prev = prevR ? days.filter((d) => inRange(d.date, prevR)) : [];
    const prevAvg = prev.length ? Math.round(prev.reduce((s, d) => s + d.score, 0) / prev.length) : null;
    const moods = journal.filter((j) => j.confidence_level != null && inRange(j.entry_date, r));
    const avgMood = moods.length ? Math.round(moods.reduce((s, j) => s + Number(j.confidence_level), 0) / moods.length) : null;
    return {
      avg, delta: prevAvg == null ? null : avg - prevAvg,
      high: Math.max(...cur.map((d) => d.score)), low: Math.min(...cur.map((d) => d.score)),
      entries: cur.length,
      excellent: cur.filter((d) => d.score >= 80).length,
      moderate: cur.filter((d) => d.score >= 60 && d.score < 80).length,
      challenging: cur.filter((d) => d.score < 60).length,
      avgMood, recent: cur.slice(0, 4),
    };
  }, [days, journal, period]);

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
          <p className="text-xs text-muted-foreground">Complete a journal entry to start tracking your psychology.</p>
          <Button size="sm" className="mt-2" onClick={() => onNavigate("journal")}>Add Journal Entry</Button>
        </div>
      ) : (
        <div key={period} className="content-crossfade mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-end gap-4 rounded-lg border border-primary/30 bg-background/60 px-4 py-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Average Score</p>
                <p className="font-mono text-4xl font-bold text-foreground">{stats.avg}</p>
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
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate("journal")}>View Journal Entries</Button>
          </div>
        </div>
      )}
    </section>
  );
}
