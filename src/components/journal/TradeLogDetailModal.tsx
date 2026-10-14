import { useEffect, useState } from 'react';
import { Copy, Edit, ImageIcon, Maximize2, RefreshCw, Sparkles, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { effectivePlanStatus } from '@/components/journal/PsychologyFields';

export const NOT_RECORDED = 'Not recorded';
const NR = NOT_RECORDED;
const txt = (v: unknown) => (v == null || (typeof v === 'string' && !v.trim()) ? NR : String(v));
const yn = (v: unknown) => (v === true ? 'Yes' : v === false ? 'No' : NR);
const num = (v: unknown) => (v == null || v === '' || isNaN(Number(v)) ? NR : String(Number(v)));
const score = (v: unknown) => (v == null ? NR : `${Number(v)}/10`);
const list = (v: unknown) => (Array.isArray(v) && v.length ? v.join(', ') : NR);
const money = (v: unknown) => {
  if (v == null || v === '' || isNaN(Number(v))) return NR;
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const cap = (v: unknown) => { const s = txt(v); return s === NR ? s : s.charAt(0).toUpperCase() + s.slice(1); };

export function outcomeLabel(t: Record<string, any>): string {
  const o = typeof t.outcome === 'string' ? t.outcome.toLowerCase() : '';
  if (o === 'win') return 'Win';
  if (o === 'loss') return 'Loss';
  if (o === 'breakeven' || o === 'be') return 'Breakeven';
  if (t.result == null) return NR;
  const r = Number(t.result);
  return r > 0 ? 'Win' : r < 0 ? 'Loss' : 'Breakeven';
}

export type LogSection = { id: 'overview' | 'planning' | 'risk' | 'psychology' | 'review'; title: string; rows: [string, string][] };

/** Every persisted trade field for Trade Logs, each shown exactly once; missing values read "Not recorded". */
export function tradeLogSections(t: Record<string, any>, ctx: { accountName?: string | null; playbookName?: string | null } = {}): LogSection[] {
  const plan = effectivePlanStatus({ plan_status: t.plan_status ?? null, followed_plan: t.followed_plan ?? null });
  return [
    { id: 'overview', title: 'Overview', rows: [
      ['Pair', txt(t.pair)], ['Date', txt(t.trade_date)], ['Account', txt(ctx.accountName)],
      ['Direction', t.side === 'long' ? 'Long' : t.side === 'short' ? 'Short' : txt(t.side)],
      ['Outcome', outcomeLabel(t)], ['P&L', money(t.result)], ['R:R', num(t.rr)],
      ['Session', txt(t.session)], ['Setup', txt(t.setup)], ['Playbook', txt(ctx.playbookName)], ['Tags', list(t.tags)],
    ] },
    { id: 'planning', title: 'Planning & Market Context', rows: [
      ['Weekly context', txt(t.weekly_context)], ['Daily bias', cap(t.daily_bias)], ['Timeframe', txt(t.timeframe)],
      ['Entry reason', txt(t.entry_reason)], ['Planned trade', yn(t.planned_trade)], ['Checklist completed', yn(t.checklist_completed)],
      ['Followed plan', plan === 'yes' ? 'Yes' : plan === 'no' ? 'No' : plan === 'partial' ? 'Partially' : NR],
    ] },
    { id: 'risk', title: 'Risk & Execution', rows: [
      ['Entry price', num(t.entry_price)], ['Exit price', num(t.exit_price)], ['Stop loss', num(t.stop_loss)], ['Take profit', num(t.take_profit)],
      ['Risk amount', num(t.risk_amount)], ['Risk %', num(t.risk_percent)], ['Execution', score(t.execution_score)],
      ['Late entry', yn(t.late_entry)], ['Early exit', yn(t.early_exit)], ['Moved stop', yn(t.moved_stop)],
    ] },
    { id: 'psychology', title: 'Trading Psychology', rows: [
      ['Emotion before', cap(t.emotion_before ?? (t.emotion_after == null ? t.emotion : null))], ['Emotion after', cap(t.emotion_after)],
      ['Confidence', score(t.confidence_score)], ['Discipline', score(t.discipline_score)], ['Stress', score(t.stress_score)], ['Patience', score(t.patience_score)],
      ['Impulsive entry', yn(t.impulsive_entry)], ['FOMO', yn(t.fomo)], ['Revenge trade', yn(t.revenge_trade)], ['Hesitation', yn(t.hesitation)],
      ['Overconfidence', yn(t.overconfidence)], ['Psychology note', txt(t.psychology_note)],
    ] },
    { id: 'review', title: 'Review & Notes', rows: [
      ['Notes', txt(t.notes)], ['Mistakes', list(t.mistakes)], ['Rule violations', list(t.rule_violations)], ['Exit reason', txt(t.exit_reason)],
    ] },
  ];
}

async function signed(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.includes('token=')) return path;
  const storagePath = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
  const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-w-0 items-baseline justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
          <dt className="shrink-0 text-muted-foreground">{k}</dt>
          <dd className={cn('min-w-0 whitespace-pre-line break-words text-right', v === NR ? 'text-muted-foreground/60' : 'font-medium text-foreground')}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TradeLogDetailModal({ tradeId, refreshKey = 0, onClose, onEdit, onDuplicate, onDelete, onAIReview, reviewing }: {
  tradeId: string | null; refreshKey?: number; onClose: () => void;
  onEdit: (t: Record<string, any>) => void; onDuplicate?: (t: Record<string, any>) => void; onDelete?: (t: Record<string, any>) => void;
  onAIReview?: (t: Record<string, any>) => void; reviewing?: boolean;
}) {
  const { user } = useAuth();
  const [trade, setTrade] = useState<Record<string, any> | null>(null);
  const [ctx, setCtx] = useState<{ accountName: string | null; playbookName: string | null }>({ accountName: null, playbookName: null });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [urls, setUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });
  const [lightbox, setLightbox] = useState<'before' | 'after' | null>(null);
  const [zoom, setZoom] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => { setTab('overview'); }, [tradeId]);

  // Always load the complete own-user row; results for a previous id are discarded.
  useEffect(() => {
    setTrade(null); setUrls({ before: null, after: null }); setCtx({ accountName: null, playbookName: null });
    if (!tradeId || !user) return;
    let active = true;
    setState('loading');
    (async () => {
      const { data, error } = await supabase.from('trades').select('*').eq('id', tradeId).eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (error || !data) { setState('error'); return; }
      setTrade(data); setState('ready');
      const [acc, pb, before, after] = await Promise.all([
        data.trading_account_id ? supabase.from('trading_accounts').select('account_name').eq('id', data.trading_account_id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        data.playbook_id ? supabase.from('playbooks').select('title,name').eq('id', data.playbook_id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        signed(data.before_screenshot_url).catch(() => null), signed(data.screenshot_url).catch(() => null),
      ]);
      if (!active) return;
      setCtx({ accountName: (acc).data?.account_name ?? null, playbookName: (pb).data?.name || (pb).data?.title || null });
      setUrls({ before, after });
    })();
    return () => { active = false; };
  }, [tradeId, user, refreshKey]);

  const t = trade && trade.id === tradeId ? trade : null;
  const sections = t ? tradeLogSections(t, ctx) : [];
  const pnl = Number(t?.result ?? 0);
  const outcome = t ? outcomeLabel(t) : '';

  return (
    <Dialog open={!!tradeId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-[1040px] sm:rounded-xl [&>button:last-child]:hidden">
        {/* Sticky header */}
        <div className="shrink-0 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {t ? `${t.pair} — ${t.side ? String(t.side).toUpperCase() : NR}` : 'Trade details'}
              </DialogPrimitive.Title>
              {t && (
                <p className={cn('mt-0.5 font-mono text-sm font-semibold', pnl > 0 ? 'text-success' : pnl < 0 ? 'text-danger' : 'text-muted-foreground')}>
                  {outcome.toUpperCase()} · {money(t.result)}
                </p>
              )}
              <DialogPrimitive.Description className="sr-only">Complete saved details for this trade</DialogPrimitive.Description>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {t && <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onEdit(t)}><Edit className="h-3.5 w-3.5" /> Edit</Button>}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
            </div>
          </div>
          {t && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>{new Date(`${t.trade_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>Account: <span className="text-foreground">{ctx.accountName ?? NR}</span></span>
              <span>Session: <span className="text-foreground">{t.session || NR}</span></span>
              <span>R:R: <span className="text-foreground">{t.rr != null ? `${Number(t.rr)}R` : NR}</span></span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {state === 'loading' && !t && <div className="space-y-3 py-6">{[0, 1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-muted/40" />)}</div>}
          {state === 'error' && <p className="py-10 text-center text-sm text-muted-foreground">This trade could not be loaded. Close and try again.</p>}
          {t && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/30 p-1">
                {[...sections.map(s => [s.id, s.id === 'planning' ? 'Planning' : s.id === 'risk' ? 'Risk' : s.id === 'psychology' ? 'Psychology' : s.id === 'review' ? 'Review' : 'Overview']), ['screenshots', 'Screenshots'], ['ai', 'AI Review']].map(([id, label]) => (
                  <TabsTrigger key={id} value={id} className="flex-1 text-xs sm:text-sm">{label}</TabsTrigger>
                ))}
              </TabsList>
              {sections.map(s => (
                <TabsContent key={s.id} value={s.id} className="mt-0">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{s.title}</h3>
                  <Rows rows={s.rows} />
                </TabsContent>
              ))}
              <TabsContent value="screenshots" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  {(['before', 'after'] as const).map(stage => (
                    <div key={stage} className="min-w-0">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stage === 'before' ? 'Before Trade' : 'After Trade'}</p>
                      {urls[stage] ? (
                        <button type="button" onClick={() => { setZoom(false); setLightbox(stage); }} aria-label={`Expand ${stage} screenshot`}
                          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/50">
                          <img src={urls[stage]!} alt={`${t.pair} ${stage} trade`} className="aspect-video w-full object-contain" />
                          <span className="absolute right-2 top-2 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"><Maximize2 className="h-3.5 w-3.5" /></span>
                        </button>
                      ) : (
                        <div className="flex aspect-video items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground">
                          <ImageIcon className="h-4 w-4" /><p className="text-xs">{(stage === 'before' ? t.before_screenshot_url : t.screenshot_url) ? 'Loading…' : NR}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="ai" className="mt-0 space-y-3">
                {t.ai_review?.verdict ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">{t.ai_review.verdict}{t.ai_review.discipline_score != null && <span className="ml-2 text-muted-foreground">Score {t.ai_review.discipline_score}</span>}</p>
                    <Rows rows={[['What went well', txt(t.ai_review.what_went_well)], ['What went wrong', txt(t.ai_review.what_went_wrong)], ['Rule broken', txt(t.ai_review.rule_broken)], ['Action item', txt(t.ai_review.improvement)]]} />
                  </>
                ) : <p className="py-6 text-center text-sm text-muted-foreground">No AI review yet.</p>}
                {onAIReview && (
                  <Button size="sm" variant="outline" disabled={reviewing} onClick={() => onAIReview(t)} className="gap-2">
                    {t.ai_review?.verdict ? <RefreshCw className={cn('h-3.5 w-3.5', reviewing && 'animate-spin')} /> : <Sparkles className={cn('h-3.5 w-3.5', reviewing && 'animate-spin')} />}
                    {reviewing ? 'Analyzing…' : t.ai_review?.verdict ? 'Re-analyze' : 'Analyze trade'}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {t && (onDuplicate || onDelete) && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card/95 px-5 py-3 sm:px-6">
            {onDuplicate && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDuplicate(t)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>}
            {onDelete && <Button variant="outline" size="sm" className="gap-1.5 border-danger/30 text-danger hover:bg-danger/10" onClick={() => onDelete(t)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
          </div>
        )}
      </DialogContent>

      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-2 bg-background/95 p-3 sm:rounded-md">
          <DialogPrimitive.Title className="pr-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t?.pair} · {lightbox === 'before' ? 'Before Trade' : 'After Trade'}
          </DialogPrimitive.Title>
          <button type="button" onClick={() => setZoom(z => !z)} className="absolute right-12 top-3 rounded border border-border p-1.5 text-muted-foreground hover:text-foreground" aria-label={zoom ? 'Zoom out' : 'Zoom in'}>
            {zoom ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
          </button>
          <div className={cn('min-h-0 flex-1 rounded border border-border bg-background', zoom ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden')}>
            {lightbox && urls[lightbox] && <img src={urls[lightbox]!} alt={`${t?.pair} ${lightbox} trade, full size`} onClick={() => setZoom(z => !z)}
              className={zoom ? 'max-w-none cursor-zoom-out' : 'h-full w-full cursor-zoom-in object-contain'} style={zoom ? { width: '200%' } : undefined} />}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
