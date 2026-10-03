import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Tab = 'overview' | 'users' | 'live';

type AdminStats = {
  total_users?: number;
  total_trades?: number;
  total_journals?: number;
  total_playbooks?: number;
  new_users?: number;
  new_trades?: number;
  active_users?: number;
  no_plan_users?: number;
  pro_users?: number;
  elite_users?: number;
  active_subscriptions?: number;
};

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  plan_type: 'pro' | 'elite' | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  is_online: boolean | null;
  trade_count: number | null;
  journal_count: number | null;
  playbook_count: number | null;
  last_trade_at: string | null;
};

type LiveUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan_type: 'pro' | 'elite' | null;
  last_sign_in_at: string | null;
  trades: number | null;
};

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PlanBadge({ plan, status }: { plan: AdminUser['plan_type']; status?: string | null }) {
  if (!plan || !['active', 'trialing'].includes(status ?? '')) {
    return <Badge variant="outline" className="text-muted-foreground">No active plan</Badge>;
  }
  return (
    <Badge variant="outline" className={plan === 'elite' ? 'border-amber-500/30 text-amber-500' : 'border-primary/30 text-primary'}>
      {plan === 'elite' ? 'Elite' : 'Pro'}{status === 'trialing' ? ' · Trial' : ''}
    </Badge>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (error) {
        console.error('[AdminPanel] is_admin failed', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
    });
  }, [user]);

  const load = useCallback(async () => {
    if (!user || isAdmin !== true) return;
    setLoading(true);
    setError(null);

    const [statsRes, usersRes, liveRes] = await Promise.all([
      supabase.rpc('get_admin_analytics', { days_back: period }),
      supabase.rpc('get_admin_users_list'),
      supabase.rpc('get_active_users_now'),
    ]);

    const firstError = statsRes.error ?? usersRes.error ?? liveRes.error;
    if (firstError) {
      console.error('[AdminPanel] load failed', firstError);
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setStats((statsRes.data ?? {}) as AdminStats);
    setUsers(((usersRes.data ?? []) as unknown) as AdminUser[]);
    setLiveUsers(((liveRes.data ?? []) as unknown) as LiveUser[]);
    setLoading(false);
  }, [user, isAdmin, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.display_name, u.full_name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [users, search]);

  if (isAdmin === null || (isAdmin && loading && !stats)) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading admin workspace…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Admin access required</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">TradeNova Internal</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Operational visibility only. Billing remains controlled by Dodo Payments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ['overview', 'Overview'],
          ['users', 'Users'],
          ['live', 'Live'],
        ] as const).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={period === d ? 'secondary' : 'ghost'} onClick={() => setPeriod(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Users" value={stats?.total_users ?? 0} hint={`+${stats?.new_users ?? 0} in selected period`} />
            <Metric label="Trades" value={stats?.total_trades ?? 0} hint={`+${stats?.new_trades ?? 0} in selected period`} />
            <Metric label="Active Dodo" value={stats?.active_subscriptions ?? 0} hint="Active + trialing" />
            <Metric label="Active traders" value={stats?.active_users ?? 0} hint="Users with trades in period" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Pro" value={stats?.pro_users ?? 0} />
            <Metric label="Elite" value={stats?.elite_users ?? 0} />
            <Metric label="No active plan" value={stats?.no_plan_users ?? 0} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Journal entries" value={stats?.total_journals ?? 0} />
            <Metric label="Playbooks" value={stats?.total_playbooks ?? 0} />
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <Users className="h-4 w-4 text-primary" />
            <div className="font-medium">Users</div>
            <div className="relative ml-auto w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="pl-9" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredUsers.map((u) => (
              <div key={u.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{u.display_name || u.full_name || u.email || 'User'}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <PlanBadge plan={u.plan_type} status={u.subscription_status} />
                <div className="text-xs text-muted-foreground md:text-right">
                  <div>{u.trade_count ?? 0} trades · {u.journal_count ?? 0} journals</div>
                  <div>{u.last_sign_in_at ? `Last sign-in ${new Date(u.last_sign_in_at).toLocaleDateString()}` : 'No sign-in yet'}</div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>}
          </div>
        </div>
      )}

      {tab === 'live' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <Activity className="h-4 w-4 text-primary" />
            <div className="font-medium">Active in the last 30 minutes</div>
            <Badge variant="outline" className="ml-auto">{liveUsers.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {liveUsers.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">{u.display_name || u.email || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PlanBadge plan={u.plan_type} status="active" />
                  <span className="text-xs text-muted-foreground">{u.trades ?? 0} trades</span>
                </div>
              </div>
            ))}
            {liveUsers.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No recently active users.</div>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        Subscription state is read-only here and comes from Dodo Payments.
      </div>
    </div>
  );
}
