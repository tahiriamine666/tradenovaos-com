import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
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
  Wallet, Plus, Pencil, Trash2, Star, StarOff, Server, Loader2,
  CheckCircle2, XCircle, CircleDashed,
} from 'lucide-react';

type Status = 'connected' | 'connecting' | 'failed' | 'disconnected';

interface TradingAccount {
  id: string;
  user_id: string;
  account_name: string;
  login: string;
  password: string;
  server: string;
  platform: string;
  status: Status;
  is_default: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  account_name: string;
  login: string;
  password: string;
  server: string;
  platform: string;
  is_default: boolean;
}

const EMPTY_FORM: FormState = {
  account_name: '',
  login: '',
  password: '',
  server: '',
  platform: 'MT5',
  is_default: false,
};

function planLimit(isElite: boolean, isPro: boolean): number {
  if (isElite) return Infinity;
  if (isPro) return 3;
  return 1;
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: React.ElementType; cls: string }> = {
    connected:    { label: 'Connected',    icon: CheckCircle2, cls: 'bg-green-500/10 text-green-600 border-green-500/20' },
    connecting:   { label: 'Connecting',   icon: Loader2,      cls: 'bg-primary/10 text-primary border-primary/20' },
    failed:       { label: 'Failed',       icon: XCircle,      cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
    disconnected: { label: 'Disconnected', icon: CircleDashed, cls: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <Badge variant="outline" className={`gap-1 border ${cls}`}>
      <Icon className={`h-3 w-3 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}

export default function TradingAccountsSection() {
  const { user } = useAuth();
  const { isPro, isElite, plan } = usePlan();
  const limit = planLimit(isElite, isPro);

  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TradingAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradingAccount | null>(null);

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
      setAccounts((data ?? []) as TradingAccount[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    if (accounts.length >= limit) {
      toast({
        title: 'Account limit reached',
        description: `Your ${plan} plan allows ${limit} trading account${limit === 1 ? '' : 's'}. Upgrade to add more.`,
        variant: 'destructive',
      });
      return;
    }
    setEditing(null);
    setForm({ ...EMPTY_FORM, is_default: accounts.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (a: TradingAccount) => {
    setEditing(a);
    setForm({
      account_name: a.account_name,
      login: a.login,
      password: a.password,
      server: a.server,
      platform: a.platform,
      is_default: a.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.account_name.trim() || !form.login.trim() || !form.password || !form.server.trim()) {
      toast({ title: 'Missing fields', description: 'Fill in name, login, password and server.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from('trading_accounts')
        .update({
          account_name: form.account_name.trim(),
          login: form.login.trim(),
          password: form.password,
          server: form.server.trim(),
          platform: form.platform,
          is_default: form.is_default,
        })
        .eq('id', editing.id);
      if (error) {
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Account updated' });
        setDialogOpen(false);
        await load();
      }
    } else {
      const { error } = await supabase.from('trading_accounts').insert({
        user_id: user.id,
        account_name: form.account_name.trim(),
        login: form.login.trim(),
        password: form.password,
        server: form.server.trim(),
        platform: form.platform,
        is_default: form.is_default,
        status: 'disconnected',
      });
      if (error) {
        toast({ title: 'Could not add account', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Account added' });
        setDialogOpen(false);
        await load();
      }
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
    }
    setDeleteTarget(null);
  };

  const setDefault = async (a: TradingAccount) => {
    const { error } = await supabase
      .from('trading_accounts')
      .update({ is_default: true })
      .eq('id', a.id);
    if (error) {
      toast({ title: 'Could not set default', description: error.message, variant: 'destructive' });
    } else {
      await load();
    }
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
                  Connect your MT5 accounts · {limitLabel}
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
                Add your first MT5 account to get started.
              </p>
            </div>
          ) : (
            accounts.map(a => (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm truncate">{a.account_name}</p>
                    <Badge variant="secondary" className="text-[10px] h-5">{a.platform}</Badge>
                    {a.is_default && (
                      <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0">
                        <Star className="h-3 w-3 mr-0.5 fill-current" /> Default
                      </Badge>
                    )}
                    <StatusPill status={a.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Server className="h-3 w-3" /> {a.server}
                    </span>
                    <span>Login: {a.login}</span>
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
                    size="icon"
                    variant="ghost"
                    title="Delete"
                    onClick={() => setDeleteTarget(a)}
                    className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {!isElite && accounts.length >= limit && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              You've reached your plan limit. Upgrade to {isPro ? 'Elite for unlimited accounts' : 'Pro for up to 3 accounts'}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit trading account' : 'Add trading account'}</DialogTitle>
            <DialogDescription>
              Your credentials are stored securely and only visible to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Name</Label>
              <Input
                value={form.account_name}
                onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                placeholder="Main Funded Account"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Login</Label>
                <Input
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 h-10"
                >
                  <option value="MT5">MT5</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Investor or master password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Server</Label>
              <Input
                value={form.server}
                onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
                placeholder="ICMarkets-Live02"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="rounded border-border"
              />
              Set as default account
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Add account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
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
