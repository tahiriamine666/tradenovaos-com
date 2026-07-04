// Multi-platform Trading Accounts settings section.
// Uses the platform adapter registry — no hardcoded MT5 assumptions.

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Wallet, Plus, Pencil, Trash2, Star, StarOff, Loader2,
  CheckCircle2, XCircle, CircleDashed, ArrowLeft, RefreshCw,
} from 'lucide-react';
import {
  PLATFORMS, buildRecord, getPlatform, summarizeAccount, toFormValues,
  type FormValues,
} from '@/lib/platforms';
import type { PlatformAdapter, PlatformId, TradingAccountRecord } from '@/lib/platforms/types';

type Status = TradingAccountRecord['status'];

function planLimit(isElite: boolean, isPro: boolean): number {
  if (isElite) return Infinity;
  if (isPro) return 3;
  return 1;
}

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

export default function TradingAccountsSection() {
  const { user } = useAuth();
  const { isPro, isElite, plan } = usePlan();
  const { refresh: refreshActive, setActiveAccountId } = useActiveAccount();
  const limit = planLimit(isElite, isPro);

  const [accounts, setAccounts] = useState<TradingAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'platform' | 'form'>('platform');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformAdapter | null>(null);
  const [editing, setEditing] = useState<TradingAccountRecord | null>(null);
  const [accountName, setAccountName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradingAccountRecord | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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

  const resetDialog = () => {
    setStep('platform');
    setSelectedPlatform(null);
    setEditing(null);
    setAccountName('');
    setIsDefault(false);
    setValues({});
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
    resetDialog();
    setIsDefault(accounts.length === 0);
    setDialogOpen(true);
  };

  const openEdit = (a: TradingAccountRecord) => {
    const adapter = getPlatform(a.platform);
    if (!adapter) return;
    resetDialog();
    setEditing(a);
    setSelectedPlatform(adapter);
    setAccountName(a.account_name);
    setIsDefault(a.is_default);
    setValues(toFormValues(adapter, a));
    setStep('form');
    setDialogOpen(true);
  };

  const pickPlatform = (p: PlatformAdapter) => {
    setSelectedPlatform(p);
    setValues({});
    setStep('form');
  };

  const handleSave = async () => {
    if (!user || !selectedPlatform) return;
    if (!accountName.trim()) {
      toast({ title: 'Missing name', description: 'Give the account a name.', variant: 'destructive' });
      return;
    }
    const missing = selectedPlatform.fields.find(f => f.required && !(values[f.key] ?? '').toString().trim());
    if (missing) {
      toast({ title: 'Missing field', description: `${missing.label} is required.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const rec = buildRecord(selectedPlatform, values);
    const payload = {
      user_id: user.id,
      account_name: accountName.trim(),
      is_default: isDefault,
      status: 'disconnected' as Status,
      ...rec,
    };

    const { data: saved, error } = editing
      ? await supabase.from('trading_accounts').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('trading_accounts').insert(payload).select().single();

    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Account updated' : 'Account added' });
      setDialogOpen(false);
      resetDialog();
      await load();
      await refreshActive();
      if (saved?.id) setActiveAccountId(saved.id);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('trading_accounts').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Account deleted' });
      await load();
      await refreshActive();
    }
    setDeleteTarget(null);
  };

  const setDefault = async (a: TradingAccountRecord) => {
    const { error } = await supabase
      .from('trading_accounts').update({ is_default: true }).eq('id', a.id);
    if (error) {
      toast({ title: 'Could not set default', description: error.message, variant: 'destructive' });
    } else {
      await load();
      await refreshActive();
      setActiveAccountId(a.id);
    }
  };

  const limitLabel = isElite ? 'Unlimited' : `${accounts.length}/${limit}`;

  const grouped = useMemo(() => {
    const out = new Map<PlatformId, TradingAccountRecord[]>();
    for (const a of accounts) {
      const key = a.platform as PlatformId;
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(a);
    }
    return out;
  }, [accounts]);

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
                  Connect broker accounts across MT5, cTrader, DXtrade, TradeLocker &amp; Alpha Trader · {limitLabel}
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
                Add your first broker account to get started.
              </p>
            </div>
          ) : (
            [...grouped.entries()].map(([platform, rows]) => {
              const adapter = getPlatform(platform);
              return (
                <div key={platform} className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {adapter?.icon} {adapter?.label ?? platform}
                  </p>
                  {rows.map(a => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm truncate">{a.account_name}</p>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {adapter?.label ?? a.platform}
                          </Badge>
                          {a.is_default && (
                            <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0">
                              <Star className="h-3 w-3 mr-0.5 fill-current" /> Default
                            </Badge>
                          )}
                          <StatusPill status={a.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {summarizeAccount(a) || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
                  ))}
                </div>
              );
            })
          )}

          {!isElite && accounts.length >= limit && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              You've reached your plan limit. Upgrade to {isPro ? 'Elite for unlimited accounts' : 'Pro for up to 3 accounts'}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit trading account' : step === 'platform' ? 'Choose a platform' : `Connect ${selectedPlatform?.label}`}
            </DialogTitle>
            <DialogDescription>
              {step === 'platform'
                ? 'Select the broker platform you want to connect.'
                : 'Your credentials are stored securely and only visible to you.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'platform' && !editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickPlatform(p)}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-all"
                >
                  <span className="text-2xl leading-none">{p.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'form' && selectedPlatform && (
            <div className="space-y-3">
              {!editing && (
                <button
                  onClick={() => { setStep('platform'); setSelectedPlatform(null); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Change platform
                </button>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Account Name</Label>
                <Input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Main Funded Account"
                />
              </div>
              {selectedPlatform.fields.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}{f.required && ' *'}</Label>
                  <Input
                    type={f.type === 'password' ? 'password' : 'text'}
                    value={values[f.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-border"
                />
                Set as default account
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetDialog(); }} disabled={saving}>
              Cancel
            </Button>
            {step === 'form' && (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Save changes' : 'Add account'}
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
