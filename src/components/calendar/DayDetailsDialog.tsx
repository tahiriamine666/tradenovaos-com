import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Pencil, BookOpen, Target, Sun, CalendarRange, Crosshair, Image as ImageIcon, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { emitNavigate, useTradeDialog, useTradesChanged } from '@/contexts/TradeDialogContext';

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const weekStartKey = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return toKey(x); };
const money = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`;
const has = (v: unknown) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0);

async function sign(path: string | null) {
  if (!path) return null;
  if (/^https?:/.test(path) && !path.includes('trade-screenshots/')) return path;
  const p = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
  const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(p, 3600);
  return data?.signedUrl ?? null;
}

type DayData = { trades: any[]; journal: any | null; plan: any | null; daily: any | null; weekly: any | null; shots: Record<string, { before: string | null; after: string | null }> };

function Rows({ items }: { items: [string, unknown][] }) {
  const shown = items.filter(([, v]) => has(v));
  if (!shown.length) return null;
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{Array.isArray(v) ? (v as any[]).filter(Boolean).join(' • ') : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ icon: Icon, title, children, action }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-border pb-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DayDetailsDialog({ date, onClose, onDateChange }: { date: Date | null; onClose: () => void; onDateChange: (d: Date) => void }) {
  const { user } = useAuth();
  const { activeAccountId } = useActiveAccount();
  const { openEdit } = useTradeDialog();
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, DayData>());
  const reqId = useRef(0);
  const key = date ? toKey(date) : '';
  const accountKey = activeAccountId ?? 'all';

  const load = useCallback(async (force = false) => {
    if (!user || !date) return;
    const ck = `${accountKey}|${key}`;
    const id = ++reqId.current;
    const cached = cache.current.get(ck);
    if (!force && cached) { setData(cached); setLoading(false); return; }
    setData(null); setLoading(true);
    let tq = supabase.from('trades').select('*').eq('user_id', user.id).eq('trade_date', key).order('created_at');
    if (activeAccountId) tq = tq.eq('trading_account_id', activeAccountId);
    const ckq = (type: string, period: string) => supabase.from('trade_plan_checklists').select('data,status')
      .eq('user_id', user.id).eq('account_key', accountKey).eq('checklist_type', type).eq('period_date', period).maybeSingle();
    const [t, j, p, d, w] = await Promise.all([
      tq,
      supabase.from('journal_entries').select('*').eq('user_id', user.id).eq('entry_date', key).limit(1).maybeSingle(),
      supabase.from('trade_plans').select('*').eq('user_id', user.id).eq('plan_date', key).limit(1).maybeSingle(),
      ckq('daily', key), ckq('weekly', weekStartKey(date)),
    ]);
    const trades = t.data ?? [];
    const shots: DayData['shots'] = {};
    await Promise.all(trades.map(async (tr: any) => { shots[tr.id] = { before: await sign(tr.before_screenshot_url), after: await sign(tr.screenshot_url) }; }));
    if (id !== reqId.current) return;
    const result: DayData = { trades, journal: j.data, plan: p.data, daily: d.data?.data ?? null, weekly: w.data?.data ?? null, shots };
    cache.current.set(ck, result);
    setData(result); setLoading(false);
  }, [user, key, accountKey, activeAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useTradesChanged(useCallback(() => { cache.current.clear(); load(true); }, [load]));

  if (!date) return null;
  const shift = (n: number) => { const x = new Date(date); x.setDate(x.getDate() + n); onDateChange(x); };
  const go = (view: string) => { onClose(); emitNavigate(view); };

  const trades = data?.trades ?? [];
  const pnl = trades.reduce((s, t) => s + Number(t.result ?? 0), 0);
  const wins = trades.filter(t => Number(t.result ?? 0) > 0).length;
  const losses = trades.filter(t => Number(t.result ?? 0) < 0).length;
  const longs = trades.filter(t => /long|buy/i.test(t.side ?? '')).length;
  const shorts = trades.filter(t => /short|sell/i.test(t.side ?? '')).length;
  const mainDir = !trades.length ? null : longs > shorts ? 'Long' : shorts > longs ? 'Short' : 'Mixed';
  const j = data?.journal; const plan = data?.plan; const daily = data?.daily; const weekly = data?.weekly;
  const scenario = plan?.ai_analysis?.framework?.scenario;
  const hasScenario = scenario && (scenario.enabled || ['market', 'setup', 'confirmation', 'trigger', 'invalidation'].some(k => has(scenario[k])));
  const checklist: any[] = Array.isArray(plan?.checklist) ? plan.checklist : [];
  const anyShots = trades.some(t => data?.shots[t.id]?.before || data?.shots[t.id]?.after);
  const empty = data && !trades.length && !j && !plan && !daily && !weekly;

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[min(90vw,760px)] sm:max-w-none p-0 flex flex-col gap-0">
        <div className="shrink-0 border-b border-border bg-background px-5 sm:px-7 py-5 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">Trading Calendar / Day Details</p>
          <SheetTitle className="flex items-center gap-2 text-xl sm:text-2xl font-heading">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-4">
            <Button size="icon" variant="outline" title="Previous day" aria-label="Previous day" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => onDateChange(new Date())}>Today</Button>
            <Button size="icon" variant="outline" title="Next day" aria-label="Next day" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div key={`${accountKey}-${key}`} className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-6 content-crossfade">
          {(loading || !data) && <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading day details...</div>}

          {data && empty && (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No trading activity recorded.</p>
              <Button size="sm" onClick={() => go('journal')}>Create Journal Entry</Button>
            </div>
          )}

          {data && !empty && (<>
            {trades.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([['P&L', money(pnl)], ['Trades', trades.length], ['Wins', wins], ['Losses', losses], ['Win Rate', `${Math.round((wins / trades.length) * 100)}%`], ['Direction', mainDir]] as [string, any][]).map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border bg-surface-1/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className={`text-sm font-semibold ${k === 'P&L' ? (pnl >= 0 ? 'text-success' : 'text-danger') : 'text-foreground'}`}>{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-1/60 px-4 py-3 text-sm text-muted-foreground">
                {j ? 'Journal entry available — no trades recorded for this day.' : 'No trades recorded for this day.'}
              </div>
            )}

            {trades.map((t, i) => {
              const r = Number(t.result ?? 0);
              const res = t.outcome ?? (t.result != null ? (r > 0 ? 'Win' : r < 0 ? 'Loss' : 'Breakeven') : null);
              return (
                <article key={t.id} className="rounded-md border border-border bg-surface-1/60 overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b border-border bg-primary/5 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trade {i + 1} of {trades.length}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold font-heading text-foreground break-words">{t.pair}</span>
                        {t.side && <span className="flex items-center gap-0.5 text-xs font-semibold uppercase text-primary">{/long|buy/i.test(t.side) ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{t.side}</span>}
                      </div>
                      {t.setup && <p className="mt-1 text-xs text-muted-foreground break-words">{t.setup}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {t.result != null && <p className={`text-lg font-mono font-bold ${r >= 0 ? 'text-success' : 'text-danger'}`}>{money(r)}</p>}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 space-y-5">
                    <Rows items={[
                    ['Direction', t.side], ['Entry', t.entry_price], ['Exit', t.exit_price], ['Size', t.quantity],
                    ['Stop Loss', t.stop_loss], ['Take Profit', t.take_profit],
                    ['P&L', t.result != null ? money(r) : null], ['R Multiple', t.rr != null ? `${Number(t.rr) >= 0 ? '+' : ''}${Number(t.rr).toFixed(2)}R` : null],
                    ['Result', res], ['Session', t.session], ['Timeframe', t.timeframe],
                    ['Weekly Context', t.weekly_context], ['Daily Bias', t.daily_bias], ['Emotion', t.emotion],
                    ['Mistakes', t.mistakes], ['Tags', t.tags], ['Discipline', t.discipline_score != null ? `${t.discipline_score}/10` : null],
                    ['Notes', t.notes],
                    ]} />
                    {(data.shots[t.id]?.before || data.shots[t.id]?.after) && <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-4">
                      {(['before', 'after'] as const).map(kind => {
                        const url = data.shots[t.id]?.[kind];
                        if (!url) return null;
                        return <div key={kind} className="min-w-0 space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground">{kind === 'before' ? 'Before trade' : 'After trade'}</p>
                          <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${t.pair} ${kind} screenshot`} className="block rounded-md border border-border overflow-hidden bg-background">
                            <img src={url} alt={`${t.pair} ${kind} trade`} className="aspect-video w-full object-contain" loading="lazy" />
                          </a>
                        </div>;
                      })}
                    </div>}
                  </div>
                </article>
              );
            })}

            {j && (
              <Section icon={BookOpen} title="Trade Journal" action={<Button size="sm" variant="ghost" onClick={() => go('journal')}><Pencil className="h-3.5 w-3.5" />Edit Journal</Button>}>
                <Rows items={[
                  ['Summary', j.summary], ['Session', j.session], ['Mood', j.mood], ['Emotional Trigger', j.emotional_trigger],
                  ['What Went Well', j.what_went_well], ['Mistakes', has(j.mistakes_list) ? j.mistakes_list : j.mistakes],
                  ['Bias', j.bias], ['Lessons Learned', j.lesson], ['Notes', j.notes],
                  ['Confidence', j.confidence_level], ['Rule Adherence', j.rule_adherence],
                ]} />
              </Section>
            )}

            {weekly && (
              <Section icon={CalendarRange} title="Weekly Context">
                <Rows items={[
                  ['Weekly Structure', weekly.structure], ['Major Liquidity', weekly.major_liquidity], ['External Liquidity', weekly.external_liquidity],
                  ['Price Location', weekly.price_location], ['Weekly Narrative', weekly.narrative], ['Bullish Scenario', weekly.bullish_scenario],
                  ['Bearish Scenario', weekly.bearish_scenario], ['Important News', weekly.news], ['Weekly Bias', weekly.bias],
                  ['Main Idea', weekly.main_idea], ['Weekly Rules', weekly.rules],
                ]} />
              </Section>
            )}

            {daily && (
              <Section icon={Sun} title="Daily Outlook" action={<Button size="sm" variant="ghost" onClick={() => go('plan')}><Pencil className="h-3.5 w-3.5" />Edit Daily Outlook</Button>}>
                <Rows items={[
                  ['Weekly Context', daily.weekly_context], ['Daily Structure', daily.structure], ['Daily Bias', daily.bias],
                  ['Current Price', daily.current_price], ['Key Level', daily.key_level === 'Other' ? daily.key_level_other : daily.key_level],
                  ['Daily Scenario', daily.scenario], ['News / Events', daily.news === 'Other' ? daily.news_other : daily.news],
                  ["Today's Plan", daily.direction], ['Rules', daily.rules],
                ]} />
              </Section>
            )}

            {plan && (
              <Section icon={Target} title="Trade Plan" action={<Button size="sm" variant="ghost" onClick={() => go('plan')}><Pencil className="h-3.5 w-3.5" />Edit Trade Plan</Button>}>
                <Rows items={[
                  ['Market Bias', plan.market_bias], ['Main Setup', plan.setups_to_trade], ['Secondary Setup', plan.secondary_setup],
                  ['Session', plan.session], ['Volatility', plan.volatility], ['Confidence', plan.confidence != null ? `${plan.confidence}%` : null],
                  ['Focus', plan.focus], ['Max Daily Loss', plan.max_daily_loss], ['Max Risk / Trade', plan.max_risk_per_trade], ['Notes', plan.notes],
                ]} />
                {checklist.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Execution Checklist</div>
                    {checklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={c.done ? 'text-primary' : 'text-muted-foreground'}>{c.done ? '✓' : '☐'}</span>
                        <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label ?? c.text ?? c.title ?? ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {hasScenario && (
              <Section icon={Target} title="Scenario Before Trade">
                <Rows items={[['Market Scenario', scenario.market], ['Expected Setup', scenario.setup], ['Confirmation Required', scenario.confirmation], ['Trigger', scenario.trigger], ['Invalidation', scenario.invalidation]]} />
              </Section>
            )}

          </>)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
