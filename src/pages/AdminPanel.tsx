import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Shield } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

/* eslint-disable @typescript-eslint/no-explicit-any */
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

type Tab = 'overview' | 'users' | 'subscriptions' | 'audit';
type Period = 7 | 30 | 180;

type AdminUser = {
  id: string; email: string | null; name: string | null; created_at: string; last_active_at: string | null;
  plan: string; status: string; source: string; admin_override: boolean; override_expires_at: string | null;
  account_count: number; trade_count: number;
};
type Analytics = Record<string, any> & { series?: { bucket: string; total_users: number; new_users: number; trades: number; paid_activations: number }[] };
type AuditRow = { id: string; admin_email: string | null; target_email: string | null; action: string; old_value: any; new_value: any; reason: string | null; created_at: string };

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const isPaid = (u: AdminUser) => (u.plan === 'pro' || u.plan === 'elite') && (u.status === 'active' || u.status === 'trialing');

function Metric({ label, value, hint }: { label: string; value: number | string | null | undefined; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value ?? '—'}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PlanBadge({ u }: { u: Pick<AdminUser, 'plan' | 'status' | 'admin_override' | 'source'> }) {
  const paid = (u.plan === 'pro' || u.plan === 'elite') && (u.status === 'active' || u.status === 'trialing');
  if (!paid) return <Badge variant="outline" className="text-muted-foreground font-normal">No plan</Badge>;
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="outline" className={u.plan === 'elite' ? 'border-warning/40 text-warning' : 'border-primary/40 text-primary'}>
        {cap(u.plan)}{u.status === 'trialing' ? ' · Trial' : ''}
      </Badge>
      {u.admin_override && <Badge variant="outline" className="border-border text-muted-foreground font-normal">Override</Badge>}
      {u.source === 'internal' && <Badge variant="outline" className="border-border text-muted-foreground font-normal">Internal</Badge>}
    </span>
  );
}

function ChartCard({ title, data, dataKey, type = 'area', bucket }: { title: string; data: any[]; dataKey: string; type?: 'area' | 'bar'; bucket: string }) {
  const tick = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const common = { data, margin: { top: 8, right: 8, left: -20, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
      <XAxis dataKey="bucket" tickFormatter={tick} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={24} />
      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
      <Tooltip labelFormatter={(v) => `${bucket === 'week' ? 'Week of ' : ''}${tick(String(v))}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
    </>
  );
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart {...common}>{axes}<Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={1.5} /></AreaChart>
          ) : (
            <BarChart {...common}>{axes}<Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  activate_override: 'Activated manual subscription override',
  change_override: 'Changed manual override',
  remove_override: 'Removed manual override',
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [joinedFilter, setJoinedFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    rpc('is_admin').then(({ data, error }: any) => setIsAdmin(!error && Boolean(data)));
  }, [user]);

  const loadUsers = useCallback(async () => {
    const [u, a] = await Promise.all([
      rpc('admin_list_users'),
      supabase.from('admin_audit_log' as any).select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (u.error) throw u.error;
    setUsers((u.data ?? []) as AdminUser[]);
    setAudit(((a as any).data ?? []) as AuditRow[]);
  }, []);

  const load = useCallback(async () => {
    if (isAdmin !== true) return;
    setLoading(true); setError(null);
    try {
      const s = await rpc('admin_platform_analytics', { p_days: period });
      if (s.error) throw s.error;
      setStats(s.data as Analytics);
      await loadUsers();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load admin data');
    }
    setLoading(false);
  }, [isAdmin, period, loadUsers]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const days = joinedFilter === 'all' ? null : Number(joinedFilter);
    return users.filter((u) => {
      if (q && ![u.email, u.name].some((v) => v?.toLowerCase().includes(q))) return false;
      const paid = isPaid(u);
      if (planFilter === 'none' && paid) return false;
      if ((planFilter === 'pro' || planFilter === 'elite') && !(paid && u.plan === planFilter)) return false;
      if (statusFilter === 'override' && !u.admin_override) return false;
      if (statusFilter !== 'all' && statusFilter !== 'override' && u.status !== statusFilter) return false;
      if (days && now - new Date(u.created_at).getTime() > days * 86400000) return false;
      return true;
    });
  }, [users, search, planFilter, statusFilter, joinedFilter]);

  if (isAdmin === null) return <div className="py-20 text-center text-sm text-muted-foreground">Loading admin workspace…</div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-border/60 bg-card p-8 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">This area is restricted to TradeNova administrators.</p>
      </div>
    );
  }

  const series = stats?.series ?? [];
  const bucket = stats?.bucket ?? 'day';
  const subscribers = users.filter((u) => isPaid(u) && u.source !== 'internal');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">TradeNova Internal</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Platform analytics, users and manual plan overrides.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border/60 bg-card p-0.5">
          {([['overview', 'Overview'], ['users', 'Users'], ['subscriptions', 'Subscriptions'], ['audit', 'Audit Log']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
          ))}
        </div>
        {tab === 'overview' && (
          <div className="ml-auto inline-flex rounded-lg border border-border/60 bg-card p-0.5">
            {([[7, '7 Days'], [30, '30 Days'], [180, '6 Months']] as const).map(([d, label]) => (
              <button key={d} onClick={() => setPeriod(d)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${period === d ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {tab === 'overview' && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Metric label="New users" value={stats.new_users} hint={`${stats.total_users} total`} />
            <Metric label="Active users" value={stats.active_users} hint="Seen, traded or journaled" />
            <Metric label="Pro users" value={stats.pro_users} hint="Current" />
            <Metric label="Elite users" value={stats.elite_users} hint="Current" />
            <Metric label="Active paid" value={stats.active_paid_users} hint={`${stats.override_users} via override`} />
            <Metric label="New subscriptions" value={stats.new_subscriptions} hint="Dodo, in period" />
            <Metric label="Cancellations" value={stats.cancellations} hint="Dodo, in period" />
            <Metric label="Trades logged" value={stats.trades_logged} />
            <Metric label="Journal entries" value={stats.journal_entries} />
            <Metric label="Active trading accounts" value={stats.active_trading_accounts} hint="Current" />
            <Metric label="Avg trades / active user" value={stats.avg_trades_per_active_user ?? '—'} />
            <Metric label="Revenue" value="—" hint="Payment amounts aren't stored" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="User growth (total users)" data={series} dataKey="total_users" bucket={bucket} />
            <ChartCard title="Paid activations" data={series} dataKey="paid_activations" type="bar" bucket={bucket} />
            <ChartCard title="Trades logged" data={series} dataKey="trades" type="bar" bucket={bucket} />
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="rounded-xl border border-border/60 bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="h-9 pl-9" />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All plans</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="elite">Elite</SelectItem><SelectItem value="none">No plan</SelectItem></SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="trialing">Trialing</SelectItem><SelectItem value="past_due">Past due</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="override">Manual override</SelectItem></SelectContent>
            </Select>
            <Select value={joinedFilter} onValueChange={setJoinedFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Any join date</SelectItem><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="180">Last 6 months</SelectItem></SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} users</span>
          </div>
          <UserTable rows={filtered} onOpen={setSelected} />
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="rounded-xl border border-border/60 bg-card">
          <div className="border-b border-border/60 p-3 text-sm font-medium">Paid users <span className="text-muted-foreground font-normal">· {subscribers.length}</span></div>
          <UserTable rows={subscribers} onOpen={setSelected} showSource />
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
          {audit.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No admin actions recorded yet.</div>}
          {audit.map((a) => (
            <div key={a.id} className="grid gap-1 p-3 text-sm md:grid-cols-[150px_1fr_auto] md:items-center">
              <span className="text-xs text-muted-foreground tabular-nums">{fmtDateTime(a.created_at)}</span>
              <div className="min-w-0">
                <p className="text-foreground">{ACTION_LABEL[a.action] ?? a.action} — <span className="text-muted-foreground">{a.target_email ?? '—'}</span></p>
                <p className="text-xs text-muted-foreground">
                  {cap(a.old_value?.plan)} ({a.old_value?.source ?? '—'}) → {cap(a.new_value?.plan)} ({a.new_value?.source ?? '—'})
                  {a.new_value?.expires_at ? ` · expires ${fmtDate(a.new_value.expires_at)}` : ''}
                  {a.reason ? ` · “${a.reason}”` : ''}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">by {a.admin_email ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      <UserDetailDialog userId={selected} onClose={() => setSelected(null)} onChanged={() => void loadUsers()} />
    </div>
  );
}

function UserTable({ rows, onOpen, showSource }: { rows: AdminUser[]; onOpen: (id: string) => void; showSource?: boolean }) {
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Plan</th>
            <th className="px-3 py-2 font-medium">Status</th>
            {showSource && <th className="px-3 py-2 font-medium">Source</th>}
            <th className="px-3 py-2 font-medium">Joined</th>
            <th className="px-3 py-2 font-medium">Last active</th>
            <th className="px-3 py-2 font-medium text-right">Accounts</th>
            <th className="px-3 py-2 font-medium text-right">Trades</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} onClick={() => onOpen(u.id)} className="cursor-pointer border-t border-border/40 transition-colors hover:bg-secondary/40">
              <td className="px-3 py-2.5 max-w-[260px]">
                <p className="truncate font-medium text-foreground">{u.name || '—'}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </td>
              <td className="px-3 py-2.5"><PlanBadge u={u} /></td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{cap(u.status.replace('_', ' '))}</td>
              {showSource && <td className="px-3 py-2.5 text-xs text-muted-foreground">{u.source === 'admin_override' ? `Override${u.override_expires_at ? ` until ${fmtDate(u.override_expires_at)}` : ''}` : cap(u.source)}</td>}
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.created_at)}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.last_active_at)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{u.account_count}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{u.trade_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right text-foreground">{value}</span></div>;
}

function UserDetailDialog({ userId, onClose, onChanged }: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<any>(null);
  const [plan, setPlan] = useState<'pro' | 'elite'>('pro');
  const [expires, setExpires] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchDetail = useCallback(async (id: string) => {
    const { data, error } = await rpc('admin_user_detail', { p_user_id: id });
    if (error) { toast.error(error.message); return; }
    setD(data);
    const p = data?.plan_info?.plan;
    setPlan(p === 'elite' ? 'elite' : 'pro');
    setExpires(data?.plan_info?.override_expires_at ? String(data.plan_info.override_expires_at).slice(0, 10) : '');
  }, []);

  useEffect(() => { setD(null); setReason(''); if (userId) void fetchDetail(userId); }, [userId, fetchDetail]);

  const apply = async () => {
    if (!userId) return;
    setBusy(true);
    const { error } = await rpc('admin_set_plan', {
      p_user_id: userId, p_plan: plan,
      p_expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      p_reason: reason || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${plan === 'elite' ? 'Elite' : 'Pro'} access activated`);
    setReason(''); await fetchDetail(userId); onChanged();
  };

  const remove = async () => {
    if (!userId) return;
    setBusy(true);
    const { error } = await rpc('admin_remove_override', { p_user_id: userId, p_reason: reason || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Manual override removed');
    setReason(''); await fetchDetail(userId); onChanged();
  };

  const pi = d?.plan_info;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{d?.name || d?.email || 'User'}</DialogTitle></DialogHeader>
        {!d ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Account</p>
              <Row label="Email" value={<span className="break-all">{d.email ?? '—'}</span>} />
              <Row label="Joined" value={fmtDate(d.created_at)} />
              <Row label="Last active" value={fmtDate(d.last_active_at)} />
              <Row label="Current plan" value={<PlanBadge u={{ plan: pi?.plan, status: pi?.status, admin_override: pi?.admin_override, source: pi?.source }} />} />
              <Row label="Subscription state" value={cap(pi?.status?.replace('_', ' '))} />
              <Row label="Source" value={pi?.source === 'admin_override' ? 'Manual override' : cap(pi?.source)} />
              {pi?.admin_override && <Row label="Override expires" value={pi.override_expires_at ? fmtDate(pi.override_expires_at) : 'Never'} />}
              {d.billing && <Row label="Dodo record" value={`${cap(d.billing.plan)} · ${d.billing.status}`} />}
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Activity</p>
              <Row label="Trades" value={d.trade_count} />
              <Row label="Trades (last 30 days)" value={d.trades_30d} />
              <Row label="Last trade" value={fmtDate(d.last_trade_at)} />
              <Row label="Journal entries" value={d.journal_count} />
              <Row label="Last journal" value={fmtDate(d.last_journal_at)} />
              <Row label="Daily plans" value={d.plan_count} />
              <Row label="Trading accounts" value={d.account_count} />
            </div>
            <div className="md:col-span-2 rounded-lg border border-border/60 p-3 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Manual plan override</p>
              {pi?.source === 'internal' && <p className="text-xs text-muted-foreground">This account has internal access (always Elite); overrides don't change it.</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Plan</label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as 'pro' | 'elite')}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pro">Pro</SelectItem><SelectItem value="elite">Elite</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Expires (optional)</label>
                  <Input type="date" min={today} value={expires} onChange={(e) => setExpires(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Reason (optional)</label>
                  <Textarea rows={1} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-9 py-2" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={apply} disabled={busy}>{pi?.admin_override ? 'Change plan' : `Activate ${plan === 'elite' ? 'Elite' : 'Pro'}`}</Button>
                {pi?.admin_override && <Button size="sm" variant="outline" onClick={remove} disabled={busy}>Remove override</Button>}
              </div>
              <p className="text-[11px] text-muted-foreground">Overrides are stored separately from Dodo billing data and are recorded in the audit log.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
