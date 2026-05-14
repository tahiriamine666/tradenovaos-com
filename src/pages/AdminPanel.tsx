import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, BarChart3, MessageSquare, Shield, RefreshCw, Check, X, Search, AlertCircle, Activity, DollarSign, BookOpen, Target, Crown, Zap, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PERIODS = [
  { label: '7D',    days: 7   },
  { label: '30D',   days: 30  },
  { label: '3M',    days: 90  },
  { label: '6M',    days: 180 },
  { label: '1Y',    days: 365 },
];

const PLAN_BADGE = { elite: 'bg-amber-500/15 text-amber-400 border-amber-500/25', pro: 'bg-violet-500/15 text-violet-400 border-violet-500/25', free: 'bg-white/5 text-white/35 border-white/10' };
const STATUS_COLOR = { active:'text-emerald-400', trialing:'text-blue-400', inactive:'text-white/25', canceled:'text-red-400', past_due:'text-amber-400' };
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function fmtRel(d) {
  if (!d) return 'Never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return days + 'd ago';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatCard({ title, value, sub, icon: Icon, color, i, loading }) {
  const bg = color.includes('emerald') ? 'bg-emerald-500/10' : color.includes('amber') ? 'bg-amber-500/10' : color.includes('blue') ? 'bg-blue-500/10' : color.includes('pink') ? 'bg-pink-500/10' : 'bg-violet-500/10';
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

function OnlineDot({ is_online }) {
  if (!is_online) return <span className="w-2 h-2 rounded-full bg-white/15 inline-block" />;
  return (
    <span className="relative inline-flex">
      <motion.span animate={{ scale: [1,1.5,1], opacity: [0.7,0,0.7] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-emerald-500" />
      <span className="w-2 h-2 rounded-full bg-emerald-400 relative z-10" />
    </span>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin,   setIsAdmin]   = useState(null);
  const [stats,     setStats]     = useState(null);
  const [users,     setUsers]     = useState([]);
  const [messages,  setMessages]  = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [tab,       setTab]       = useState('overview');
  const [period,    setPeriod]    = useState(30);
  const [search,    setSearch]    = useState('');
  const [upgrading, setUpgrading] = useState(null);

  // Manual activation state
  const [activateEmail,    setActivateEmail]    = useState('');
  const [activatePlan,     setActivatePlan]     = useState('pro');
  const [activateStatus,   setActivateStatus]   = useState('active');
  const [activateTrialDays,setActivateTrialDays]= useState('0');
  const [activateNotes,    setActivateNotes]    = useState('');
  const [activating,       setActivating]       = useState(false);
  const [searchResults,    setSearchResults]    = useState<any[]>([]);
  const [searching,        setSearching]        = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [s, u, m, r, l] = await Promise.all([
        supabase.rpc('get_admin_analytics', { days_back: period }),
        supabase.rpc('get_admin_users_list'),
        supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('upgrade_requests').select('*,profiles(email)').order('created_at', { ascending: false }).limit(50),
        supabase.rpc('get_active_users_now'),
      ]);
      if (s.error) throw new Error(s.error.message);
      if (u.error) throw new Error(u.error.message);
      setStats(s.data);
      setUsers((u.data as any[]) ?? []);
      setMessages(m.data ?? []);
      setRequests(r.data ?? []);
      setLiveUsers((l.data as any[]) ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user, period]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const upgrade = async (userId, plan) => {
    setUpgrading(userId);
    try {
      const { error } = await supabase.rpc('admin_upgrade_user', { target_user_id: userId, new_plan: plan, trial_days: 0, notes: 'Admin manual' });
      if (error) throw error;
      toast({ title: `Upgraded to ${plan}!` }); load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setUpgrading(null); }
  };

  const approveReq = async (req) => {
    setUpgrading(req.id);
    try {
      await supabase.rpc('admin_upgrade_user', { target_user_id: req.user_id, new_plan: req.requested_plan, trial_days: 14, notes: `Payoneer ref: ${req.payoneer_ref ?? 'N/A'}` });
      await supabase.from('upgrade_requests').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', req.id);
      toast({ title: `Approved → ${req.requested_plan}` }); load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setUpgrading(null); }
  };

  const rejectReq = async (id) => {
    await supabase.from('upgrade_requests').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Rejected' }); load();
  };

  const resolveMsg = async (id) => {
    await supabase.from('support_messages').update({ status: 'resolved' }).eq('id', id);
    setMessages(p => p.map(m => m.id === id ? { ...m, status: 'resolved' } : m));
    toast({ title: 'Resolved' });
  };

  const filtered = useMemo(() => users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const pending = requests.filter(r => r.status === 'pending');

  // Build chart data with zero-fill for days with no data
  const buildChartData = (rawData, days) => {
    const map = {};
    (rawData ?? []).forEach(d => { map[d.date] = d.count; });
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().split('T')[0];
      const label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      result.push({ date: label, count: map[key] ?? 0 });
    }
    return result;
  };

  const signupChart = useMemo(() => buildChartData(stats?.daily_signups, period), [stats, period]);
  const tradeChart  = useMemo(() => buildChartData(stats?.daily_trades,  period), [stats, period]);
  const planDist    = [
    { name: 'Free',  value: stats?.free_users  ?? 0, color: '#4b5563' },
    { name: 'Pro',   value: stats?.pro_users   ?? 0, color: '#7c3aed' },
    { name: 'Elite', value: stats?.elite_users ?? 0, color: '#f59e0b' },
  ];

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.rpc('admin_search_users' as any, { p_query: query });
    setSearchResults((data as any[]) ?? []);
    setSearching(false);
  }, []);

  const handleActivate = async () => {
    if (!activateEmail.trim()) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    setActivating(true);
    try {
      const { data, error } = await supabase.rpc('admin_upgrade_by_email' as any, {
        p_email:      activateEmail.trim(),
        p_plan:       activatePlan,
        p_status:     activateStatus,
        p_trial_days: parseInt(activateTrialDays) || 0,
        p_notes:      activateNotes.trim() || null,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Failed');
      const planLabel = activatePlan.charAt(0).toUpperCase() + activatePlan.slice(1);
      toast({ title: `✅ User upgraded to ${planLabel} successfully!` });
      setActivateEmail(''); setActivateNotes(''); setActivateTrialDays('0'); setSearchResults([]);
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setActivating(false); }
  };

  const handleExtendTrial = async (email: string) => {
    setActivating(true);
    try {
      const { error } = await supabase.rpc('admin_extend_trial' as any, { p_email: email, p_days: 7 });
      if (error) throw error;
      toast({ title: `✅ Trial extended 7 days for ${email}` });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setActivating(false); }
  };

  const quickUpgrade = async (userId: string, userEmail: string, plan: string) => {
    setUpgrading(userId);
    try {
      const { data, error } = await supabase.rpc('admin_upgrade_by_email' as any, {
        p_email: userEmail, p_plan: plan, p_status: 'active', p_trial_days: 0, p_notes: 'Quick upgrade from admin panel',
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Failed');
      toast({ title: `✅ User upgraded to ${plan} successfully!` });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setUpgrading(null); }
  };

  const TABS = [
    { id: 'overview', l: 'Overview',  badge: null },
    { id: 'users',    l: 'Users',     badge: stats?.total_users },
    { id: 'live',     l: 'Live',      badge: liveUsers.length || null },
    { id: 'support',  l: 'Support',   badge: stats?.open_tickets || null },
    { id: 'upgrades', l: 'Upgrades',  badge: pending.length || null },
  ];

  if (isAdmin === false) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Shield className="h-8 w-8 text-red-400" />
      </div>
      <p className="font-black text-white text-lg">Admin Access Required</p>
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
            Admin Dashboard
          </h2>
          <p className="text-sm text-white/25 mt-1 ml-12">TradeNova control center · {new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.days ? 'bg-violet-600 text-white shadow' : 'text-white/35 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-white/40 hover:text-white text-xs font-semibold transition-all disabled:opacity-40">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={load} className="text-xs text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${tab === t.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/35 hover:text-white hover:bg-white/[0.04]'}`}>
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
                { title:'Total Users',   value: stats?.total_users   ?? 0, sub:`+${stats?.new_users ?? 0} in period`,   icon:Users,       color:'text-white' },
                { title:'Active Users',  value: stats?.active_users  ?? 0, sub:'Traded in period',                       icon:Activity,    color:'text-emerald-400' },
                { title:'Pro Users',     value: stats?.pro_users     ?? 0, sub:'Active subscriptions',                   icon:Zap,         color:'text-violet-400' },
                { title:'Elite Users',   value: stats?.elite_users   ?? 0, sub:'Active subscriptions',                   icon:Crown,       color:'text-amber-400' },
                { title:'Est. MRR',      value:`$${stats?.mrr ?? 0}`,      sub:'Monthly recurring revenue',              icon:DollarSign,  color:'text-emerald-400' },
                { title:'Total Trades',  value: stats?.total_trades  ?? 0, sub:`+${stats?.new_trades ?? 0} in period`,  icon:TrendingUp,  color:'text-blue-400' },
                { title:'Journals',      value: stats?.total_journals ?? 0,sub:`+${stats?.new_journals ?? 0} in period`,icon:BookOpen,    color:'text-pink-400' },
                { title:'Open Tickets',  value: stats?.open_tickets  ?? 0, sub:`${stats?.pending_upgrades ?? 0} pending upgrades`, icon:MessageSquare, color:'text-orange-400' },
              ].map((s, i) => <StatCard key={s.title} {...s} i={i} loading={loading} />)}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* User signups */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-sm font-black text-white mb-0.5">New Users</p>
                <p className="text-[11px] text-white/30 mb-4">Signups over selected period</p>
                {loading ? <div className="h-44 bg-white/[0.02] rounded-xl animate-pulse" /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={signupChart}>
                      <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="date" tick={{ fontSize:10, fill:'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                      <YAxis allowDecimals={false} tick={{ fontSize:10, fill:'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} width={20}/>
                      <Tooltip contentStyle={{ background:'#0d0d18', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', fontSize:11 }}/>
                      <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} fill="url(#ug)" dot={false} activeDot={{ r:4, fill:'#7c3aed', strokeWidth:0 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Trade activity */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-sm font-black text-white mb-0.5">Trade Activity</p>
                <p className="text-[11px] text-white/30 mb-4">Trades logged per day</p>
                {loading ? <div className="h-44 bg-white/[0.02] rounded-xl animate-pulse" /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={tradeChart}>
                      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="date" tick={{ fontSize:10, fill:'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                      <YAxis allowDecimals={false} tick={{ fontSize:10, fill:'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} width={20}/>
                      <Tooltip contentStyle={{ background:'#0d0d18', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', fontSize:11 }}/>
                      <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#tg)" dot={false} activeDot={{ r:4, fill:'#10b981', strokeWidth:0 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Plan distribution */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-sm font-black text-white mb-0.5">Plan Split</p>
                <p className="text-[11px] text-white/30 mb-4">User distribution by plan</p>
                {loading ? <div className="h-44 bg-white/[0.02] rounded-xl animate-pulse" /> : (
                  <div className="flex flex-col items-center gap-3">
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie data={planDist} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={3}>
                          {planDist.map((e, i) => <Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#0d0d18', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', fontSize:11 }}/>
                      </PieChart>
                    </ResponsiveContainer>
                    {planDist.map(p => (
                      <div key={p.name} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background:p.color }}/><span className="text-xs text-white/35">{p.name}</span></div>
                        <span className="text-xs font-bold text-white">{p.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Pending upgrades alert */}
            {pending.length > 0 && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-sm font-black text-white">{pending.length} Pending Upgrade Requests</p><p className="text-xs text-white/30 mt-0.5">Require your approval</p></div>
                  <button onClick={() => setTab('upgrades')} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">View all →</button>
                </div>
                <div className="space-y-2">
                  {pending.slice(0,3).map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div>
                        <p className="text-sm font-semibold text-white">{req.profiles?.email ?? 'Unknown'}</p>
                        <p className="text-xs text-white/30">→ {req.requested_plan} · {fmtRel(req.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveReq(req)} disabled={upgrading===req.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 disabled:opacity-40 flex items-center gap-1.5"><Check className="h-3.5 w-3.5"/>Approve</button>
                        <button onClick={() => rejectReq(req.id)} disabled={upgrading===req.id} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/30 text-xs font-bold hover:bg-white/[0.04] disabled:opacity-40 flex items-center gap-1.5"><X className="h-3.5 w-3.5"/>Reject</button>
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
          <motion.div key="us" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
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
                  <motion.div key={u.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
                        <span className="text-xs font-black text-violet-300">{(u.display_name ?? u.email ?? '?')[0].toUpperCase()}</span>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5"><OnlineDot is_online={u.is_online} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">{u.email}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${PLAN_BADGE[u.plan_type] ?? PLAN_BADGE.free}`}>{u.plan_type}</span>
                        {u.is_online && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0">● Online now</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/25 flex-wrap">
                        <span className={STATUS_COLOR[u.subscription_status] ?? 'text-white/25'}>{u.subscription_status}</span>
                        <span>·</span><span>{u.trade_count} trades</span>
                        <span>·</span><span>Joined {fmtRel(u.created_at)}</span>
                        <span>·</span><span>Last seen {fmtRel(u.last_sign_in_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {u.plan_type !== 'pro'   && <button onClick={() => upgrade(u.id,'pro')}   disabled={upgrading===u.id} className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/15 disabled:opacity-40">→ Pro</button>}
                      {u.plan_type !== 'elite' && <button onClick={() => upgrade(u.id,'elite')} disabled={upgrading===u.id} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/15 disabled:opacity-40">→ Elite</button>}
                      {u.plan_type !== 'free'  && <button onClick={() => upgrade(u.id,'free')}  disabled={upgrading===u.id} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/25 text-xs font-bold hover:bg-white/[0.04] disabled:opacity-40">→ Free</button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── LIVE USERS ── */}
        {tab === 'live' && (
          <motion.div key="live" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-emerald-500/15">
              <div>
                <p className="text-sm font-black text-white flex items-center gap-2">
                  <span className="relative flex w-2.5 h-2.5">
                    <motion.span animate={{ scale:[1,1.6,1], opacity:[0.8,0,0.8] }} transition={{ duration:2, repeat:Infinity }} className="absolute inset-0 rounded-full bg-emerald-500"/>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative z-10"/>
                  </span>
                  Users Online Now
                </p>
                <p className="text-xs text-white/30 mt-0.5">Active in last 30 minutes</p>
              </div>
              <button onClick={load} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors">
                <RefreshCw className="h-3.5 w-3.5"/> Refresh
              </button>
            </div>
            {liveUsers.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                <p className="text-sm font-semibold text-white/25">No users online right now</p>
                <p className="text-xs text-white/15 mt-1">Users active in the last 30 min appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-emerald-500/10">
                {liveUsers.map((u, i) => (
                  <motion.div key={u.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
                    className="flex items-center gap-4 px-5 py-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-xs font-black text-emerald-300">{(u.display_name ?? u.email ?? '?')[0].toUpperCase()}</span>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080812]"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{u.email}</p>
                      <div className="flex items-center gap-3 text-[11px] text-white/30 mt-0.5">
                        <span className={`capitalize ${PLAN_BADGE[u.plan_type] ? 'text-violet-400' : ''}`}>{u.plan_type}</span>
                        <span>·</span><span>{u.trades} trades</span>
                        <span>·</span><span>Last seen {fmtRel(u.last_sign_in_at)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex-shrink-0">● Online</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SUPPORT ── */}
        {tab === 'support' && (
          <motion.div key="sp" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-3">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse"/>)}</div>
              : messages.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                  <p className="text-sm font-semibold text-white/25">No support messages yet</p>
                </div>
              ) : messages.map((msg, i) => (
                <motion.div key={msg.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                  className={`rounded-2xl border p-5 ${msg.status==='resolved' ? 'border-white/[0.05] bg-white/[0.01] opacity-50' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <p className="text-sm font-bold text-white">{msg.name}</p>
                        <span className="text-xs text-white/25">{msg.email}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${msg.status==='resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{msg.status}</span>
                        <span className="text-[10px] text-white/15 ml-auto">{fmtRel(msg.created_at)}</span>
                      </div>
                      <p className="text-xs font-semibold text-violet-400/60 mb-1">{msg.subject}</p>
                      <p className="text-sm text-white/45 leading-relaxed">{msg.message}</p>
                    </div>
                    {msg.status === 'open' && (
                      <button onClick={() => resolveMsg(msg.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 flex-shrink-0">
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
          <motion.div key="up" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-3">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse"/>)}</div>
              : requests.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
                  <Activity className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                  <p className="text-sm font-semibold text-white/25">No upgrade requests yet</p>
                </div>
              ) : requests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                  className={`rounded-2xl border p-5 ${req.status==='pending' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.05] bg-white/[0.01] opacity-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <p className="text-sm font-bold text-white">{req.profiles?.email ?? req.user_id?.slice(0,8)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[req.requested_plan] ?? ''}`}>→ {req.requested_plan}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${req.status==='pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : req.status==='approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{req.status}</span>
                        <span className="text-[10px] text-white/15">{fmtRel(req.created_at)}</span>
                      </div>
                      {req.payoneer_ref && <p className="text-xs text-white/35 font-mono mb-1">Ref: {req.payoneer_ref}</p>}
                      {req.user_message && <p className="text-sm text-white/40">{req.user_message}</p>}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveReq(req)} disabled={upgrading===req.id} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 disabled:opacity-40 flex items-center gap-1.5"><Check className="h-3.5 w-3.5"/>Approve</button>
                        <button onClick={() => rejectReq(req.id)} disabled={upgrading===req.id} className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/30 text-xs font-bold hover:bg-white/[0.04] disabled:opacity-40 flex items-center gap-1.5"><X className="h-3.5 w-3.5"/>Reject</button>
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
