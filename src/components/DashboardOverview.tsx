// src/components/DashboardOverview.tsx
// Clean, professional trader dashboard. Light/dark via semantic tokens.
// No glassmorphism, no decorative icons, no fake data.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveAccount } from "@/contexts/ActiveAccountContext";
import { Plus, Upload, AlertCircle, Wallet, SlidersHorizontal } from "lucide-react";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { dashboardGreeting } from "@/lib/dashboard/greeting";
import { WIDGETS, type WidgetId } from "@/lib/dashboard/layout";
import DashboardLayoutEditor from "@/components/dashboard/DashboardLayoutEditor";
import PsychologyScoreCard from "@/components/dashboard/PsychologyScoreCard";

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
  pair?: string | null;
}

type Period = "1W" | "1M" | "3M" | "All";

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtMoney(v: number, sign = true) {
  const s = v < 0 ? "-" : sign ? "+" : "";
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
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold tabular-nums ${v >= 0 ? "text-success" : "text-danger"}`}>{fmtMoney(v)}</p>
    </div>
  );
}

// ─── Equity Curve ────────────────────────────────────────────────────────────
function EquityCurve({ trades, loading }: { trades: Trade[]; loading: boolean }) {
  const [period, setPeriod] = useState<Period>("1M");

  const data = useMemo(() => {
    const cutoff = periodCutoff(period);
    const filtered = cutoff ? trades.filter((t) => new Date(t.trade_date) >= cutoff) : trades;
    const asc = [...filtered].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let cum = 0;
    return asc.map((t) => {
      cum += t.result ?? 0;
      return { day: fmtDate(t.trade_date), value: Number(cum.toFixed(2)) };
    });
  }, [trades, period]);

  const last = data[data.length - 1]?.value ?? 0;
  const stroke = "hsl(var(--primary))";
  const stats = useMemo(() => {
    if (!data.length) return null;
    let peak = -Infinity,
      maxDd = 0;
    for (const d of data) {
      peak = Math.max(peak, d.value, 0);
      maxDd = Math.max(maxDd, peak - d.value);
    }
    return { peak: Math.max(peak, 0), dd: maxDd };
  }, [data]);

  return (
    <div className="tn-card-light tn-chart-light rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Equity Curve</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cumulative P&L over time</p>
          {stats && (
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 tabular-nums">
              {[
                ["Net P&L", fmtMoney(last), last >= 0],
                ["Peak", fmtMoney(stats.peak, false), false],
                ["Max Drawdown", stats.dd > 0 ? `-${fmtMoney(stats.dd, false)}` : "—", false],
              ].map(([l, v, hi]) => (
                <div key={l as string}>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{l as string}</dt>
                  <dd className={`text-sm font-semibold ${hi ? "text-primary" : "text-foreground"}`}>{v as string}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          {(["1W", "1M", "3M", "All"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                period === p
                  ? "bg-primary/15 text-primary tn-active-light"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
          No trades in this period.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border) / 0.6)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={fmtShort}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={1.5}
                fill="url(#eqGrad)"
                dot={false}
                activeDot={{ r: 4, fill: stroke, strokeWidth: 0 }}
              />
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
    { label: "Session", value: plan?.session || "—" },
    {
      label: "Main Setup",
      value: Array.isArray(plan?.setups_to_trade)
        ? plan?.setups_to_trade?.[0] || "—"
        : (plan?.setups_to_trade as string) || "—",
    },
    {
      label: "Risk Today",
      value: plan?.max_risk_per_trade != null ? `${plan.max_risk_per_trade}%` : "—",
    },
  ];
  return (
    <div className="tn-card-light tn-edge-light rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Today Focus</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan ? (
              <>
                Latest plan · <span className="text-foreground font-medium">{plan.pair || "—"}</span> ·{" "}
                {fmtDate(plan.plan_date)}
              </>
            ) : (
              "No trade plan yet"
            )}
          </p>
        </div>
        <button
          onClick={() => onNavigate("plan")}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {plan ? "Edit" : "Set plan"}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
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
    const wins = trades.filter((t) => t.result > 0);
    const wr = (wins.length / trades.length) * 100;

    // Discipline = % of trades with both outcome label and setup tagged.
    const tagged = trades.filter((t) => t.outcome && t.setup).length;
    const discipline = Math.round((tagged / trades.length) * 100);

    // Execution = win rate weighted by avg R:R (clamped).
    const rrs = trades.map((t) => t.rr ?? 0).filter((r) => r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;
    const execution = Math.min(100, Math.round(wr * 0.6 + Math.min(avgRR, 3) * 13));

    // Consistency = inverse of coefficient of variation on results.
    const results = trades.map((t) => t.result);
    const mean = results.reduce((s, v) => s + v, 0) / results.length;
    const stddev = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / results.length);
    const cv = mean !== 0 ? Math.abs(stddev / mean) : 1.5;
    const consistency = Math.min(100, Math.max(15, Math.round(100 - cv * 22)));

    const overall = Math.round((discipline + execution + consistency) / 3);
    return { discipline, execution, consistency, overall };
  }, [trades]);

  return (
    <div className="tn-card-light rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Trader Score</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Based on your trade log</p>
        </div>
        {score && (
          <div className="text-right tabular-nums">
            <span className="font-heading text-4xl font-semibold text-foreground">{score.overall}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        )}
      </div>
      {!score ? (
        <p className="text-xs text-muted-foreground py-4">Log trades to calculate your score.</p>
      ) : (
        <div className="space-y-3">
          {[
            { label: "Discipline", value: score.discipline },
            { label: "Execution", value: score.execution },
            { label: "Consistency", value: score.consistency },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground tabular-nums">{row.value}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recent Trades Table ─────────────────────────────────────────────────────
function RecentTrades({ trades, onNavigate }: { trades: Trade[]; onNavigate: (id: string) => void }) {
  const rows = trades.slice(0, 6);
  return (
    <div className="tn-card-light rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Recent Trades</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 6 executions</p>
        </div>
        <button onClick={() => onNavigate("trades")} className="text-xs font-medium text-primary hover:underline">
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
              {rows.map((t) => {
                const pos = (t.result ?? 0) >= 0;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{t.pair}</td>
                    <td className={`py-2.5 text-xs font-medium ${pos ? "text-success" : "text-danger"}`}>
                      {t.result == null ? "Unavailable" : t.result === 0 ? "Breakeven" : pos ? "Win" : "Loss"}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums font-medium ${pos ? "text-success" : "text-danger"}`}
                    >
                      {fmtMoney(t.result ?? 0)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {t.rr != null ? `1:${t.rr.toFixed(1)}` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">{fmtDate(t.trade_date)}</td>
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
    trades.forEach((t) => {
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
    <div className="tn-card-light rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30">
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
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium text-foreground truncate max-w-[140px]">{r.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.winRate}%</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {r.avgRR != null ? `1:${r.avgRR.toFixed(1)}` : "—"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.trades}</td>
                  <td
                    className={`py-2.5 text-right tabular-nums font-medium ${r.pnl >= 0 ? "text-success" : "text-danger"}`}
                  >
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

// ─── Main DashboardOverview ──────────────────────────────────────────────────────
interface Props {
  onNavigate: (id: string) => void;
  onAddTrade?: () => void;
  calendar?: React.ReactNode;
}

export default function DashboardOverview({ onNavigate, onAddTrade, calendar }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const dashboard = useDashboardLayout(user?.id);
  const [editingLayout, setEditingLayout] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => { setEditingLayout(false); }, [user?.id]);
  const { activeAccount, activeAccountId, version } = useActiveAccount();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    let tradesQuery = supabase
      .from("trades")
      .select("id,pair,side,result,outcome,trade_date,setup,rr,trading_account_id")
      .eq("user_id", user.id)
      .order("trade_date", { ascending: false });
    if (activeAccountId) {
      tradesQuery = tradesQuery.eq("trading_account_id", activeAccountId);
    }
    const [tR, pR] = await Promise.all([
      tradesQuery,
      supabase
        .from("trade_plans")
        .select("plan_date,market_bias,session,setups_to_trade,max_risk_per_trade,max_daily_loss,pair")
        .eq("user_id", user.id)
        .eq("account_key", activeAccountId ?? "all")
        .order("plan_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (tR.error) {
      setError("Could not load trades.");
      console.error(tR.error);
    } else setTrades((tR.data as Trade[]) ?? []);
    setPlan((pR.data as TradePlan | null) ?? null);
    setLoading(false);
  }, [user, activeAccountId]);

  useEffect(() => {
    load();
  }, [load, version]);

  // ── Metrics + period comparison ──────────────────────────────────────
  const m = useMemo(() => {
    const wins = trades.filter((t) => t.result > 0);
    const losses = trades.filter((t) => t.result < 0);
    const totalPnl = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const winRate = trades.length ? Math.round((wins.length / trades.length) * 100) : 0;

    const rrs = trades.map((t) => t.rr).filter((r): r is number => r != null && r > 0);
    const avgRR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : null;

    // Build last-30-day sparkline (cumulative P&L by day) for each metric.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = trades
      .filter((t) => new Date(t.trade_date) >= cutoff)
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let cum = 0;
    const pnlSpark = recent.map((t) => {
      cum += t.result ?? 0;
      return cum;
    });

    // Previous period comparison (30d before last 30d).
    const prevCutoff = new Date();
    prevCutoff.setDate(prevCutoff.getDate() - 60);
    const prev = trades.filter((t) => {
      const d = new Date(t.trade_date);
      return d >= prevCutoff && d < cutoff;
    });
    const prevPnl = prev.reduce((s, t) => s + (t.result ?? 0), 0);
    const recentPnl = recent.reduce((s, t) => s + (t.result ?? 0), 0);
    const pnlDelta = recentPnl - prevPnl;

    return {
      totalPnl,
      winRate,
      avgRR,
      tradesCount: trades.length,
      wins: wins.length,
      losses: losses.length,
      pnlSpark,
      pnlDelta,
      recentPnlCount: recent.length,
      prevCount: prev.length,
    };
  }, [trades]);

  const isEmpty = !loading && trades.length === 0;

  const platformLabel = activeAccount ? activeAccount.platform.toUpperCase().replace("_", " ") : null;
  const badgeParts = activeAccount
    ? [
        platformLabel,
        activeAccount.account_number || activeAccount.login,
        activeAccount.broker || activeAccount.server,
      ].filter(Boolean)
    : null;

  const widgets: Record<WidgetId, React.ReactNode> = {
    pnl: (<MetricCard
              label="Total P&L"
              value={loading ? "—" : fmtMoney(m.totalPnl)}
              hint={
                loading
                  ? ""
                  : m.prevCount > 0
                    ? `${m.pnlDelta >= 0 ? "+" : ""}${fmtMoney(m.pnlDelta, false)} vs prev 30d`
                    : "Last 30 days"
              }
              spark={m.pnlSpark}
              tone={m.totalPnl >= 0 ? "success" : "danger"}
            />),
    winrate: (<MetricCard
              label="Win Rate"
              value={loading ? "—" : `${m.winRate}%`}
              hint={loading ? "" : `${m.wins}W · ${m.losses}L`}
              tone={m.winRate >= 50 ? "success" : "neutral"}
            />),
    rr: (<MetricCard
              label="Avg R:R"
              value={loading ? "—" : m.avgRR != null ? `1:${m.avgRR.toFixed(2)}` : "—"}
              hint={m.avgRR != null ? "From logged R:R" : "Log R:R per trade"}
              tone="primary"
            />),
    trades: (<MetricCard label="Trades" value={loading ? "—" : `${m.tradesCount}`} hint="Total logged" tone="neutral" />),
    account: (activeAccount && (activeAccount.balance != null || activeAccount.equity != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              ["Balance", activeAccount.balance],
              ["Equity", activeAccount.equity],
              ["Free Margin", activeAccount.free_margin],
              ["Margin Used", activeAccount.margin],
            ] as [string, number | null | undefined][]
          ).map(([label, val]) => (
            <div key={label} className="tn-kpi-light tn-card-light rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-base font-semibold text-foreground">
                {val == null ? "—" : `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>
      )),
    equity: <EquityCurve trades={trades} loading={loading} />,
    today: <TodayFocus plan={plan} onNavigate={onNavigate} />,
    trader: <TraderScoreCard trades={trades} />,
    psych: <PsychologyScoreCard onNavigate={onNavigate} />,
    recent: <RecentTrades trades={trades} onNavigate={onNavigate} />,
    setups: <BestSetups trades={trades} />,
    calendar,
  };

  return (
    <div className="tn-page-light space-y-5">
      <PageHeader
        title={dashboardGreeting(profile?.id === user?.id ? profile : null, now)}
        description="Trading overview for your selected account and period."
        actions={
          <>
            <Button variant="outline" size="sm" disabled={editingLayout || dashboard.loading || dashboard.error || !user} onClick={() => setEditingLayout(true)}>
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Edit Layout
            </Button>
          {onAddTrade && (
            <Button onClick={onAddTrade} size="sm" className="tn-btn-halo">
              <Plus className="mr-1.5 h-4 w-4" /> New Trade
            </Button>
          )}
          </>
        }
      />
      {dashboard.error && <div role="alert" className="flex items-center gap-2 text-sm text-muted-foreground">
        Could not load your saved layout.
        <Button variant="ghost" size="sm" onClick={() => dashboard.reload()}>Retry</Button>
      </div>}
      {!isEmpty && dashboard.loading && <Skeleton className="h-32 w-full" />}


      <div className="flex items-center gap-2 -mt-2 flex-wrap rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</span>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          {badgeParts ? badgeParts.join(" • ") : "All Accounts"}
        </Badge>
        {activeAccount && (
          <>
            <Badge
              variant="outline"
              className={`py-1 px-2 text-[11px] ${
                activeAccount.status === "connected"
                  ? "text-primary border-primary/30 bg-primary/10"
                  : activeAccount.status === "error"
                    ? "text-danger border-danger/30 bg-danger/10"
                    : "text-muted-foreground"
              }`}
            >
              {activeAccount.status === "connecting" ? "Syncing…" : activeAccount.status}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {activeAccount.last_synced_at
                ? `Last sync ${new Date(activeAccount.last_synced_at).toLocaleTimeString()}`
                : `Showing data for ${activeAccount.account_name}`}
            </span>
          </>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Period · <span className="text-foreground">All time</span>
        </span>
      </div>



      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto underline">
            Retry
          </button>
        </div>
      )}

      {editingLayout && user ? (
        <DashboardLayoutEditor key={user.id} initial={dashboard.layout} onSave={dashboard.save} onClose={() => setEditingLayout(false)}
          widgets={{ ...widgets, account: activeAccount && (activeAccount.balance != null || activeAccount.equity != null) ? widgets.account : undefined }} />
      ) : isEmpty && !error ? (
        activeAccount ? (
          <EmptyState
            title={activeAccount.status === "error" ? "Account connection issue" : "Importing your trade history"}
            description={
              activeAccount.sync_error
                ? activeAccount.sync_error
                : activeAccount.status === "connecting"
                  ? "We are pulling closed trades from your account — this usually takes about a minute."
                  : "No closed trades found on this account yet. Trades will appear here automatically after each sync."
            }
            actions={
              <>
                {onAddTrade && (
                  <Button onClick={onAddTrade} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Log a trade manually
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => onNavigate("settings")}>
                  <Wallet className="mr-1.5 h-4 w-4" /> Manage accounts
                </Button>
              </>
            }
          />
        ) : (
          <EmptyState
            title="Your dashboard is ready"
            description="Connect a broker or prop-firm account, log a trade, or import a CSV to unlock P&L, equity curve, calendar, and edge analytics."
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
        )
      ) : (
        !dashboard.loading && <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-start">
          {dashboard.layout.order.filter(id => !dashboard.layout.hidden.includes(id)).map(id => {
            if (id === "account" && !(activeAccount && (activeAccount.balance != null || activeAccount.equity != null))) return null;
            const widget = WIDGETS.find(w => w.id === id);
            return <div key={id} data-dashboard-widget={id} className={`min-w-0 ${widget?.span ?? ""}`}>{widgets[id]}</div>;
          })}
        </div>
      )}
    </div>
  );
}
