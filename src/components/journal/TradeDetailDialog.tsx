import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Brain, CalendarDays, Clock, Crosshair, Gauge, ImageIcon, Layers, LineChart, Maximize2, StickyNote, Tags, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { effectivePlanStatus } from '@/components/journal/PsychologyFields';

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
  before_screenshot_url: string | null;
  session: string | null;
  tags: string[];
  weekly_context: string | null;
  daily_bias: string | null;
  timeframe: string | null;
  weekly: string;
  daily: string;
};

const NR = 'Not recorded';
const txt = (v: unknown) => (v == null || (typeof v === 'string' && !v.trim()) ? NR : String(v));
const yn = (v: unknown) => (v === true ? 'Yes' : v === false ? 'No' : NR);
const num = (v: unknown) => (v == null || v === '' || isNaN(Number(v)) ? NR : String(Number(v)));
const score = (v: unknown) => (v == null ? NR : `${Number(v)}/10`);
const list = (v: unknown) => (Array.isArray(v) && v.length ? v.join(', ') : NR);

/** Every persisted, user-entered trade field grouped as shown in the detail view (absent values read "Not recorded"). */
export function tradeDetailSections(t: Record<string, any>): { title: string; rows: [string, string][] }[] {
  const plan = effectivePlanStatus({ plan_status: t.plan_status ?? null, followed_plan: t.followed_plan ?? null });
  return [
    { title: 'Trade Details', rows: [['Pair', txt(t.pair)], ['Direction', t.side === 'long' ? 'Long (buy)' : t.side === 'short' ? 'Short (sell)' : txt(t.side)], ['Outcome', txt(t.outcome)], ['Result', num(t.result)], ['Date', txt(t.trade_date)], ['Session', txt(t.session)], ['Timeframe', txt(t.timeframe)]] },
    { title: 'Planning', rows: [['Weekly context', txt(t.weekly_context)], ['Daily bias', txt(t.daily_bias)], ['Setup', txt(t.setup)], ['Planned trade', yn(t.planned_trade)], ['Checklist completed', yn(t.checklist_completed)], ['Entry reason', txt(t.entry_reason)]] },
    { title: 'Risk', rows: [['Entry price', num(t.entry_price)], ['Stop loss', num(t.stop_loss)], ['Take profit', num(t.take_profit)], ['Risk amount', num(t.risk_amount)], ['Risk %', num(t.risk_percent)], ['R:R', num(t.rr)], ['Late entry', yn(t.late_entry)], ['Early exit', yn(t.early_exit)], ['Moved stop', yn(t.moved_stop)]] },
    { title: 'Psychology', rows: [['Emotion before', txt(t.emotion_before)], ['Emotion after', txt(t.emotion_after)], ['Confidence', score(t.confidence_score)], ['Discipline', score(t.discipline_score)], ['Execution', score(t.execution_score)], ['Stress', score(t.stress_score)], ['Patience', score(t.patience_score)], ['Followed plan', plan === 'yes' ? 'Yes' : plan === 'no' ? 'No' : plan === 'partial' ? 'Partially' : NR], ['Impulsive entry', yn(t.impulsive_entry)], ['FOMO', yn(t.fomo)], ['Revenge trade', yn(t.revenge_trade)], ['Hesitation', yn(t.hesitation)], ['Overconfidence', yn(t.overconfidence)], ['Psychology note', txt(t.psychology_note)]] },
    { title: 'Review', rows: [['Exit reason', txt(t.exit_reason)], ['Mistakes', list(t.mistakes)], ['Rule violations', list(t.rule_violations)]] },
  ];
}

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

export function TradeDetailDialog({ trade: listTrade, open, onOpenChange }: { trade: DetailTrade | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  // List rows are partial projections: load the complete own-user row by id; ignore results for a previous id.
  const [full, setFull] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    setFull(null);
    if (!open || !listTrade?.id || !user) return;
    let active = true;
    supabase.from('trades').select('*').eq('id', listTrade.id).eq('user_id', user.id).maybeSingle().then(({ data }) => { if (active && data) setFull(data); });
    return () => { active = false; };
  }, [listTrade?.id, open, user]);
  const trade = (listTrade && full && full.id === listTrade.id ? { ...listTrade, ...full } : listTrade) as (DetailTrade & Record<string, any>) | null;
  const [lightbox, setLightbox] = useState<'before' | 'after' | null>(null);
  const [zoom, setZoom] = useState(false);
  const [chartUrls, setChartUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  useEffect(() => {
    let active = true;
    setChartUrls({ before: null, after: null });
    const resolve = async (path: string | null) => {
      if (!path) return null;
      const storagePath = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
      const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600);
      return data?.signedUrl ?? null;
    };
    Promise.all([resolve(trade?.before_screenshot_url ?? null), resolve(trade?.screenshot_url ?? null)])
      .then(([before, after]) => { if (active) setChartUrls({ before, after }); }).catch(() => { if (active) setChartUrls({ before: null, after: null }); });
    return () => { active = false; };
  }, [trade?.id, trade?.before_screenshot_url, trade?.screenshot_url]);

  if (!trade) return null;
  const pnl = Number(trade.result ?? 0);
  const isWin = pnl > 0;
  const isLoss = pnl < 0;
  const long = trade.side === 'long';
  const dateLabel = new Date(`${trade.trade_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
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

          {tradeDetailSections(trade).filter(sec => sec.title !== 'Trade Details').map(sec => (
            <Section key={sec.title} icon={sec.title === 'Psychology' ? Brain : sec.title === 'Risk' ? Gauge : sec.title === 'Planning' ? LineChart : StickyNote} title={sec.title}>
              <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {sec.rows.map(([k, v]) => (
                  <div key={k} className="flex min-w-0 items-baseline gap-2 text-sm">
                    <dt className="shrink-0 font-medium text-foreground">{k}:</dt>
                    <dd className={cn('min-w-0 break-words', v === NR ? 'text-muted-foreground/60' : 'text-muted-foreground')}>{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          ))}

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

          {/* Before / after chart comparison */}
          <Section icon={Layers} title="Trade screenshots">
            {(() => {
              const stages = (['before', 'after'] as const);
              const present = stages.filter(st => chartUrls[st]);
              const shown = present.length === 1 ? present : stages;
              return (
                <div className={cn('grid gap-4', shown.length === 2 && 'md:grid-cols-2')}>
                  {shown.map((stage) => <div key={stage} className="min-w-0">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stage === 'before' ? 'Before entry' : 'After trade'}</p>
                    {chartUrls[stage] ? (
                      <button type="button" onClick={() => { setZoom(false); setLightbox(stage); }} aria-label={`Expand ${stage} screenshot`}
                        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-background transition-colors duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                        <img src={chartUrls[stage] ?? undefined} alt={`${trade.pair} ${stage} trade`} className="aspect-video w-full object-contain" />
                        <span className="absolute right-2 top-2 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><Maximize2 className="h-3.5 w-3.5" /></span>
                      </button>
                    ) : (
                      <div className="flex h-20 items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground">
                        <ImageIcon className="h-4 w-4" /><p className="text-xs">No {stage} screenshot</p>
                      </div>
                    )}
                  </div>)}
                </div>
              );
            })()}
          </Section>

          <p className="flex items-center gap-1.5 pb-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> Logged on {dateLabel}</p>
        </div>
      </DialogContent>
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-2 border-border bg-background/95 p-3 sm:rounded-md">
          <div className="flex items-center gap-2 pr-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{trade.pair} · {lightbox === 'before' ? 'Before entry' : 'After trade'}</p>
            <button type="button" onClick={() => setZoom(z => !z)} className="ml-auto rounded border border-border p-1.5 text-muted-foreground hover:text-foreground" aria-label={zoom ? 'Zoom out' : 'Zoom in'}>
              {zoom ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className={cn('min-h-0 flex-1 rounded border border-border bg-background', zoom ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden')}>
            {lightbox && chartUrls[lightbox] && <img src={chartUrls[lightbox]!} alt={`${trade.pair} ${lightbox} trade, full size`} onClick={() => setZoom(z => !z)}
              className={zoom ? 'max-w-none cursor-zoom-out' : 'h-full w-full cursor-zoom-in object-contain'} style={zoom ? { width: '200%' } : undefined} />}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
