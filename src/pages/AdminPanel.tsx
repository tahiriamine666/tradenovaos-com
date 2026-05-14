import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertCircle, Crown, DollarSign, RefreshCw, Radio, Shield,
  TrendingUp, UserPlus, Users, Zap, Search, Inbox, MessageSquare,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  plan_type: 'free' | 'pro' | 'elite' | string;
  subscription_status: 'active' | 'trialing' | 'inactive' | string;
  created_at: string;
  last_seen_at: string | null;
  total_trade_count: number;
  period_trade_count: number;
}

interface Analytics {
  total_users: number;
  new_users: number;
  active_traders: number;
  online_now: number;
  pro_users: number;
  elite_users: number;
  free_users: number;
  total_trades: number;
  new_trades: number;
  mrr: number;
  pending_upgrades: number;
  open_support: number;
  growth_chart: { date: string; total_users: number }[];
  trades_chart: { date: string; trades: number }[];
  top_users: AdminUser[];
}

const RANGES: { label: string; days: number }[] = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

// ── Utilities ─────────────────────────────────────────────────────────
function initialsOf(email: string | null, name: string | null): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatJoined(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Count-up hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

// ── Sub-components ────────────────────────────────────────────────────
function StatCard({
  title, value, hint, icon: Icon, accent, prefix = '', pulse = false,
}: {
  title: string;
  value: number;
  hint?: string;
  icon: React.ElementType;
  accent: string;
  prefix?: string;
  pulse?: boolean;
}) {
  const v = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 hover:bg-white/[0.045] transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {prefix}{v.toLocaleString()}
          </p>
          {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
        </div>
        <div className={`relative rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-4 w-4" />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0a0a14]/95 border border-white/[0.08] px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    elite: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    pro: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    free: 'bg-white/[0.06] text-white/50 border-white/10',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize ${map[plan] ?? map.free}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta: Record<string, { dot: string; label: string; text: string }> = {
    active: { dot: 'bg-emerald-400', label: 'Active', text: 'text-emerald-400' },
    trialing: { dot: 'bg-blue-400', label: 'Trialing', text: 'text-blue-400' },
    inactive: { dot: 'bg-white/30', label: 'Inactive', text: 'text-white/40' },
  };
  const m = meta[status] ?? meta.inactive;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      <span className={m.text}>{m.label}</span>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function AdminPanel() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (d: number) => {
    setError(null);
    try {
      const { data: analytics, error: rpcError } = await supabase
        .rpc('get_admin_analytics', { p_days: d });
      if (rpcError) throw rpcError;
      setData(analytics as unknown as Analytics);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    }
  }, []);

  // Auth guard + initial load + presence
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: adminFlag, error: aErr } = await supabase.rpc('is_admin', { _uid: (await supabase.auth.getUser()).data.user?.id });
      if (!alive) return;
      const ok = !aErr && Boolean(adminFlag);
      setIsAdmin(ok);
      if (ok) {
        await supabase.rpc('update_last_seen');
        await loadData(days);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll presence every 60s
  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => { supabase.rpc('update_last_seen'); }, 60000);
    return () => clearInterval(id);
  }, [isAdmin]);

  const handleRange = useCallback(async (d: number) => {
    setDays(d);
    setRefreshing(true);
    await loadData(d);
    setRefreshing(false);
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(days);
    setRefreshing(false);
  }, [loadData, days]);

  const handleUpgrade = useCallback(async (uid: string, plan: 'free' | 'pro' | 'elite') => {
    const { error: upErr } = await supabase.rpc('admin_upgrade_user', {
      target_user_id: uid, new_plan: plan, trial_days: 0, notes: 'Admin upgrade',
    });
    if (upErr) { toast.error(`Failed: ${upErr.message}`); return; }
    toast.success(`Plan changed to ${plan}`);
    await loadData(days);
  }, [days, loadData]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.top_users;
    return data.top_users.filter((u) =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.display_name ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Free', value: data.free_users, color: '#475569' },
      { name: 'Pro', value: data.pro_users, color: '#7c3aed' },
      { name: 'Elite', value: data.elite_users, color: '#f59e0b' },
    ];
  }, [data]);

  // ── Auth guard view ────────────────────────────────────────────────
  if (loading && isAdmin === null) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/10 grid place-items-center">
            <Shield className="h-6 w-6 text-white/60" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Admin Access Required</h2>
          <p className="mt-1 text-sm text-white/50">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-white">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-600/15 border border-violet-500/25 p-2.5">
            <Shield className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-white/50">TradeNova control center</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-white/70">Live</span>
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.06] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* RANGE TABS */}
      <div className="inline-flex items-center gap-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-1">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => handleRange(r.days)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              days === r.days ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="text-red-300 font-medium">Failed to load admin data</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* STATS */}
      {!data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
              <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
              <div className="mt-3 h-7 w-24 bg-white/[0.04] rounded-lg animate-pulse" />
              <div className="mt-2 h-3 w-16 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={data.total_users} icon={Users} accent="bg-white/[0.06] text-white" />
          <StatCard title="New Users" value={data.new_users} hint="this period" icon={UserPlus} accent="bg-emerald-500/15 text-emerald-400" />
          <StatCard title="Active Traders" value={data.active_traders} hint="traded in period" icon={Activity} accent="bg-blue-500/15 text-blue-400" />
          <StatCard title="Online Now" value={data.online_now} hint="last 5 minutes" icon={Radio} accent="bg-emerald-500/15 text-emerald-400" pulse />
          <StatCard title="Pro Users" value={data.pro_users} icon={Zap} accent="bg-violet-500/15 text-violet-300" />
          <StatCard title="Elite Users" value={data.elite_users} icon={Crown} accent="bg-amber-500/15 text-amber-400" />
          <StatCard title="Total Trades" value={data.total_trades} hint={`+${data.new_trades.toLocaleString()} this period`} icon={TrendingUp} accent="bg-blue-500/15 text-blue-400" />
          <StatCard title="Est. MRR" value={data.mrr} prefix="$" icon={DollarSign} accent="bg-emerald-500/15 text-emerald-400" />
        </div>
      )}

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">User Growth</h3>
              <p className="text-xs text-white/40">Cumulative total users</p>
            </div>
          </div>
          {!data ? (
            <div className="h-[220px] bg-white/[0.02] rounded-xl animate-pulse" />
          ) : data.growth_chart.length === 0 ? (
            <div className="h-[220px] grid place-items-center text-white/30">
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs">No data yet for this period</p>
              </div>
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.growth_chart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(124,58,237,0.4)' }} />
                  <Area type="monotone" dataKey="total_users" stroke="#7c3aed" strokeWidth={2} fill="url(#growthFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Trades</h3>
              <p className="text-xs text-white/40">Trades created per day</p>
            </div>
          </div>
          {!data ? (
            <div className="h-[220px] bg-white/[0.02] rounded-xl animate-pulse" />
          ) : data.trades_chart.length === 0 ? (
            <div className="h-[220px] grid place-items-center text-white/30">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs">No data yet for this period</p>
              </div>
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trades_chart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
                  <Bar dataKey="trades" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white">Users</h3>
            <p className="text-xs text-white/40">{data?.top_users.length ?? 0} total</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/40"
            />
          </div>
        </div>

        {!data ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-white/40">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-white/40">
                  <th className="text-left font-medium px-5 py-3">User</th>
                  <th className="text-left font-medium px-3 py-3">Plan</th>
                  <th className="text-left font-medium px-3 py-3">Status</th>
                  <th className="text-left font-medium px-3 py-3">Joined</th>
                  <th className="text-left font-medium px-3 py-3">Trades</th>
                  <th className="text-left font-medium px-3 py-3">Last Active</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="group border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-700/30 border border-white/10 grid place-items-center text-[11px] font-semibold text-white/80">
                          {initialsOf(u.email, u.display_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate max-w-[220px]">{u.email ?? '—'}</p>
                          {u.display_name && <p className="text-[11px] text-white/40 truncate max-w-[220px]">{u.display_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><PlanBadge plan={u.plan_type} /></td>
                    <td className="px-3 py-3"><StatusBadge status={u.subscription_status} /></td>
                    <td className="px-3 py-3 text-xs text-white/60">{formatJoined(u.created_at)}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-white tabular-nums">{u.total_trade_count}</p>
                      {u.period_trade_count > 0 && (
                        <p className="text-[10px] text-white/30">+{u.period_trade_count} this period</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/60">{relativeTime(u.last_seen_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.plan_type !== 'pro' && (
                          <button onClick={() => handleUpgrade(u.id, 'pro')}
                            className="px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[11px] font-medium hover:bg-violet-500/25">
                            → Pro
                          </button>
                        )}
                        {u.plan_type !== 'elite' && (
                          <button onClick={() => handleUpgrade(u.id, 'elite')}
                            className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[11px] font-medium hover:bg-amber-500/25">
                            → Elite
                          </button>
                        )}
                        {u.plan_type !== 'free' && (
                          <button onClick={() => handleUpgrade(u.id, 'free')}
                            className="px-2.5 py-1 rounded-md bg-white/[0.06] text-white/60 border border-white/10 text-[11px] font-medium hover:bg-white/[0.1]">
                            → Free
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan distribution */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <h3 className="text-sm font-semibold text-white">Plan Distribution</h3>
          <p className="text-xs text-white/40">Breakdown of all users</p>
          {!data ? (
            <div className="h-[220px] bg-white/[0.02] rounded-xl animate-pulse mt-4" />
          ) : (
            <div className="mt-4 flex items-center gap-6">
              <div className="relative h-[160px] w-[160px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2} stroke="none">
                      {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-bold text-white tabular-nums">{data.total_users}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                      <span className="text-white/70">{p.name}</span>
                    </div>
                    <span className="text-white tabular-nums">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
          <p className="text-xs text-white/40">Pending workload</p>

          {data && data.pending_upgrades > 0 && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200">
                {data.pending_upgrades} {data.pending_upgrades === 1 ? 'request needs' : 'requests need'} approval
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 text-violet-300" />
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Pending Upgrades</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-white tabular-nums">{data?.pending_upgrades ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-300" />
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Open Support</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-white tabular-nums">{data?.open_support ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => toast.info('Upgrade requests view coming soon')}
              className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
            >
              View Upgrade Requests
            </button>
            <button
              onClick={() => toast.info('Support inbox view coming soon')}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium border border-white/[0.08] transition-colors"
            >
              View Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
