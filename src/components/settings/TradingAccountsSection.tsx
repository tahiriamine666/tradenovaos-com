// Smart account connection flow: account type → platform → credentials → live sync.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Wallet, Plus, Pencil, Trash2, Star, StarOff, Loader2, Building2, Trophy,
  CheckCircle2, XCircle, CircleDashed, ArrowLeft, RefreshCw, Search, ShieldCheck,
} from 'lucide-react';
import type { TradingAccountRecord } from '@/lib/platforms/types';
import {
  providersFor, suggestServers, findProvider, formatAccountSize,
  type AccountType, type MtPlatform, type ProviderDef,
} from '@/lib/platforms/providers';

type Status = TradingAccountRecord['status'];

function planLimit(isElite: boolean, isPro: boolean): number {
  if (isElite) return Infinity;
  if (isPro) return 3;
  return 1;
}

const money = (v: number | null | undefined, currency?: string | null) =>
  v == null ? '—' : `${currency === 'EUR' ? '€' : '$'}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: React.ElementType; cls: string }> = {
    connected:    { label: 'Connected',    icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    syncing:      { label: 'Syncing',      icon: RefreshCw,    cls: 'bg-primary/10 text-primary border-primary/20' },
    disconnected: { label: 'Disconnected', icon: CircleDashed, cls: 'bg-muted text-muted-foreground border-border' },
    error:        { label: 'Error',        icon: XCircle,      cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };
  const { label, icon: Icon, cls } = map[status] ?? map.disconnected;
  return (
    <Badge variant="outline" className={`gap-1 border ${cls}`}>
      <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}

const PLATFORM_CARDS: { id: MtPlatform; label: string; desc: string; icon: string }[] = [
  { id: 'mt5', label: 'MetaTrader 5', desc: 'Multi-asset · most prop firms', icon: '📈' },
  { id: 'mt4', label: 'MetaTrader 4', desc: 'Classic FX & CFD platform',      icon: '📊' },
];

export default function TradingAccountsSection() {
  const { user } = useAuth();
  const { isPro, isElite, plan } = usePlan();
  const { refresh: refreshActive, setActiveAccountId } = useActiveAccount();
  const limit = planLimit(isElite, isPro);

  const [accounts, setAccounts] = useState<TradingAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Wizard state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [platform, setPlatform] = useState<MtPlatform | null>(null);
  const [provider, setProvider] = useState<ProviderDef | null>(null);
  const [providerQuery, setProviderQuery] = useState('');
  const [accountName, setAccountName] = useState('');
  const [server, setServer] = useState('');
  const [serverOpen, setServerOpen] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [editing, setEditing] = useState<TradingAccountRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradingAccountRecord | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Failed to load accounts', description: error.message, variant: 'destructive' });
    } else {
      setAccounts((data ?? []) as unknown as TradingAccountRecord[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Poll while any account is syncing (MetaApi deployment takes ~1 min).
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    const anySyncing = accounts.some(a => a.status === 'syncing');
    if (!anySyncing) { if (pollRef.current) window.clearInterval(pollRef.current); return; }
    pollRef.current = window.setInterval(() => { void load(); }, 15000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [accounts, load]);

  const resetWizard = () => {
    setStep(1); setAccountType(null); setPlatform(null); setProvider(null);
    setProviderQuery(''); setAccountName(''); setServer(''); setLogin('');
    setPassword(''); setEditing(null); setServerOpen(false);
  };

  const openAdd = () => {
    if (accounts.length >= limit) {
      toast({
        title: 'Account limit reached',
        description: `Your ${plan} plan allows ${limit} trading account${limit === 1 ? '' : 's'}. Upgrade to add more.`,
        variant: 'destructive',
      });
      return;
    }
    resetWizard();
    setIsDefault(accounts.length === 0);
    setDialogOpen(true);
  };

  const openEdit = (a: TradingAccountRecord) => {
    resetWizard();
    setEditing(a);
    setAccountType((a.account_type as AccountType) ?? 'broker');
    setPlatform(a.platform === 'mt4' ? 'mt4' : 'mt5');
    setProvider(findProvider(a.firm ?? a.broker) ?? null);
    setProviderQuery(a.firm ?? a.broker ?? '');
    setAccountName(a.account_name);
    setServer(a.server ?? '');
    setLogin(a.account_number ?? a.login ?? '');
    setPassword('');
    setIsDefault(a.is_default);
    setStep(3);
    setDialogOpen(true);
  };

  const providerOptions = useMemo(() => {
    if (!accountType) return [];
    const list = providersFor(accountType);
    const q = providerQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) || p.aliases?.some(a => a.includes(q)));
  }, [accountType, providerQuery]);

  const serverOptions = useMemo(() => suggestServers(server, provider), [server, provider]);

  const connect = async () => {
    if (!user || !platform || !accountType) return;
    if (!accountName.trim() || !login.trim() || !server.trim() || (!editing && !password.trim())) {
      toast({ title: 'Missing information', description: 'Name, firm/broker, server, login and investor password are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const firmName = provider?.name ?? providerQuery.trim() || null;
    const payload: Record<string, unknown> = {
      user_id: user.id,
      account_name: accountName.trim(),
      account_type: accountType,
      platform,
      firm: accountType === 'prop_firm' ? firmName : null,
      broker: accountType === 'broker' ? firmName : firmName,
      server: server.trim(),
      account_number: login.trim(),
      login: login.trim(),
      is_default: isDefault,
      status: 'syncing' as Status,
    };
    if (password.trim()) {
      payload.password = password.trim();
      payload.credentials = { password: password.trim() };
      payload.metaapi_account_id = null; // re-provision when credentials change
    }

    const { data: saved, error } = editing
      ? await supabase.from('trading_accounts').update(payload as never).eq('id', editing.id).select().single()
      : await supabase.from('trading_accounts').insert(payload as never).select().single();

    if (error || !saved) {
      toast({ title: 'Could not save account', description: error?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    resetWizard();
    await load();
    await refreshActive();
    setActiveAccountId(saved.id);
    setSaving(false);
    toast({ title: 'Connecting…', description: 'Verifying credentials and pulling live account data.' });

    setSyncingId(saved.id);
    const { data: res, error: fnErr } = await supabase.functions.invoke('mt-connect', {
      body: { account_id: saved.id },
    });
    setSyncingId(null);
    await load();
    await refreshActive();

    if (fnErr || (res as { error?: string })?.error) {
      toast({
        title: 'Connection failed',
        description: (res as { error?: string })?.error ?? fnErr?.message ?? 'Check your login, server and investor password.',
        variant: 'destructive',
      });
    } else if ((res as { status?: string })?.status === 'syncing') {
      toast({ title: 'Account deploying', description: 'This takes about a minute — data will appear automatically.' });
    } else {
      toast({ title: 'Account connected', description: 'Live balance and trade history imported.' });
    }
  };

  const syncNow = async (a: TradingAccountRecord) => {
    setSyncingId(a.id);
    const { data: res, error } = await supabase.functions.invoke(
      a.metaapi_account_id ? 'mt-sync' : 'mt-connect',
      { body: { account_id: a.id } },
    );
    setSyncingId(null);
    await load();
    await refreshActive();
    if (error || (res as { error?: string })?.error) {
      toast({
        title: 'Sync failed',
        description: (res as { error?: string })?.error ?? error?.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Account synced' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('trading_accounts').delete().eq('id', deleteTarget.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Account deleted' });
      await load();
      await refreshActive();
    }
    setDeleteTarget(null);
  };

  const setDefault = async (a: TradingAccountRecord) => {
    const { error } = await supabase.from('trading_accounts').update({ is_default: true }).eq('id', a.id);
    if (error) toast({ title: 'Could not set default', description: error.message, variant: 'destructive' });
    else { await load(); await refreshActive(); setActiveAccountId(a.id); }
  };

  const limitLabel = isElite ? 'Unlimited' : `${accounts.length}/${limit}`;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-base">Trading Accounts</CardTitle>
                <CardDescription className="text-xs">
                  Connect MT4 / MT5 broker &amp; prop-firm accounts for live sync · {limitLabel}
                </CardDescription>
              </div>
            </div>
            <Button size="sm" className="rounded-lg" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Account
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed border-border">
              <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">No trading accounts yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your broker or prop-firm account to auto-populate your dashboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {accounts.map(a => {
                const ch = (a.challenge ?? {}) as Record<string, number | string>;
                const met = (a.metrics ?? {}) as Record<string, number | string>;
                const profitPct = typeof ch.profit_pct === 'number' ? ch.profit_pct : null;
                return (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm truncate">{a.account_name}</p>
                          {a.is_default && (
                            <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0">
                              <Star className="h-3 w-3 mr-0.5 fill-current" /> Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {[
                            a.platform?.toUpperCase(),
                            a.firm || a.broker,
                            a.account_number || a.login,
                            a.server,
                          ].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <StatusPill status={a.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
                        <p className="text-sm font-semibold text-foreground">{money(a.balance, a.currency)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Equity</p>
                        <p className="text-sm font-semibold text-foreground">{money(a.equity, a.currency)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Profit</p>
                        <p className={`text-sm font-semibold ${(profitPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {profitPct == null ? '—' : `${profitPct >= 0 ? '+' : ''}${profitPct}%`}
                        </p>
                      </div>
                    </div>

                    {typeof ch.account_size === 'number' && (
                      <div className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            {ch.firm} {formatAccountSize(ch.account_size as number)} · {ch.phase}
                          </span>
                          <span className="text-muted-foreground">
                            DD {ch.daily_drawdown_pct}% / {ch.max_drawdown_pct}% · Target {ch.profit_target_pct}%
                          </span>
                        </div>
                        <Progress value={Number(ch.progress_pct ?? 0)} className="h-1.5" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-muted-foreground">
                        {a.sync_error
                          ? <span className="text-red-500">{a.sync_error}</span>
                          : a.last_synced_at
                            ? `Synced ${new Date(a.last_synced_at).toLocaleString()} · ${met.trades ?? 0} trades`
                            : 'Never synced'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon" variant="ghost" title="Sync now"
                          disabled={syncingId === a.id} onClick={() => syncNow(a)}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncingId === a.id ? 'animate-spin' : ''}`} />
                        </Button>
                        {!a.is_default && (
                          <Button size="icon" variant="ghost" title="Set as default" onClick={() => setDefault(a)}>
                            <StarOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" title="Delete"
                          onClick={() => setDeleteTarget(a)}
                          className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isElite && accounts.length >= limit && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              You've reached your plan limit. Upgrade to {isPro ? 'Elite for unlimited accounts' : 'Pro for up to 3 accounts'}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Wizard */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetWizard(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit trading account'
                : step === 1 ? 'What type of account?'
                : step === 2 ? 'Select your platform'
                : 'Account information'}
            </DialogTitle>
            <DialogDescription>
              {step === 1 ? 'Choose whether this is a personal broker account or a prop-firm account.'
                : step === 2 ? 'Only MetaTrader accounts support live sync today.'
                : 'We use your investor (read-only) password. Credentials are private to your account.'}
            </DialogDescription>
          </DialogHeader>

          {!editing && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          )}

          {step === 1 && !editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { id: 'broker' as AccountType, label: 'Broker Account', icon: Building2,
                  examples: 'IC Markets · Pepperstone · Exness · OANDA' },
                { id: 'prop_firm' as AccountType, label: 'Prop Firm Account', icon: Trophy,
                  examples: 'FTMO · Goat Funded · Alpha Capital · The5ers' },
              ]).map(o => (
                <button
                  key={o.id}
                  onClick={() => { setAccountType(o.id); setProvider(null); setProviderQuery(''); setStep(2); }}
                  className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/60 hover:bg-muted/40 transition-all"
                >
                  <o.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-semibold text-foreground">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{o.examples}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && !editing && (
            <div className="space-y-3">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORM_CARDS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPlatform(p.id); setStep(3); }}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      platform === p.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/60 hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <p className="text-sm font-semibold text-foreground mt-2">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {!editing && (
                <button onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Account Name *</Label>
                <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="My 100K Challenge" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{accountType === 'prop_firm' ? 'Prop Firm' : 'Broker'} *</Label>
                <Input
                  value={providerQuery}
                  onChange={e => { setProviderQuery(e.target.value); setProvider(null); }}
                  placeholder={accountType === 'prop_firm' ? 'Goat Funded Trader' : 'IC Markets'}
                />
                {!provider && providerOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {providerOptions.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setProvider(p); setProviderQuery(p.name); if (!server) setServer(''); }}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Platform *</Label>
                <div className="flex gap-2">
                  {PLATFORM_CARDS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        platform === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <Label className="text-xs">Server *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={server}
                    onChange={e => { setServer(e.target.value); setServerOpen(true); }}
                    onFocus={() => setServerOpen(true)}
                    placeholder="Search server…"
                  />
                </div>
                {serverOpen && serverOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {serverOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setServer(s); setServerOpen(false); }}
                        className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Account Number (Login) *</Label>
                <Input value={login} onChange={e => setLogin(e.target.value)} placeholder="12345678" inputMode="numeric" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Investor Password {editing ? '' : '*'}</Label>
                <Input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editing ? 'Leave blank to keep current password' : '••••••••'}
                />
                <p className="text-[10px] text-muted-foreground">
                  Use the read-only investor password — TradeNova never places trades.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-border"
                />
                Set as default account
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetWizard(); }} disabled={saving}>
              Cancel
            </Button>
            {step === 3 && (
              <Button onClick={connect} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Save & reconnect' : 'Connect Account'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.account_name}</strong> and its stored credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-500/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
