// src/components/CommandCenter.tsx
// Premium dashboard — glassmorphism, animations, real Supabase data
// Replaces the static Command Center section in Index.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Target, LineChart, BarChart3,
  ArrowRight, Plus, ChevronLeft, ChevronRight, Zap,
  CheckCircle2, AlertCircle, Calendar, Activity, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts';

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
  account_type?: string | null;
}

interface DashboardMetrics {
  totalPnl:    number;
  winRate:     number;
  tradesCount: number;
  avgRR:       number | null;
  wins:        number;
  losses:      number;
  equityData:  { day: string; value: number }[];
  setupData:   { name: string; value: number }[];
  recentTrades: Trade[];
  calendarMap: Record<string, { pnl: number; trades: number }>;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtMoney(v: number, showSign = true) {
  const sign = showSign ? (v >= 0 ? '+' : '') : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1.2) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return display;
}

// ─── Stagger variants ─────────────────────────────────────────────────────────
const cardVariants: any = {
  hidden:   { opacity: 0, y: 20 },
  visible:  (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Glassmorphism card ───────────────────────────────────────────────────────
function GlassCard({
  children, className = '', glow = false, index = 0,
}: {
  children: React.ReactNode; className?: string; glow?: boolean; index?: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`
        relative rounded-2xl border border-white/[0.08] bg-white/[0.03]
        backdrop-blur-sm overflow-hidden
        transition-shadow duration-300
        hover:border-white/[0.15] hover:bg-white/[0.05]
        ${glow ? 'shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      )}
      {children}
    </motion.div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({
  title, value, sub, icon: Icon, color, index, loading,
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; color: string; index: number; loading: boolean;
}) {
  return (
    <GlassCard index={index} glow={index === 0} className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
          )}
          {loading ? (
            <div className="h-3 w-20 bg-white/5 rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-[11px] text-white/30 mt-1.5">{sub}</p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${color.includes('red') ? 'bg-red-500/10' : color.includes('blue') ? 'bg-blue-500/10' : color.includes('amber') ? 'bg-amber-500/10' : 'bg-violet-500/10'}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d1a]/90 backdrop-blur-md px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      <p className={`text-sm font-bold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmtMoney(val)}
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAddTrade }: { onAddTrade: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <BarChart3 className="h-9 w-9 text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-[#080812] flex items-center justify-center">
          <Plus className="h-3 w-3 text-white" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Your dashboard is ready</h3>
      <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
        Add your first trade and watch your P&L, win rate, equity curve, and edge analytics come to life.
      </p>
      <motion.button
        onClick={onAddTrade}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
      >
        Add your first trade
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
}

// ─── Equity Curve ─────────────────────────────────────────────────────────────
function EquityCurve({ data, loading }: { data: { day: string; value: number }[]; loading: boolean }) {
  const isPositive = (data[data.length - 1]?.value ?? 0) >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';

  return (
    <GlassCard index={4} className="p-5 col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Equity Curve</p>
          <p className="text-[11px] text-white/30 mt-0.5">Cumulative P&L over time</p>
        </div>
        {data.length > 0 && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {fmtMoney(data[data.length - 1]?.value ?? 0)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-52 bg-white/[0.02] rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-52 flex flex-col items-center justify-center">
          <LineChart className="h-8 w-8 text-white/10 mb-2" />
          <p className="text-xs text-white/20">Equity curve appears after first trade</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} width={48}
                tickFormatter={v => `$${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                fill="url(#eqGrad)" dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </GlassCard>
  );
}

// ─── Trader Score ─────────────────────────────────────────────────────────────
function TraderScoreCard({ trades, loading }: { trades: Trade[]; loading: boolean }) {
  const scores = useMemo(() => {
    if (!trades.length) return null;
    const wins   = trades.filter(t => t.result > 0).length;
    const losses = trades.filter(t => t.result < 0).length;
    const wr     = Math.round((wins / trades.length) * 100);
    const avgWin  = wins  > 0 ? trades.filter(t => t.result > 0).reduce((s, t) => s + t.result, 0) / wins  : 0;
    const avgLoss = losses > 0 ? Math.abs(trades.filter(t => t.result < 0).reduce((s, t) => s + t.result, 0) / losses) : 1;
    const impliedRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    const results = trades.map(t => t.result);
    const mean = results.reduce((s, v) => s + v, 0) / results.length;
    const stddev = Math.sqrt(results.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / results.length);
    const cv = mean !== 0 ? Math.abs(stddev / mean) : 1;
    const consistency = Math.min(100, Math.max(10, Math.round(100 - cv * 25)));

    const items = [
      { label: 'Win %',       value: Math.min(100, Math.round(wr * 1.3)) },
      { label: 'R:R',         value: Math.min(100, Math.round(impliedRR * 30)) },
      { label: 'Discipline',  value: Math.min(100, trades.filter(t => t.outcome).length > 0 ? 70 : 50) },
      { label: 'Execution',   value: Math.min(100, Math.round((wr + Math.min(100, impliedRR * 30)) / 2)) },
      { label: 'Consistency', value: consistency },
    ];
    const overall = Math.round(items.reduce((s, i) => s + i.value, 0) / items.length);
    return { items, overall };
  }, [trades]);

  const overallColor = !scores ? '' :
    scores.overall >= 70 ? 'text-violet-400' :
    scores.overall >= 50 ? 'text-violet-300'  : 'text-amber-400';

  return (
    <GlassCard index={5} className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-white">Trader Score</p>
          <p className="text-[11px] text-white/30 mt-0.5">Overall performance</p>
        </div>
        {scores && (
          <div className="text-right">
            <span className={`text-3xl font-bold font-mono ${overallColor}`}>{scores.overall}</span>
            <span className="text-white/30 text-sm">/100</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-white/[0.02] rounded-lg animate-pulse" />)}</div>
      ) : !scores ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Activity className="h-8 w-8 text-white/10 mb-2" />
          <p className="text-xs text-white/20">Score calculated from your trades</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.items.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/40">{item.label}</span>
                <span className={`text-xs font-bold ${item.value >= 70 ? 'text-violet-400' : item.value >= 50 ? 'text-violet-300' : 'text-amber-400'}`}>
                  {item.value}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${item.value >= 70 ? 'bg-violet-500' : item.value >= 50 ? 'bg-violet-400' : 'bg-amber-500'}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Today Focus ──────────────────────────────────────────────────────────────
function TodayFocus({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <GlassCard index={6} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Today Focus</p>
          <p className="text-[11px] text-white/30 mt-0.5">Pre-market plan</p>
        </div>
        <button onClick={() => onNavigate('plan')}
          className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
          Edit <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Bias</p>
          <p className="text-sm text-white font-medium">Set in Trade Plan →</p>
        </div>
        <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-3">
          <p className="text-[10px] text-violet-400/60 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Zap className="h-3 w-3" /> AI Hint
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            Add trades to unlock personalized AI insights about your patterns.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function TradingCalendarCard({ calendarMap, loading }: {
  calendarMap: Record<string, { pnl: number; trades: number }>; loading: boolean;
}) {
  const [current, setCurrent] = useState(new Date());
  const year  = current.getFullYear();
  const month = current.getMonth();
  const days  = new Date(year, month + 1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const label = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const total = Math.ceil((first + days) / 7) * 7;
  const today = new Date().toISOString().split('T')[0];

  return (
    <GlassCard index={7} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Trading Calendar</p>
          <p className="text-[11px] text-white/30 mt-0.5">Monthly P&L heatmap</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-white/50 font-medium min-w-[90px] text-center">{label}</span>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-white/20 font-medium py-1">{d}</div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: total }, (_, i) => {
            const day = i - first + 1;
            const inMonth = day >= 1 && day <= days;
            const dateStr = inMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : '';
            const entry = dateStr ? calendarMap[dateStr] : undefined;
            const isToday = dateStr === today;
            const pos = (entry?.pnl ?? 0) > 0;
            const neg = (entry?.pnl ?? 0) < 0;

            return (
              <motion.div key={i}
                whileHover={inMonth ? { scale: 1.08 } : {}}
                className={`rounded-lg h-10 flex flex-col items-center justify-center transition-colors relative ${
                  !inMonth ? 'opacity-0 pointer-events-none' :
                  entry && pos ? 'bg-emerald-500/15 border border-emerald-500/25' :
                  entry && neg ? 'bg-red-500/15 border border-red-500/25' :
                  isToday ? 'bg-violet-500/10 border border-violet-500/25' :
                  'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {inMonth && (
                  <>
                    <span className={`text-[10px] font-medium leading-none ${
                      isToday ? 'text-violet-400' :
                      entry ? (pos ? 'text-emerald-400' : 'text-red-400') : 'text-white/25'
                    }`}>
                      {day}
                    </span>
                    {entry && (
                      <span className={`text-[8px] font-bold leading-none mt-0.5 ${pos ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {pos ? '+' : ''}{Math.round(entry.pnl)}
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/25">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/40 inline-block" /> Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500/40 inline-block" /> Loss
        </span>
      </div>
    </GlassCard>
  );
}

// ─── Recent Trades ────────────────────────────────────────────────────────────
function RecentTradesCard({ trades, loading, onNavigate }: {
  trades: Trade[]; loading: boolean; onNavigate: (id: string) => void;
}) {
  return (
    <GlassCard index={8} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Recent Trades</p>
          <p className="text-[11px] text-white/30 mt-0.5">Last executions</p>
        </div>
        <button onClick={() => onNavigate('trades')}
          className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2.5">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />)}</div>
      ) : trades.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/20">No trades yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {trades.slice(0, 6).map((trade, i) => {
            const res = trade.result ?? 0;
            const pos = res >= 0;
            return (
              <motion.div key={trade.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pos ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-white">{trade.pair}</p>
                    <p className="text-[10px] text-white/25">{trade.side ?? '—'} · {fmtDate(trade.trade_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtMoney(res)}
                  </p>
                  {trade.setup && <p className="text-[10px] text-white/20">{trade.setup}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Best Setups ──────────────────────────────────────────────────────────────
function BestSetupsCard({ data, loading }: { data: { name: string; value: number }[]; loading: boolean }) {
  return (
    <GlassCard index={9} className="p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">Best Setups</p>
        <p className="text-[11px] text-white/30 mt-0.5">P&L by setup type</p>
      </div>

      {loading ? (
        <div className="h-40 bg-white/[0.02] rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center">
          <Target className="h-8 w-8 text-white/10 mb-2" />
          <p className="text-xs text-white/20">Tag trades with setups to see this</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.slice(0, 6)} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]}
              label={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}

// ─── Main CommandCenter ───────────────────────────────────────────────────────
interface CommandCenterProps {
  onNavigate:  (id: string) => void;
  onAddTrade?: () => void;
}

export default function CommandCenter({ onNavigate, onAddTrade }: CommandCenterProps) {
  const { user } = useAuth();
  const [trades,  setTrades]  = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('trades')
      .select('id,pair,side,result,outcome,trade_date,setup,rr')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false });

    if (err) { setError('Could not load trades.'); console.error(err); }
    else setTrades(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  // ── Metrics ──────────────────────────────────────────────────────
  const metrics: DashboardMetrics = useMemo(() => {
    const wins   = trades.filter(t => t.result > 0);
    const losses = trades.filter(t => t.result < 0);
    const totalPnl = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const winRate  = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
    const rrs      = trades.filter(t => t.rr);
    const avgRR    = rrs.length > 0 ? rrs.reduce((s, t) => s + (t.rr ?? 0), 0) / rrs.length : null;

    // Equity curve
    const asc = [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let cum = 0;
    const equityData = asc.map(t => {
      cum += t.result ?? 0;
      return { day: fmtDate(t.trade_date), value: Number(cum.toFixed(2)) };
    });

    // Setup map
    const sm: Record<string, number> = {};
    trades.forEach(t => {
      if (t.setup?.trim()) {
        sm[t.setup.trim()] = (sm[t.setup.trim()] ?? 0) + (t.result ?? 0);
      }
    });
    const setupData = Object.entries(sm)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    // Calendar
    const calendarMap: Record<string, { pnl: number; trades: number }> = {};
    trades.forEach(t => {
      const d = t.trade_date;
      if (!calendarMap[d]) calendarMap[d] = { pnl: 0, trades: 0 };
      calendarMap[d].pnl    += t.result ?? 0;
      calendarMap[d].trades += 1;
    });

    return {
      totalPnl, winRate, tradesCount: trades.length,
      avgRR, wins: wins.length, losses: losses.length,
      equityData, setupData, recentTrades: trades.slice(0, 6),
      calendarMap,
    };
  }, [trades]);

  const hasData = !loading && trades.length > 0;
  const isEmpty = !loading && trades.length === 0;

  // ── Metric cards data ─────────────────────────────────────────────
  const metricCards = [
    {
      title: 'Total P&L',
      value: fmtMoney(metrics.totalPnl),
      sub: `From ${metrics.tradesCount} trades`,
      icon: TrendingUp,
      color: metrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      title: 'Win Rate',
      value: `${metrics.winRate}%`,
      sub: `${metrics.wins} wins · ${metrics.losses} losses`,
      icon: Target,
      color: metrics.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400',
    },
    {
      title: 'Avg R:R',
      value: metrics.avgRR != null ? `1:${metrics.avgRR.toFixed(1)}` : '—',
      sub: metrics.avgRR != null ? 'From logged R:R' : 'No R:R logged yet',
      icon: LineChart,
      color: 'text-blue-400',
    },
    {
      title: 'Trades',
      value: `${metrics.tradesCount}`,
      sub: 'Total logged trades',
      icon: BarChart3,
      color: 'text-violet-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h2 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white tracking-tight">
            Command Center
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-sm text-white/30 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            onClick={fetchTrades}
            className="p-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-white/30 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </motion.button>
          {onAddTrade && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
              onClick={onAddTrade}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              <Plus className="h-4 w-4" /> New Trade
            </motion.button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchTrades} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !error && (
        <GlassCard index={0} glow className="overflow-hidden">
          <EmptyState onAddTrade={onAddTrade ?? (() => onNavigate('trades'))} />
        </GlassCard>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <MetricCard key={card.title} {...card} index={i} loading={loading} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EquityCurve data={metrics.equityData} loading={loading} />
        <TodayFocus onNavigate={onNavigate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TradingCalendarCard calendarMap={metrics.calendarMap} loading={loading} />
        </div>
        <TraderScoreCard trades={trades} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTradesCard trades={metrics.recentTrades} loading={loading} onNavigate={onNavigate} />
        <BestSetupsCard data={metrics.setupData} loading={loading} />
      </div>
    </motion.div>
  );
}
