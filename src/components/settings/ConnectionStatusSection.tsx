// Connection Status: live MetaApi state for every connected trading account.
// All values come from the last MetaApi sync — nothing here is simulated.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Activity, RefreshCw, PlugZap, Loader2, CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import type { TradingAccountRecord } from '@/lib/platforms/types';
import ConnectionDiagnostics, { initialSteps, mergeSteps, type DiagStep } from './ConnectionDiagnostics';

type Status = TradingAccountRecord['status'];

const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ElementType }> = {
  connected:    { label: 'Connected',    cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  connecting:   { label: 'Connecting',   cls: 'bg-primary/10 text-primary border-primary/20',             icon: RefreshCw },
  pending:      { label: 'Pending',      cls: 'bg-muted text-muted-foreground border-border',             icon: CircleDashed },
  disconnected: { label: 'Disconnected', cls: 'bg-muted text-muted-foreground border-border',             icon: CircleDashed },
  error:        { label: 'Error',        cls: 'bg-red-500/10 text-red-500 border-red-500/20',             icon: XCircle },
};

const money = (v: number | null | undefined, currency?: string | null) =>
  v == null ? '—' : `${currency === 'EUR' ? '€' : '$'}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium text-foreground mt-0.5 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

export default function ConnectionStatusSection() {
  const { user } = useAuth();
  const { refresh: refreshActive } = useActiveAccount();
  const [accounts, setAccounts] = useState<TradingAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [diagOpen, setDiagOpen] = useState(false);
  const [diagTitle, setDiagTitle] = useState('');
  const [steps, setSteps] = useState<DiagStep[]>(initialSteps());
  const [running, setRunning] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) toast({ title: 'Failed to load connection status', description: error.message, variant: 'destructive' });
    else setAccounts((data ?? []) as unknown as TradingAccountRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const run = async (a: TradingAccountRecord, mode: 'sync' | 'reconnect') => {
    setBusyId(a.id);
    setDiagTitle(`${mode === 'sync' ? 'Syncing' : 'Reconnecting'} · ${a.account_name}`);
    setDiagError(null);
    setSteps(mergeSteps([{ id: 'db_saved', label: 'Account saved to database', status: 'ok', detail: a.account_name }], false));
    setRunning(true);
    setDiagOpen(true);

    const fn = mode === 'reconnect' || !a.metaapi_account_id ? 'mt-connect' : 'mt-sync';
    const { data, error } = await supabase.functions.invoke(fn, { body: { account_id: a.id } });

    const payload = (data ?? {}) as {
      steps?: DiagStep[]; error?: string;
      results?: { account_id: string; steps?: DiagStep[]; error?: string }[];
    };
    const result = payload.results?.find(r => r.account_id === a.id);
    const serverSteps = result?.steps ?? payload.steps;
    const failure = result?.error ?? payload.error ?? error?.message ?? null;

    setSteps(mergeSteps(serverSteps, true, failure ?? undefined));
    setDiagError(failure);
    setRunning(false);
    setBusyId(null);
    await load();
    await refreshActive();

    if (failure) toast({ title: mode === 'sync' ? 'Sync failed' : 'Reconnect failed', description: failure, variant: 'destructive' });
    else toast({ title: mode === 'sync' ? 'Account synced' : 'Account reconnected' });
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading text-base">Connection Status</CardTitle>
              <CardDescription className="text-xs">Live MetaApi state for each connected account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No trading accounts connected yet.
            </p>
          ) : accounts.map(a => {
            const meta = STATUS_META[a.status] ?? STATUS_META.disconnected;
            const StatusIcon = meta.icon;
            const met = (a.metrics ?? {}) as Record<string, number | string>;
            const openCount = typeof met.open_trades === 'number' ? met.open_trades : null;
            const tradeCount = typeof met.trades === 'number' ? met.trades : null;
            return (
              <div key={a.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.account_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[a.platform?.toUpperCase(), a.firm || a.broker, a.account_number || a.login, a.server].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <Badge variant="outline" className={`gap-1 border ${meta.cls}`}>
                    <StatusIcon className={`h-3 w-3 ${a.status === 'connecting' ? 'animate-spin' : ''}`} />
                    {meta.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat label="MetaApi Account ID" value={a.metaapi_account_id ?? 'Not provisioned'} mono />
                  <Stat label="Last Sync" value={a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : 'Never'} />
                  <Stat label="Balance" value={money(a.balance, a.currency)} />
                  <Stat label="Equity" value={money(a.equity, a.currency)} />
                  <Stat label="Open Positions" value={openCount == null ? '—' : String(openCount)} />
                  <Stat label="Trade History" value={tradeCount == null ? '—' : `${tradeCount} trades`} />
                </div>

                {a.sync_error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5">
                    <p className="text-[11px] text-red-500 break-words">{a.sync_error}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg"
                    disabled={busyId === a.id} onClick={() => run(a, 'sync')}>
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${busyId === a.id ? 'animate-spin' : ''}`} /> Sync Now
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg"
                    disabled={busyId === a.id} onClick={() => run(a, 'reconnect')}>
                    <PlugZap className="h-4 w-4 mr-1.5" /> Reconnect Account
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ConnectionDiagnostics
        open={diagOpen}
        onOpenChange={setDiagOpen}
        title={diagTitle}
        steps={steps}
        running={running}
        error={diagError}
      />
    </>
  );
}
