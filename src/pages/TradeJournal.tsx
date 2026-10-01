import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTradeDialog, useTradesChanged } from '@/contexts/TradeDialogContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { TradeDetailDialog, type DetailTrade } from '@/components/journal/TradeDetailDialog';

type JournalTrade = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  rr: number | null;
  trade_date: string;
  setup: string | null;
  notes: string | null;
  outcome: string | null;
  screenshot_url: string | null;
  session: string | null;
  tags: string[];
  weekly_context: string | null;
  daily_bias: string | null;
  timeframe: string | null;
  playbook_id: string | null;
};

async function signedScreenshot(path: string) {
  const storagePath = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
  const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

function contextValue(trade: JournalTrade, weekly: boolean) {
  if (weekly && trade.weekly_context) return trade.weekly_context;
  if (!weekly && trade.daily_bias) return trade.daily_bias;
  const tag = trade.tags?.find((value) => value.toLowerCase().includes(weekly ? 'weekly' : 'bias'));
  if (tag) return tag.replace(/weekly|daily|context|bias|:/gi, '').trim() || 'Neutral';
  if (!weekly && trade.side) return trade.side === 'long' ? 'Bullish' : 'Bearish';
  return trade.setup || 'Neutral';
}

export default function TradeJournal() {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const { openNew, openEdit } = useTradeDialog();
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DetailTrade | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('trades').select('id,pair,side,result,rr,trade_date,setup,notes,outcome,screenshot_url,session,tags,weekly_context,daily_bias,timeframe,playbook_id')
      .eq('user_id', user.id).order('trade_date', { ascending: false });
    if (activeAccountId) query = query.eq('trading_account_id', activeAccountId);
    const { data } = await query;
    const rows = (data ?? []) as JournalTrade[];
    setTrades(rows);
    const pairs = await Promise.all(rows.filter((trade) => trade.screenshot_url).map(async (trade) => {
      const url = trade.screenshot_url ? await signedScreenshot(trade.screenshot_url) : null;
      return [trade.id, url] as const;
    }));
    setScreenshots(Object.fromEntries(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair[1]))));
    setLoading(false);
  }, [user, activeAccountId]);

  useEffect(() => { load(); }, [load, version]);
  useTradesChanged(load);

  const handleDelete = async (trade: JournalTrade) => {
    if (!user) return;
    if (!window.confirm(`Delete the ${trade.pair} trade from ${trade.trade_date}?`)) return;
    const { error } = await supabase.from('trades').delete().eq('id', trade.id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Could not delete', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setTrades((prev) => prev.filter((row) => row.id !== trade.id));
    toast({ title: 'Trade removed', description: `${trade.pair} deleted.` });
  };

  const rows = useMemo(() => trades.map((trade) => ({
    ...trade,
    weekly: contextValue(trade, true),
    daily: contextValue(trade, false),
  })), [trades]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trade Journal"
        description="Every trade, setup and result in one complete journal."
        actions={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Log Trade
          </Button>
        }
      />
      {loading ? <Skeleton className="h-72 w-full" /> : rows.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/40 px-6 text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-background">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">No trades yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Start your trading history. Every trade logged sharpens your edge.</p>
          <Button onClick={openNew} className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Log First Trade
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="border-b border-border bg-muted/35 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  {['Date','Pair','Weekly context','Daily bias','Result','P/L','R:R','Timeframe','Chart','Notes','Actions'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((trade) => {
                  const pnl = Number(trade.result ?? 0);
                  const result = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'BE';
                  return (
                    <tr key={trade.id} onClick={() => setSelected(trade)} className="cursor-pointer hover:bg-muted/25">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-foreground">{new Date(`${trade.trade_date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{trade.pair}</td>
                      <td className="px-4 py-3"><ContextBadge value={trade.weekly} /></td>
                      <td className="px-4 py-3"><ContextBadge value={trade.daily} /></td>
                      <td className="px-4 py-3"><span className={cn('rounded px-2 py-1 text-[11px] font-semibold uppercase', pnl > 0 ? 'bg-success/20 text-success' : pnl < 0 ? 'bg-danger/20 text-danger' : 'bg-muted text-muted-foreground')}>{result}</span></td>
                      <td className={cn('px-4 py-3 text-right font-mono font-semibold', pnl > 0 ? 'text-success' : pnl < 0 ? 'text-danger' : 'text-muted-foreground')}>{pnl > 0 ? '+' : ''}{pnl.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{trade.rr ? Number(trade.rr).toFixed(1) : '—'}</td>
                      <td className="px-4 py-3"><span className="rounded bg-primary/20 px-2 py-1 text-[11px] font-medium text-primary">{trade.timeframe || trade.session || '—'}</span></td>
                      <td className="px-4 py-2">
                        {screenshots[trade.id] ? <img src={screenshots[trade.id]} alt={`${trade.pair} chart`} className="h-9 w-14 rounded-sm border border-border object-cover" /> : <div className="flex h-9 w-14 items-center justify-center rounded-sm border border-border bg-muted/30"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}
                      </td>
                      <td className="max-w-[320px] truncate px-4 py-3 text-xs text-muted-foreground">{trade.notes || trade.setup || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Edit ${trade.pair} trade`}
                            onPointerDown={(e) => { e.stopPropagation(); openEdit(trade as never); }}
                            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${trade.pair} trade`}
                            onPointerDown={(e) => { e.stopPropagation(); handleDelete(trade); }}
                            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TradeDetailDialog trade={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}

function ContextBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const bullish = normalized.includes('bull') || normalized.includes('long');
  const bearish = normalized.includes('bear') || normalized.includes('short');
  return <span className={cn('rounded px-2 py-1 text-[11px] font-semibold uppercase', bullish ? 'bg-success/20 text-success' : bearish ? 'bg-danger/20 text-danger' : 'bg-muted text-muted-foreground')}>{value}</span>;
}
