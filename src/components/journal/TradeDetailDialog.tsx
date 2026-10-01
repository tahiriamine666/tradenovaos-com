import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Crosshair, Gauge, ImageIcon, Layers, LineChart, StickyNote, Tags } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type DetailTrade = {
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
  weekly: string;
  daily: string;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-sm font-semibold', tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof LineChart; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/10 p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary"><Icon className="h-3.5 w-3.5" /></span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

export function TradeDetailDialog({ trade, open, onOpenChange }: { trade: DetailTrade | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [chartUrl, setChartUrl] = useState<string | null>(null);

  useEffect(() => {
    setChartUrl(null);
    if (!trade?.screenshot_url) return;
    const storagePath = trade.screenshot_url.match(/trade-screenshots\/(.+)/)?.[1] ?? trade.screenshot_url;
    supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600).then(({ data }) => setChartUrl(data?.signedUrl ?? null));
  }, [trade?.id, trade?.screenshot_url]);

  if (!trade) return null;
  const pnl = Number(trade.result ?? 0);
  const isWin = pnl > 0;
  const isLoss = pnl < 0;
  const long = trade.side === 'long';
  const dateLabel = new Date(`${trade.trade_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        {/* Hero header — different from reference: big P/L banner instead of a form */}
        <div className={cn('border-b border-border px-6 py-5', isWin ? 'bg-success/10' : isLoss ? 'bg-danger/10' : 'bg-muted/20')}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', long ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger')}>
                  {long ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <h2 className="text-xl font-bold text-foreground">{trade.pair}</h2>
                <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold uppercase', long ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger')}>{trade.side ?? '—'}</span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {dateLabel}</p>
            </div>
            <div className="text-right">
              <p className={cn('font-mono text-2xl font-bold', isWin ? 'text-success' : isLoss ? 'text-danger' : 'text-muted-foreground')}>
                {pnl > 0 ? '+' : ''}{pnl.toLocaleString()}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{isWin ? 'Winning trade' : isLoss ? 'Losing trade' : 'Breakeven'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Key stats strip */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="R:R" value={trade.rr ? `${Number(trade.rr).toFixed(1)}R` : '—'} />
            <Stat label="Timeframe" value={trade.timeframe || '—'} />
            <Stat label="Session" value={trade.session || '—'} />
            <Stat label="Outcome" value={trade.outcome || (isWin ? 'Win' : isLoss ? 'Loss' : 'BE')} tone={isWin ? 'up' : isLoss ? 'down' : undefined} />
          </div>

          {/* Market context */}
          <Section icon={LineChart} title="Market Context">
            <ul className="space-y-1.5">
              <Bullet><span className="font-medium text-foreground">Weekly context:</span> {trade.weekly}</Bullet>
              <Bullet><span className="font-medium text-foreground">Daily bias:</span> {trade.daily}</Bullet>
              {trade.session && <Bullet><span className="font-medium text-foreground">Session:</span> {trade.session}</Bullet>}
            </ul>
          </Section>

          {/* Setup & confluences */}
          <Section icon={Crosshair} title="Setup & Confluences">
            {trade.setup ? (
              <ul className="space-y-1.5">
                {trade.setup.split(/\n|•|;|\|/).map((line) => line.trim()).filter(Boolean).map((line, i) => <Bullet key={i}>{line}</Bullet>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No setup details recorded for this trade.</p>
            )}
          </Section>

          {/* Risk & execution */}
          <Section icon={Gauge} title="Risk & Execution">
            <ul className="space-y-1.5">
              <Bullet><span className="font-medium text-foreground">Direction:</span> {long ? 'Long (buy)' : trade.side ? 'Short (sell)' : '—'}</Bullet>
              <Bullet><span className="font-medium text-foreground">Risk-to-reward:</span> {trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—'}</Bullet>
              <Bullet><span className="font-medium text-foreground">Result:</span> {pnl > 0 ? '+' : ''}{pnl.toLocaleString()}</Bullet>
            </ul>
          </Section>

          {/* Notes */}
          <Section icon={StickyNote} title="Journal Notes">
            {trade.notes ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{trade.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes written for this trade.</p>
            )}
          </Section>

          {/* Tags */}
          {trade.tags?.length > 0 && (
            <Section icon={Tags} title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.map((tag) => (
                  <span key={tag} className="rounded bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary">{tag}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Chart */}
          <Section icon={Layers} title="Chart">
            {chartUrl ? (
              <img src={chartUrl} alt={`${trade.pair} chart`} className="w-full rounded-md border border-border" />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
                <p className="text-xs">No chart screenshot attached.</p>
              </div>
            )}
          </Section>

          <p className="flex items-center gap-1.5 pb-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> Logged on {dateLabel}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
