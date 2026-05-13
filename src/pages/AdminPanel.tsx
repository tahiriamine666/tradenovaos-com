// src/pages/AdminPanel.tsx
// Premium TradeNova Admin Panel

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, TrendingUp, BarChart3, MessageSquare, Shield,
  RefreshCw, Check, X, Search, AlertCircle, Activity,
  DollarSign, BookOpen, Target, Crown, Zap, Star,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminStats {
  total_users: number; pro_users: number; elite_users: number; free_users: number;
  total_trades: number; total_journals: number; total_playbooks: number;
  total_support_msgs: number; open_support_msgs: number;
  pending_upgrades: number; users_this_month: number;
  trades_this_month: number; mrr_estimate: number;
}
interface AdminUser {
  id: string; email: string; display_name: string | null;
  plan_type: string; subscription_status: string;
  created_at: string; trade_count: number;
  last_trade_at: string | null;
}
interface SupportMsg {
  id: string; name: string; email: string; subject: string;
  message: string; status: string; created_at: string;
}
interface UpgradeReq {
  id: string; user_id: string; requested_plan: string;
  status: string; payoneer_ref: string | null;
  user_message: string | null; created_at: string;
  profiles: { email: string } | null;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1];
function fmtRel(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const PLAN_BADGE: Record<string, string> = {
  elite: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  pro:   'bg-violet-500/15 text-violet-400 border-violet-500/25',
  free:  'bg-white/5 text-white/35 border-white/10',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'text-emerald-400', trialing: 'text-blue-400',
  inactive: 'text-white/25', canceled: 'text-red-400', past_due: 'text-amber-400',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function Stat({ title, value, sub, icon: Icon, color, i, loading }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; i: number; loading: boolean;
}) {
  const bg = color.includes('emerald') ? 'bg-emerald-500/10' : color.includes('amber') ? 'bg-amber-500/10' : color.includes('blue') ? 'bg-blue-500/10' : color.includes('pink') ? 'bg-pink-500/10' : color.includes('cyan') ? 'bg-cyan-500/10' : color.includes('orange') ? 'bg-orange-500/10' : 'bg-violet-500/10';
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05, ease }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">{title}</p>
          {loading ? <div className="h-7 w-20 bg-white/[0.04] rounded-lg animate-pulse" /> : <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>}
          {sub && <p className="text-[11px] text-white/25 mt-1.5">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin,   setIsAdmin]   = useState<boolean | null>(null);
  const [stats,     setStats]     = useState<AdminStats | null>(null);
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [messages,  setMessages]  = useState<SupportMsg[]>([]);
  const [requests,  setRequests]  = useState<UpgradeReq[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<'overview' | 'users' | 'support' | 'upgrades'>('overview');
  const [search,    setSearch]    = useState('');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Check admin
  useEffect(() => {
    if (!user) return;
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Load data
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [s, u, m, r] = await Promise.all([
        supabase.rpc('get_admin_stats'),
        supabase.rpc('get_admin_users_list'),
        supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('upgrade_requests').select('*,profiles(email)').order('created_at', { ascending: false }).limit(50),
      ]);
      if (s.error) throw new Error(s.error.message);
      if (u.error) throw new Error(u.error.message);
      setStats(s.data as AdminStats);
      setUsers((u.data as AdminUser[]) ?? []);
      setMessages((m.data as SupportMsg[]) ?? []);
      setRequests((r.data as any) ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const upgrade = async (userId: string, plan: string) => {
    setUpgrading(userId);
    try {
      const { error } = await supabase.rpc('admin_upgrade_user', { target_user_id: userId, new_plan: plan, trial_days: 0, notes: 'Admin manual upgrade' });
      if (error) throw error;
      toast({ title: `Upgraded to ${plan}!` });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setUpgrading(null); }
  };

  const approveReq = async (req: UpgradeReq) => {
    setUpgrading(req.id);
    try {
      await supabase.rpc('admin_upgrade_user', { target_user_id: req.user_id, new_plan: req.requested_plan, trial_days: 14, notes: `Payoneer ref: ${req.payoneer_ref ?? 'N/A'}` });
      await supabase.from('upgrade_requests').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', req.id);
      toast({ title: `Approved → ${req.requested_plan}` }); load();
    } catch (e: any) { toast({ title: 'Error', description: (e as any).message, variant: 'destructive' }); }
    finally { setUpgrading(null); }
  };

  const rejectReq = async (id: string) => {
    await supabase.from('upgrade_requests').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Rejected' }); load();
  };

  const resolveMsg = async (id: string) => {
    await supabase.from('support_messages').update({ status: 'resolved' }).eq('id', id);
    setMessages(p => p.map(m => m.id === id ? { ...m, status: 'resolved' } : m));
    toast({ title: 'Resolved' });
  };

  const filtered = useMemo(() => users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const growthData = useMemo(() => ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({ month: m, trades: Math.round((stats?.total_trades ?? 0) * (0.5 + i * 0.1)) })), [stats]);
  const planDist = [{ name: 'Free', value: stats?.free_users ?? 0, color: '#4b5563' }, { name: 'Pro', value: stats?.pro_users ?? 0, color: '#7c3aed' }, { name: 'Elite', value: stats?.elite_users ?? 0, color: '#f59e0b' }];
  const pending = requests.filter(r => r.status === 'pending');

  const TABS = [
    { id: 'overview', l: 'Overview',  badge: null },
    { id: 'users',    l: 'Users',     badge: stats?.total_users },
    { id: 'support',  l: 'Support',   badge: stats?.open_support_msgs || null },
    { id: 'upgrades', l: 'Upgrades',  badge: pending.length || null },
  ] as const;

  if (isAdmin === false) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Shield className="h-8 w-8 text-red-400" />
      </div>
      <p className="font-black text-white text-lg">Admin Access Required</p>
      <p className="text-sm text-white/35 mt-1">You don't have permission to view this page.</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            Admin Panel
          </h2>
          <p className="text-sm text-white/25 mt-1 ml-12">TradeNova control center</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-white/40 hover:text-white text-sm transition-all disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={load} className="text-xs text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center ${tab === t.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/35 hover:text-white hover:bg-white/[0.04]'}`}>
            {t.l}
            {t.badge != null && t.badge > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-violet-500/20 text-violet-400'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Total Users',    value: stats?.total_users ?? 0,        sub: `+${stats?.users_this_month ?? 0} this month`, icon: Users,         color: 'text-white' },
                { title: 'Pro Users',      value: stats?.pro_users ?? 0,          sub: 'Active',                                      icon: Zap,            color: 'text-violet-400' },
                { title: 'Elite Users',    value: stats?.elite_users ?? 0,        sub: 'Active',                                      icon: Crown,          color: 'text-amber-400' },
                { title: 'Est. MRR',       value: `$${stats?.mrr_estimate ?? 0}`, sub: 'Monthly recurring',                           icon: DollarSign,     color: 'text-emerald-400' },
                { title: 'Total Trades',   value: stats?.total_trades ?? 0,       sub: `+${stats?.trades_this_month ?? 0} this month`,icon: TrendingUp,     color: 'text-blue-400' },
                { title: 'Journal Entries',value: stats?.total_journals ?? 0,     sub: 'All time',                                    icon: BookOpen,       color: 'text-pink-400' },
                { title: 'Playbooks',      value: stats?.total_playbooks ?? 0,    sub: 'Created',                                     icon: Target,         color: 'text-cyan-400' },
                { title: 'Support Msgs',   value: stats?.total_support_msgs ?? 0, sub: `${stats?.open_support_msgs ?? 0} open`,       icon: MessageSquare,  color: 'text-orange-400' },
              ].map((s, i) => <Stat key={s.title} {...s} i={i} loading={loading} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-sm font-black text-white mb-1">Platform Activity</p>
                <p className="text-[11px] text-white/30 mb-5">Trades over time</p>
                {loading ? <div className="h-44 bg-white/[0.02] rounded-xl animate-pulse" /> : (
                  <ResponsiveContainer width="100%" height={170}>
                    <AreaChart data={growthData}>
                      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} width={28}/>
                      <Tooltip contentStyle={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: 12 }}/>
                      <Area type="monotone" dataKey="trades" stroke="#7c3aed" strokeWidth={2} fill="url(#ag)" dot={false} activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-sm font-black text-white mb-1">Plan Distribution</p>
                <p className="text-[11px] text-white/30 mb-4">User breakdown</p>
                {loading ? <div className="h-44 bg-white/[0.02] rounded-xl animate-pulse" /> : (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={planDist} cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" paddingAngle={3}>
                          {planDist.map((e, i) => <Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: 11 }}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 w-full">
                      {planDist.map(p => (
                        <div key={p.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }}/><span className="text-xs text-white/35">{p.name}</span></div>
                          <span className="text-xs font-bold text-white">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {pending.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-sm font-black text-white">{pending.length} Pending Upgrade Requests</p><p className="text-xs text-white/30 mt-0.5">Require your approval</p></div>
                  <button onClick={() => setTab('upgrades')} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">View all →</button>
                </div>
                <div className="space-y-2">
                  {pending.slice(0, 3).map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div>
                        <p className="text-sm font-semibold text-white">{(req.profiles as any)?.email ?? 'Unknown'}</p>
                        <p className="text-xs text-white/30">→ {req.requested_plan} · {fmtRel(req.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveReq(req)} disabled={upgrading === req.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-colors disabled:opacity-40 flex items-center gap-1.5"><Check className="h-3.5 w-3.5"/>Approve</button>
                        <button onClick={() => rejectReq(req.id)} disabled={upgrading === req.id} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/30 text-xs font-bold hover:bg-white/[0.04] transition-colors disabled:opacity-40 flex items-center gap-1.5"><X className="h-3.5 w-3.5"/>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <motion.div key="us" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email..."
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"/>
              </div>
              <span className="text-xs text-white/20 ml-auto">{filtered.length} users</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse"/>)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center"><Users className="h-10 w-10 text-white/10 mx-auto mb-3"/><p className="text-sm text-white/20">No users found</p></div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filtered.map((u, i) => (
                  <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-violet-300">{(u.display_name ?? u.email ?? '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">{u.email}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${PLAN_BADGE[u.plan_type] ?? PLAN_BADGE.free}`}>{u.plan_type}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/25 flex-wrap">
                        <span className={STATUS_COLOR[u.subscription_status] ?? 'text-white/25'}>{u.subscription_status}</span>
                        <span>·</span><span>{u.trade_count} trades</span>
                        <span>·</span><span>Joined {fmtRel(u.created_at)}</span>
                        {u.last_trade_at && <><span>·</span><span>Last trade {fmtRel(u.last_trade_at)}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {u.plan_type !== 'pro'   && <button onClick={() => upgrade(u.id, 'pro')}   disabled={upgrading === u.id} className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/15 transition-colors disabled:opacity-40">→ Pro</button>}
                      {u.plan_type !== 'elite' && <button onClick={() => upgrade(u.id, 'elite')} disabled={upgrading === u.id} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/15 transition-colors disabled:opacity-40">→ Elite</button>}
                      {u.plan_type !== 'free'  && <button onClick={() => upgrade(u.id, 'free')}  disabled={upgrading === u.id} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/25 text-xs font-bold hover:bg-white/[0.04] transition-colors disabled:opacity-40">→ Free</button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SUPPORT ── */}
        {tab === 'support' && (
          <motion.div key="sp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse"/>)}</div>
              : messages.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                  <p className="text-sm font-semibold text-white/25">No support messages yet</p>
                  <p className="text-xs text-white/15 mt-1">Chat widget messages will appear here</p>
                </div>
              ) : messages.map((msg, i) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border p-5 ${msg.status === 'resolved' ? 'border-white/[0.05] bg-white/[0.01] opacity-50' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <p className="text-sm font-bold text-white">{msg.name}</p>
                        <span className="text-xs text-white/25">{msg.email}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${msg.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{msg.status}</span>
                        <span className="text-[10px] text-white/15 ml-auto">{fmtRel(msg.created_at)}</span>
                      </div>
                      <p className="text-xs font-semibold text-violet-400/60 mb-1">{msg.subject}</p>
                      <p className="text-sm text-white/45 leading-relaxed">{msg.message}</p>
                    </div>
                    {msg.status === 'open' && (
                      <button onClick={() => resolveMsg(msg.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-colors flex-shrink-0">
                        <Check className="h-3.5 w-3.5"/> Resolve
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
          </motion.div>
        )}

        {/* ── UPGRADES ── */}
        {tab === 'upgrades' && (
          <motion.div key="up" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse"/>)}</div>
              : requests.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
                  <Activity className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                  <p className="text-sm font-semibold text-white/25">No upgrade requests yet</p>
                  <p className="text-xs text-white/15 mt-1">Payoneer requests will appear here</p>
                </div>
              ) : requests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border p-5 ${req.status === 'pending' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.05] bg-white/[0.01] opacity-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <p className="text-sm font-bold text-white">{(req.profiles as any)?.email ?? req.user_id.slice(0, 8)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[req.requested_plan] ?? ''}`}>→ {req.requested_plan}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{req.status}</span>
                        <span className="text-[10px] text-white/15">{fmtRel(req.created_at)}</span>
                      </div>
                      {req.payoneer_ref && <p className="text-xs text-white/35 font-mono mb-1">Ref: {req.payoneer_ref}</p>}
                      {req.user_message && <p className="text-sm text-white/40">{req.user_message}</p>}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveReq(req)} disabled={upgrading === req.id} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-colors disabled:opacity-40 flex items-center gap-1.5"><Check className="h-3.5 w-3.5"/>Approve</button>
                        <button onClick={() => rejectReq(req.id)} disabled={upgrading === req.id} className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/30 text-xs font-bold hover:bg-white/[0.04] transition-colors disabled:opacity-40 flex items-center gap-1.5"><X className="h-3.5 w-3.5"/>Reject</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
