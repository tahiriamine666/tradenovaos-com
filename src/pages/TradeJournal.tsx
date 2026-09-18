import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
};

async function signedScreenshot(path: string) {
  const storagePath = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
  const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

function contextValue(trade: JournalTrade, weekly: boolean) {
  const tag = trade.tags?.find((value) => value.toLowerCase().includes(weekly ? 'weekly' : 'bias'));
  if (tag) return tag.replace(/weekly|daily|context|bias|:/gi, '').trim() || 'Neutral';
  if (!weekly && trade.side) return trade.side === 'long' ? 'Bullish' : 'Bearish';
  return trade.setup || 'Neutral';
}

export default function TradeJournal() {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      let query = supabase.from('trades').select('id,pair,side,result,rr,trade_date,setup,notes,outcome,screenshot_url,session,tags')
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
    };
    load();
  }, [user, activeAccountId, version]);

  const rows = useMemo(() => trades.map((trade) => ({
    ...trade,
    weekly: contextValue(trade, true),
    daily: contextValue(trade, false),
  })), [trades]);

  return (
    <div className="space-y-5">
      <PageHeader title="Trade Journal" description="Your complete trading record, context and review notes." />
      {loading ? <Skeleton className="h-72 w-full" /> : rows.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/40 text-center">
          <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">No journal trades yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Trades you add or sync will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-b border-border bg-muted/35 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  {['Date','Pair','Weekly context','Daily bias','Result','P/L','R:R','Timeframe','Chart','Notes'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((trade) => {
                  const pnl = Number(trade.result ?? 0);
                  const result = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'BE';
                  return (
                    <tr key={trade.id} className="hover:bg-muted/25">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-foreground">{new Date(`${trade.trade_date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{trade.pair}</td>
                      <td className="px-4 py-3"><ContextBadge value={trade.weekly} /></td>
                      <td className="px-4 py-3"><ContextBadge value={trade.daily} /></td>
                      <td className="px-4 py-3"><span className={cn('rounded px-2 py-1 text-[11px] font-semibold uppercase', pnl > 0 ? 'bg-success/20 text-success' : pnl < 0 ? 'bg-danger/20 text-danger' : 'bg-muted text-muted-foreground')}>{result}</span></td>
                      <td className={cn('px-4 py-3 text-right font-mono font-semibold', pnl > 0 ? 'text-success' : pnl < 0 ? 'text-danger' : 'text-muted-foreground')}>{pnl > 0 ? '+' : ''}{pnl.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{trade.rr ? Number(trade.rr).toFixed(1) : '—'}</td>
                      <td className="px-4 py-3"><span className="rounded bg-primary/20 px-2 py-1 text-[11px] font-medium text-primary">{trade.session || '—'}</span></td>
                      <td className="px-4 py-2">
                        {screenshots[trade.id] ? <img src={screenshots[trade.id]} alt={`${trade.pair} chart`} className="h-9 w-14 rounded-sm border border-border object-cover" /> : <div className="flex h-9 w-14 items-center justify-center rounded-sm border border-border bg-muted/30"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}
                      </td>
                      <td className="max-w-[320px] truncate px-4 py-3 text-xs text-muted-foreground">{trade.notes || trade.setup || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const bullish = normalized.includes('bull') || normalized.includes('long');
  const bearish = normalized.includes('bear') || normalized.includes('short');
  return <span className={cn('rounded px-2 py-1 text-[11px] font-semibold uppercase', bullish ? 'bg-success/20 text-success' : bearish ? 'bg-danger/20 text-danger' : 'bg-muted text-muted-foreground')}>{value}</span>;
}