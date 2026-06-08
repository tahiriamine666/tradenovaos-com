// src/components/CommandCenter.tsx
// Clean, professional trader dashboard. Light/dark via semantic tokens.
// No glassmorphism, no decorative icons, no fake data.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Plus, Upload, AlertCircle } from "lucide-react";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer,
  XAxis, YAxis, Tooltip,
} from "recharts";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  id: string;
  pair: string;
  side: string | null;
  result: number;
  outcome: string | null;
  trade_date: string;
  setup: string | null;
  rr: number | null;
}

interface TradePlan {
  plan_date: string;
  market_bias: string | null;
  session: string | null;
  setups_to_trade: string[] | string | null;
  max_risk_per_trade: number | null;
  max_daily_loss: number | null;
}

type Period = "1W" | "1M" | "3M" | "All";

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtMoney(v: number, sign = true) {
  const s = sign ? (v >= 0 ? "+" : "") : "";
  return `${s}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function periodCutoff(p: Period): Date | null {
  if (p === "All") return null;
  const d = new Date();
  if (p === "1W") d.setDate(d.getDate() - 7);
  if (p === "1M") d.setMonth(d.getMonth() - 1);
  if (p === "3M") d.setMonth(d.getMonth() - 3);
  return d;
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold tabular-nums ${v >= 0 ? "text-success" : "text-danger"}`}>
        {fmtMoney(v)}
      </p>
    </div>
  );
}

// ─── Equity Curve ────────────────────────────────────────────────────────────
function EquityCurve({ trades, loading }: { trades: Trade[]; loading: boolean }) {
  const [period, setPeriod] = useState<Period>("1M");

  const data = useMemo(() => {
    const cutoff = periodCutoff(period);
    const filtered = cutoff
      ? trades.filter(t => new Date(t.trade_date) >= cutoff)
      : trades;
    const asc = [...filtered].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let cum = 0;
    return asc.map(t => {
      cum += t.result ?? 0;
      return { day: fmtDate(t.trade_date), value: Number(cum.toFixed(2)) };
    });
  }, [trades, period]);

  const last = data[data.length - 1]?.value ?? 0;
  const isPositive = last >= 0;
  const stroke = isPositive ? "hsl(var(--success))" : "hsl(var(--danger))";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Equity Curve</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cumulative P&L over time</p>
        </div>
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          {(["1W", "1M", "3M", "All"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-52 w-full rounded-lg" />
      ) : data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">
          No trades in this period.
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} width={50} tickFormatter={fmtShort} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2}
                fill="url(#eqGrad)" dot={false} activeDot={{ r: 4, fill: stroke, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Today Focus ─────────────────────────────────────────────────────────────
function TodayFocus({ plan, onNavigate }: { plan: TradePlan | null; onNavigate: (id: string) => void }) {
  const rows = [
    { label: "Market Bias", value: plan?.market_bias || "—" },
    { label: "Session",     value: plan?.session || "—" },
    {
      label: "Main Setup",
      value: Array.isArray(plan?.setups_to_trade)
        ? plan!.setups_to_trade[0] || "—"
        : (plan?.setups_to_trade as string) || "—",
    },
    {
      label: "Risk Today",
      value: plan?.max_risk_per_trade != null ? `${plan.max_risk_per_trade}%` : "—",
    },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Today Focus</h3>
          <p className="text-xs text-muted-foreground mt-0.5">From your trade plan</p>
        </div>
        <button onClick={() => onNavigate("plan")}
          className="text-xs font-medium text-primary hover:underline">
          {plan ? "Edit" : "Set plan"}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(r => (
          <div key={r.label} className="rounded-lg border border-border bg-background p-3">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{r.label}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground truncate">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Trader Score ────────────────────────────────────────────────────────────
function TraderScoreCard({ trades }: { trades: Trade[] }) {
  const score = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter(t => t.result > 0);
    const wr = (wins.length / trades.length) * 100;

    // Discipline = % of trades with both outcome label and setup tagged.
    const tagged = trades.filter(t => t.outcome && t.setup).length;
    const discipline = Math.round((tagged / trades.length) * 100);

    // Execution = win rate weighted by avg R:R (clamped).
    const rrs = trades.map(t => t.rr ?? 0).filter(r => r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;
    const execution = Math.min(100, Math.round(wr * 0.6 + Math.min(avgRR, 3) * 13));

    // Consistency = inverse of coefficient of variation on results.
    const results = trades.map(t => t.result);
    const mean = results.reduce((s, v) => s + v, 0) / results.length;
    const stddev = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / results.length);
    const cv = mean !== 0 ? Math.abs(stddev / mean) : 1.5;
    const consistency = Math.min(100, Math.max(15, Math.round(100 - cv * 22)));

    const overall = Math.round((discipline + execution + consistency) / 3);
    return { discipline, execution, consistency, overall };
  }, [trades]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Trader Score</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Based on your trade log</p>
        </div>
        {score && (
          <div className="text-right tabular-nums">
            <span className="font-heading text-3xl font-semibold text-primary">{score.overall}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        )}
      </div>
      {!score ? (
        <p className="text-xs text-muted-foreground py-4">Log trades to calculate your score.</p>
      ) : (
        <div className="space-y-3">
          {[
            { label: "Discipline",  value: score.discipline },
            { label: "Execution",   value: score.execution },
            { label: "Consistency", value: score.consistency },
          ].map(row => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground tabular-nums">{row.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${row.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Heatmap ────────────────────────────────────────────────────────
function CalendarHeatmap({ map }: { map: Record<string, { pnl: number; trades: number }> }) {
  const [cur, setCur] = useState(new Date());
  const year = cur.getFullYear();
  const month = cur.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const label = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
  const totalCells = Math.ceil((firstDow + days) / 7) * 7;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Trading Calendar</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Daily P&L heatmap</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCur(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium text-foreground min-w-[100px] text-center">{label}</span>
          <button onClick={() => setCur(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstDow + 1;
          const inMonth = day >= 1 && day <= days;
          const dateStr = inMonth
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          const entry = dateStr ? map[dateStr] : undefined;
          const isToday = dateStr === today;
          const pos = (entry?.pnl ?? 0) > 0;
          const neg = (entry?.pnl ?? 0) < 0;

          return (
            <div
              key={i}
              title={entry ? `${dateStr} · ${entry.trades} trade${entry.trades > 1 ? "s" : ""} · ${fmtMoney(entry.pnl)}` : dateStr}
              className={`rounded-md aspect-square flex flex-col items-center justify-center text-[10px] transition-colors ${
                !inMonth
                  ? "opacity-0 pointer-events-none"
                  : entry && pos
                  ? "bg-success/15 border border-success/30 text-success"
                  : entry && neg
                  ? "bg-danger/15 border border-danger/30 text-danger"
                  : isToday
                  ? "border border-primary/40 text-primary"
                  : "bg-background border border-border text-muted-foreground"
              }`}
            >
              {inMonth && (
                <>
                  <span className="font-medium leading-none">{day}</span>
                  {entry && (
                    <span className="text-[9px] font-semibold leading-none mt-0.5 tabular-nums">
                      {pos ? "+" : ""}{Math.round(entry.pnl)}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/40" /> Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-danger/30 border border-danger/40" /> Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-background border border-border" /> No trades
        </span>
      </div>
    </div>
  );
}

// ─── Recent Trades Table ─────────────────────────────────────────────────────
function RecentTrades({ trades, onNavigate }: { trades: Trade[]; onNavigate: (id: string) => void }) {
  const rows = trades.slice(0, 6);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Recent Trades</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 6 executions</p>
        </div>
        <button onClick={() => onNavigate("trades")}
          className="text-xs font-medium text-primary hover:underline">
          View all
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-medium pb-2">Pair</th>
                <th className="text-left font-medium pb-2">Result</th>
                <th className="text-right font-medium pb-2">P&L</th>
                <th className="text-right font-medium pb-2">R:R</th>
                <th className="text-right font-medium pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => {
                const pos = (t.result ?? 0) >= 0;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{t.pair}</td>
                    <td className={`py-2.5 text-xs font-medium ${pos ? "text-success" : "text-danger"}`}>
                      {pos ? "Win" : "Loss"}
                    </td>
                    <td className={`py-2.5 text-right tabular-nums font-medium ${pos ? "text-success" : "text-danger"}`}>
                      {fmtMoney(t.result ?? 0)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {t.rr != null ? `1:${t.rr.toFixed(1)}` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">
                      {fmtDate(t.trade_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Best Setups ─────────────────────────────────────────────────────────────
function BestSetups({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const m: Record<string, { trades: number; wins: number; pnl: number; rrSum: number; rrCount: number }> = {};
    trades.forEach(t => {
      const k = t.setup?.trim();
      if (!k) return;
      if (!m[k]) m[k] = { trades: 0, wins: 0, pnl: 0, rrSum: 0, rrCount: 0 };
      m[k].trades++;
      if ((t.result ?? 0) > 0) m[k].wins++;
      m[k].pnl += t.result ?? 0;
      if (t.rr != null && t.rr > 0) {
        m[k].rrSum += t.rr;
        m[k].rrCount++;
      }
    });
    return Object.entries(m)
      .map(([name, v]) => ({
        name,
        trades: v.trades,
        winRate: Math.round((v.wins / v.trades) * 100),
        avgRR: v.rrCount ? v.rrSum / v.rrCount : null,
        pnl: v.pnl,
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 6);
  }, [trades]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-heading text-base font-semibold text-foreground">Best Setups</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Ranked by total P&L</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">Tag your trades with a setup to see this ranking.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-medium pb-2">Setup</th>
                <th className="text-right font-medium pb-2">Win&nbsp;%</th>
                <th className="text-right font-medium pb-2">Avg R:R</th>
                <th className="text-right font-medium pb-2">Trades</th>
                <th className="text-right font-medium pb-2">P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium text-foreground truncate max-w-[140px]">{r.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.winRate}%</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {r.avgRR != null ? `1:${r.avgRR.toFixed(1)}` : "—"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.trades}</td>
                  <td className={`py-2.5 text-right tabular-nums font-medium ${r.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {fmtMoney(r.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main CommandCenter ──────────────────────────────────────────────────────
interface Props { onNavigate: (id: string) => void; onAddTrade?: () => void; }

export default function CommandCenter({ onNavigate, onAddTrade }: Props) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [tR, pR] = await Promise.all([
      supabase.from("trades")
        .select("id,pair,side,result,outcome,trade_date,setup,rr")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false }),
      supabase.from("trade_plans")
        .select("plan_date,market_bias,session,setups_to_trade,max_risk_per_trade,max_daily_loss")
        .eq("user_id", user.id)
        .order("plan_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (tR.error) { setError("Could not load trades."); console.error(tR.error); }
    else setTrades((tR.data as Trade[]) ?? []);
    setPlan((pR.data as TradePlan | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Metrics + period comparison ──────────────────────────────────────
  const m = useMemo(() => {
    const wins = trades.filter(t => t.result > 0);
    const losses = trades.filter(t => t.result < 0);
    const totalPnl = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const winRate = trades.length ? Math.round((wins.length / trades.length) * 100) : 0;

    const rrs = trades.map(t => t.rr).filter((r): r is number => r != null && r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : null;

    // Build last-30-day sparkline (cumulative P&L by day) for each metric.
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const recent = trades.filter(t => new Date(t.trade_date) >= cutoff)
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let cum = 0;
    const pnlSpark = recent.map(t => { cum += t.result ?? 0; return cum; });

    // Calendar map
    const calMap: Record<string, { pnl: number; trades: number }> = {};
    trades.forEach(t => {
      const d = t.trade_date;
      if (!calMap[d]) calMap[d] = { pnl: 0, trades: 0 };
      calMap[d].pnl += t.result ?? 0;
      calMap[d].trades += 1;
    });

    // Previous period comparison (30d before last 30d).
    const prevCutoff = new Date(); prevCutoff.setDate(prevCutoff.getDate() - 60);
    const prev = trades.filter(t => {
      const d = new Date(t.trade_date);
      return d >= prevCutoff && d < cutoff;
    });
    const prevPnl = prev.reduce((s, t) => s + (t.result ?? 0), 0);
    const recentPnl = recent.reduce((s, t) => s + (t.result ?? 0), 0);
    const pnlDelta = recentPnl - prevPnl;

    return {
      totalPnl, winRate, avgRR,
      tradesCount: trades.length,
      wins: wins.length, losses: losses.length,
      pnlSpark, calMap, pnlDelta, recentPnlCount: recent.length, prevCount: prev.length,
    };
  }, [trades]);

  const isEmpty = !loading && trades.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={
          onAddTrade && (
            <Button onClick={onAddTrade} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> New Trade
            </Button>
          )
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      )}

      {isEmpty && !error ? (
        <EmptyState
          title="Your dashboard is ready"
          description="Log your first trade or import from a CSV to unlock P&L, equity curve, calendar, and edge analytics."
          checklist={[
            { label: "First trade logged", done: false },
            { label: "10 trades → setup analytics" },
            { label: "30 trades → AI insights" },
            { label: "50+ trades → pattern detection" },
          ]}
          actions={
            <>
              {onAddTrade && (
                <Button onClick={onAddTrade} size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Log your first trade
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onNavigate("trades")}>
                <Upload className="mr-1.5 h-4 w-4" /> Import trades
              </Button>
            </>
          }
        />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total P&L"
              value={loading ? "—" : fmtMoney(m.totalPnl)}
              hint={
                loading ? "" :
                m.prevCount > 0
                  ? `${m.pnlDelta >= 0 ? "+" : ""}${fmtMoney(m.pnlDelta, false)} vs prev 30d`
                  : "Last 30 days"
              }
              spark={m.pnlSpark}
              tone={m.totalPnl >= 0 ? "success" : "danger"}
            />
            <MetricCard
              label="Win Rate"
              value={loading ? "—" : `${m.winRate}%`}
              hint={loading ? "" : `${m.wins}W · ${m.losses}L`}
              tone={m.winRate >= 50 ? "success" : "neutral"}
            />
            <MetricCard
              label="Avg R:R"
              value={loading ? "—" : m.avgRR != null ? `1:${m.avgRR.toFixed(2)}` : "—"}
              hint={m.avgRR != null ? "From logged R:R" : "Log R:R per trade"}
              tone="primary"
            />
            <MetricCard
              label="Trades"
              value={loading ? "—" : `${m.tradesCount}`}
              hint="Total logged"
              tone="neutral"
            />
          </div>

          {/* Equity + Today Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EquityCurve trades={trades} loading={loading} />
            </div>
            <TodayFocus plan={plan} onNavigate={onNavigate} />
          </div>

          {/* Calendar + Trader Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CalendarHeatmap map={m.calMap} />
            </div>
            <TraderScoreCard trades={trades} />
          </div>

          {/* Recent Trades + Best Setups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentTrades trades={trades} onNavigate={onNavigate} />
            <BestSetups trades={trades} />
          </div>
        </>
      )}
    </div>
  );
}
