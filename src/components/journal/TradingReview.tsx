import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, History, Loader2, Play, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { useTradesChanged } from '@/contexts/TradeDialogContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
// No transparent robot asset exists yet (both robot PNGs are opaque RGB), so the JPEG + lighten blend is kept.
import robotAsset from '@/assets/tradenova-robot-full.jpg.asset.json';
const robotSrc = import.meta.env.DEV ? `https://id-preview--0ee4a120-abbf-401b-9623-1114b47e7fda.lovable.app${robotAsset.url}` : robotAsset.url;
import { fetchAll } from '@/lib/review/fetchAll';
import { getReviewQueue, type Draft, type SaveFn, type SaveState } from '@/lib/review/saveQueue';
import {
  ACTION_FIELDS, LEGACY_MAP, PRESETS, QUESTIONS, completion, execution, insights, iso, performance, planning, psychology, resolvePeriod, toFive,
  type PeriodType, type Preset, type ReviewChecklist, type ReviewJournal, type ReviewPlan, type ReviewTrade,
} from '@/lib/review/stats';

const TRADE_COLS = 'id,trading_account_id,pair,side,result,rr,trade_date,session,setup,playbook_id,daily_bias,weekly_context,emotion_before,emotion_after,confidence_score,discipline_score,stress_score,patience_score,followed_plan,plan_status,impulsive_entry,fomo,revenge_trade,hesitation,overconfidence,late_entry,early_exit,moved_stop,checklist_completed,planned_trade,rule_violations,mistakes,risk_percent,risk_amount';
const JOURNAL_COLS = 'id,entry_date,mood,confidence_level,energy_level,rule_adherence,stress_score,stress_label,confidence_score,emotional_trigger,mistakes_list';
const LEGACY_FIELDS = Object.keys(LEGACY_MAP);
const RATINGS = [['process_rating', 'Process'], ['execution_rating', 'Execution'], ['risk_rating', 'Risk'], ['psychology_rating', 'Psychology']] as const;
const HISTORY_PAGE = 10;
type ServerRow = { id: string; revision: number; draft: Draft; completion_pct: number; status: string; updated_at: string; legacy: Record<string, string | null> };
type HistoryRow = { id: string; period_start: string; period_end: string; completion_pct: number; status: string; updated_at: string };

const U = '—';
const na = 'Unavailable';
const money = (n: number | null | undefined) => (n == null ? na : `${n > 0 ? '+' : ''}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const fx = (n: number | null | undefined, d = 2, suffix = '') => (n == null ? na : `${n.toLocaleString(undefined, { maximumFractionDigits: d })}${suffix}`);
const frac = (x: { recorded: number } | null, k: string) => (x ? `${(x as any)[k]} / ${x.recorded}` : na);

function toServerRow(r: any): ServerRow {
  return {
    id: r.id, revision: r.revision ?? 0, completion_pct: r.completion_pct, status: r.status, updated_at: r.updated_at,
    draft: { answers: r.answers ?? {}, action_plan: r.action_plan ?? {}, ratings: Object.fromEntries(RATINGS.map(([k]) => [k, r[k] ?? null])) },
    legacy: Object.fromEntries(LEGACY_FIELDS.map((k) => [k, r[k] ?? null])),
  };
}

/** Optimistic-revision update; the row id and base revision are captured by the queue per review. */
export const makeSaver = (userId: string): SaveFn => async (id, base, d) => {
  const pct = completion(d.answers, d.action_plan);
  const { data, error } = await supabase.from('trading_reviews').update({
    answers: d.answers, action_plan: d.action_plan, completion_pct: pct, status: pct === 100 ? 'complete' : 'draft', ...d.ratings, revision: base + 1,
  } as any).eq('id', id).eq('user_id', userId).eq('revision', base).select('id,revision,completion_pct,status,updated_at').maybeSingle();
  if (error) return { ok: false, kind: 'error', message: error.message };
  if (!data) return { ok: false, kind: 'conflict' };
  return { ok: true, revision: data.revision, completion_pct: data.completion_pct, status: data.status, updated_at: data.updated_at };
};

export function TradingReview({ type = 'weekly' }: { type?: PeriodType }) {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const accountKey = activeAccountId ?? 'all';
  const [preset, setPreset] = useState<Preset>(PRESETS[type][0].id);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const period = useMemo(() => resolvePeriod(preset, new Date(), customStart, customEnd), [preset, customStart, customEnd]);

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [legacy, setLegacy] = useState<Record<string, string | null>>({});
  const [reviewState, setReviewState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState<{ trades: ReviewTrade[]; plans: ReviewPlan[]; checklists: ReviewChecklist[]; journal: ReviewJournal[]; playbooks: Record<string, string> } | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyMore, setHistoryMore] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [navBlocked, setNavBlocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // ── Per-review-id save queue (module-level per user, so drafts survive tab/account switches)
  const queue = useMemo(() => (user ? getReviewQueue(user.id, makeSaver(user.id)) : null), [user]);
  useSyncExternalStore(useCallback((cb) => queue?.subscribe(cb) ?? (() => {}), [queue]), () => (queue ? JSON.stringify(queue.unsaved().map((e) => e.id)) + (queue.get(reviewId)?.status ?? '') + (queue.get(reviewId)?.gen ?? '') + (queue.get(reviewId)?.revision ?? '') : ''));
  const entry = queue?.get(reviewId) ?? null;
  const save: SaveState = entry?.status ?? 'idle';
  const otherUnsaved = queue ? queue.unsaved().filter((e) => e.id !== reviewId).length : 0;
  const timers = useRef(new Map<string, number>());
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current.clear(); };

  const edit = (fn: (d: Draft) => Draft) => {
    if (!queue || !reviewId) return;
    const id = reviewId; // captured: the timer always saves THIS review
    queue.edit(id, fn);
    window.clearTimeout(timers.current.get(id));
    if (queue.get(id)?.status !== 'conflict') timers.current.set(id, window.setTimeout(() => { timers.current.delete(id); void queue.flush(id); }, 1200));
  };
  const saveNow = () => { if (!queue || !reviewId) return; window.clearTimeout(timers.current.get(reviewId)); void queue.flush(reviewId); };

  /** Runs `go` only once every draft is on the server; otherwise blocks and keeps the drafts. */
  const guarded = async (go: () => void) => {
    if (!queue) return go();
    clearTimers();
    const ok = await queue.flushAll();
    if (!ok) { setNavBlocked(true); return; }
    setNavBlocked(false); go();
  };

  // Unmount (tab switch / leaving Journal): attempt to save; drafts stay in the queue either way.
  useEffect(() => () => { clearTimers(); void queue?.flushAll(); }, [queue]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (queue && (queue.unsaved().length || queue.isBusy())) { clearTimers(); void queue.flushAll(); e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [queue]);
  // Account switches can't be blocked from here: try to save, keep any failed drafts and surface them.
  useEffect(() => { if (queue?.unsaved().length) { clearTimers(); void queue.flushAll(); } }, [accountKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load review (never creates). queue.load() never replaces an unsaved/in-flight draft.
  useEffect(() => {
    if (!user || !period || !queue) { setReviewId(null); setReviewState('ready'); return; }
    const ctrl = new AbortController();
    setReviewState('loading'); setReviewId(null); setStartError(null);
    supabase.from('trading_reviews').select('*').eq('user_id', user.id).eq('account_key', accountKey).eq('period_type', type)
      .eq('period_start', period.start).eq('period_end', period.end).abortSignal(ctrl.signal).maybeSingle()
      .then(({ data, error }) => {
        if (ctrl.signal.aborted) return;
        if (error) { setReviewState('error'); return; }
        if (data) { const r = toServerRow(data); queue.load(r); setLegacy(r.legacy); setReviewId(r.id); } else setLegacy({});
        setReviewState('ready');
      });
    return () => ctrl.abort();
  }, [user, queue, accountKey, type, period?.start, period?.end, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Source data. Refreshing never touches the review draft. Every list has a deterministic id tiebreaker.
  const sourceSeq = useRef(0);
  const loadSource = useCallback(async () => {
    if (!user || !period) return;
    const seq = ++sourceSeq.current; setSourceError(false);
    try {
      const [trades, plans, checklists, journal, pbs] = await Promise.all([
        fetchAll<ReviewTrade>((a, b) => { let q = supabase.from('trades').select(TRADE_COLS).eq('user_id', user.id).gte('trade_date', period.start).lte('trade_date', period.end);
          if (activeAccountId) q = q.eq('trading_account_id', activeAccountId); return q.order('trade_date').order('id').range(a, b) as any; }),
        fetchAll<ReviewPlan>((a, b) => { let q = supabase.from('trade_plans').select('id,account_key,ai_analysis,plan_date,pair,session,market_bias,max_trades,max_risk_per_trade,setups_to_trade,news_events').eq('user_id', user.id);
          if (activeAccountId) q = q.eq('account_key', accountKey);
          return q.gte('plan_date', period.start).lte('plan_date', period.end).order('plan_date').order('pair').order('id').range(a, b) as any; }),
        fetchAll<ReviewChecklist>((a, b) => { let q = supabase.from('trade_plan_checklists').select('id,account_key,checklist_type,period_date,pair,status,data').eq('user_id', user.id);
          if (activeAccountId) q = q.eq('account_key', accountKey);
          return q.gte('period_date', iso(new Date(new Date(period.start + 'T12:00:00').getTime() - 6 * 864e5))).lte('period_date', period.end).order('period_date').order('id').range(a, b) as any; }),
        fetchAll<ReviewJournal>((a, b) => supabase.from('journal_entries').select(JOURNAL_COLS).eq('user_id', user.id)
          .gte('entry_date', period.start).lte('entry_date', period.end).order('entry_date').order('id').range(a, b) as any),
        fetchAll<{ id: string; title: string }>((a, b) => supabase.from('playbooks').select('id,title').eq('user_id', user.id).order('id').range(a, b) as any),
      ]);
      if (seq !== sourceSeq.current) return;
      // All plans/checklists in scope are kept, including pairs that were planned but never traded.
      setSource({ trades, plans, checklists: checklists.filter(c => c.period_date >= period.start || ['weekly', 'weekly_outlook'].includes(c.checklist_type)), journal, playbooks: Object.fromEntries(pbs.map((p) => [p.id, p.title])) });
    } catch { if (seq === sourceSeq.current) setSourceError(true); }
  }, [user, period?.start, period?.end, activeAccountId, accountKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSource(null); void loadSource(); }, [loadSource, version]);
  useTradesChanged(loadSource);

  // ── History (paginated, deterministic order)
  const loadHistory = useCallback(async (offset: number) => {
    if (!user) return;
    const { data, error } = await supabase.from('trading_reviews').select('id,period_start,period_end,completion_pct,status,updated_at')
      .eq('user_id', user.id).eq('account_key', accountKey).eq('period_type', type)
      .order('period_start', { ascending: false }).order('period_end', { ascending: false }).order('id', { ascending: false }).range(offset, offset + HISTORY_PAGE);
    if (error) { setHistoryError(true); return; }
    setHistoryError(false);
    const rows = (data ?? []) as HistoryRow[];
    setHistoryMore(rows.length > HISTORY_PAGE);
    setHistory((h) => (offset ? [...h, ...rows.slice(0, HISTORY_PAGE)] : rows.slice(0, HISTORY_PAGE)));
  }, [user, accountKey, type]);
  useEffect(() => { void loadHistory(0); }, [loadHistory, version]);
  // Keep history badges in step with saved meta
  const metaFor = (h: HistoryRow) => { const e = queue?.get(h.id); return e ? { ...h, ...e.meta } : h; };

  const start = async () => {
    if (!user || !period || !queue) return;
    setStarting(true); setStartError(null);
    const { data, error } = await supabase.from('trading_reviews').insert({
      user_id: user.id, account_id: activeAccountId ?? null, account_key: accountKey, period_type: type, period_start: period.start, period_end: period.end, preset, answers: {}, action_plan: {},
    } as any).select('*').single();
    if (error) {
      const { data: existing } = await supabase.from('trading_reviews').select('*').eq('user_id', user.id).eq('account_key', accountKey).eq('period_type', type).eq('period_start', period.start).order('period_end').order('id');
      setStarting(false);
      const same = existing?.find((r: any) => r.period_end === period.end);
      if (same) { const r = toServerRow(same); queue.load(r); setLegacy(r.legacy); setReviewId(r.id); return; } // started in another tab → reopen
      const other = existing?.[0];
      setStartError(other
        ? `A ${type === 'weekly' ? 'weekly' : 'bi-weekly'} review starting ${period.start} already exists (ending ${other.period_end}). Open it from History — only one review per start date is allowed until the latest update is published.`
        : 'Could not start the review. Please try again.');
      return;
    }
    setStarting(false);
    const r = toServerRow(data); queue.load(r); setLegacy(r.legacy); setReviewId(r.id); void loadHistory(0);
  };
  const openHistory = (h: HistoryRow) => guarded(() => {
    const isPreset = PRESETS[type].find((p) => p.id !== 'custom_range' && p.id !== 'custom_week' && JSON.stringify(resolvePeriod(p.id, new Date())) === JSON.stringify({ start: h.period_start, end: h.period_end }));
    if (isPreset) setPreset(isPreset.id); else { setPreset('custom_range'); setCustomStart(h.period_start); setCustomEnd(h.period_end); }
  });
  const reloadAfterConflict = async () => {
    if (!user || !reviewId || !queue) return;
    if (!window.confirm('Replace your unsaved changes with the latest saved version?')) return;
    const { data } = await supabase.from('trading_reviews').select('*').eq('id', reviewId).eq('user_id', user.id).maybeSingle();
    if (data) { const r = toServerRow(data); queue.replaceWithServer(r); setLegacy(r.legacy); }
  };
  const changePreset = (p: Preset) => guarded(() => setPreset(p));
  const changeCustom = (which: 'start' | 'end', v: string) => guarded(() => (which === 'start' ? setCustomStart(v) : setCustomEnd(v)));

  const stats = useMemo(() => {
    if (!source) return null;
    const setupName = (t: ReviewTrade) => (t.playbook_id && source.playbooks[t.playbook_id]) || t.setup;
    const p = performance(source.trades, setupName), e = execution(source.trades, source.plans, source.checklists), psy = psychology(source.trades, source.journal);
    return { p, e, psy, plan: planning(source.trades, source.plans, source.checklists), ins: insights(p, e, psy) };
  }, [source]);

  const row = entry ? { ...entry.draft, ratings: entry.draft.ratings } : null;
  const pct = row ? completion(row.answers, row.action_plan) : 0;
  const legacyEntries = row ? Object.entries(legacy).filter(([, v]) => v && String(v).trim()) : [];
  const fmtRange = period ? `${new Date(period.start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(period.end + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : '';

  return (
    <div className="feature-reveal space-y-4 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3">
        <div className="flex flex-wrap rounded-md border border-border p-0.5" role="group" aria-label="Review period">
          {PRESETS[type].map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => void changePreset(p.id)}
              className={cn('rounded px-3 py-1.5 text-xs font-medium transition-colors', preset === p.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>{p.label}</button>
          ))}
        </div>
        {(preset === 'custom_week' || preset === 'custom_range') && (
          <div className="flex items-center gap-2 text-xs">
            <input type="date" aria-label="Start date" value={customStart} onChange={(e) => void changeCustom('start', e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-foreground" />
            {preset === 'custom_range' && <><span className="text-muted-foreground">to</span>
              <input type="date" aria-label="End date" value={customEnd} min={customStart} onChange={(e) => void changeCustom('end', e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-foreground" /></>}
          </div>
        )}
        <span className="ml-auto font-mono text-xs text-foreground">{period ? fmtRange : 'Pick dates'}</span>
      </div>

      {(navBlocked || otherUnsaved > 0) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 bg-card p-3 text-sm text-foreground">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" />
            {navBlocked ? 'Unsaved review changes could not be saved, so you stayed on this period. Your changes are kept.' : `${otherUnsaved} other review draft(s) have unsaved changes. They are kept and will save when you return to them.`}</span>
          <Button size="sm" variant="outline" onClick={() => { setNavBlocked(false); void queue?.flushAll(); }}>Retry saving</Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-4">
          {!period ? <Empty text="Choose a valid date range to review." /> : (<>
            {sourceError ? <ErrorBox text="Could not load trades and plans for this period." onRetry={loadSource} /> : !stats ? <Skeleton className="h-64 w-full" /> : (
              <div className="grid gap-4 xl:grid-cols-2">
                <Group title="Performance">
                  {stats.p.total === 0 ? <p className="text-sm text-muted-foreground">No trades logged in this period.</p> : (<>
                    <Grid>
                      <K l="Net P&L" v={money(stats.p.net)} accent={(stats.p.net ?? 0) > 0} /><K l="Trades" v={String(stats.p.total)} />
                      <K l="W / L / BE" v={`${stats.p.wins} / ${stats.p.losses} / ${stats.p.breakeven}`} /><K l="Win rate" v={fx(stats.p.winRate, 1, '%')} />
                      <K l="Avg R:R" v={fx(stats.p.avgRR)} /><K l="Profit factor" v={fx(stats.p.profitFactor)} /><K l="Expectancy" v={money(stats.p.expectancy)} />
                      <K l="Avg win" v={money(stats.p.avgWin)} /><K l="Avg loss" v={money(stats.p.avgLoss)} />
                      <K l="Best trade" v={stats.p.bestTrade ? `${stats.p.bestTrade.pair} ${money(Number(stats.p.bestTrade.result))}` : na} />
                      <K l="Worst trade" v={stats.p.worstTrade ? `${stats.p.worstTrade.pair} ${money(Number(stats.p.worstTrade.result))}` : na} />
                      <K l="Avg duration" v={na} />
                    </Grid>
                    {stats.p.unresolved > 0 && <p className="mt-2 text-xs text-muted-foreground">{stats.p.unresolved} trade(s) without a recorded result are excluded from P&L stats (not counted as breakeven).</p>}
                    <dl className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                      <R l="Best / worst pair" v={`${stats.p.bestPair ? `${stats.p.bestPair.key} ${money(stats.p.bestPair.pnl)}` : na} · ${stats.p.worstPair ? `${stats.p.worstPair.key} ${money(stats.p.worstPair.pnl)}` : na}`} />
                      <R l="Best / worst session" v={`${stats.p.bestSession ? `${stats.p.bestSession.key} ${money(stats.p.bestSession.pnl)}` : na} · ${stats.p.worstSession ? `${stats.p.worstSession.key} ${money(stats.p.worstSession.pnl)}` : na}`} />
                      <R l="Best / worst setup" v={`${stats.p.bestSetup ? `${stats.p.bestSetup.key} ${money(stats.p.bestSetup.pnl)}` : na} · ${stats.p.worstSetup ? `${stats.p.worstSetup.key} ${money(stats.p.worstSetup.pnl)}` : na}`} />
                      <R l="Side performance" v={stats.p.sides.length ? stats.p.sides.map((s) => `${s.key} ${money(s.pnl)} (${s.winRate.toFixed(0)}% of ${s.trades})`).join(' · ') : na} />
                    </dl>
                  </>)}
                </Group>
                <Group title="Execution">
                  <Grid>
                    <K l="Followed plan" v={stats.e.plan ? `${stats.e.plan.yes} yes · ${stats.e.plan.partial} partial · ${stats.e.plan.no} no` : na} />
                    <K l="Checklist done" v={frac(stats.e.checklist, 'completed')} /><K l="Outside planned session" v={frac(stats.e.outsideSession, 'count')} />
                    <K l="Daily bias aligned" v={frac(stats.e.dailyBias, 'aligned')} /><K l="Weekly bias aligned" v={frac(stats.e.weeklyBias, 'aligned')} />
                    <K l="Overtrading" v={stats.e.overtrade ? `${stats.e.overtrade.excess} extra on ${stats.e.overtrade.days.length} day(s)` : na} />
                    <K l="Revenge" v={frac(stats.e.revenge, 'count')} /><K l="Late entries" v={frac(stats.e.lateEntries, 'count')} /><K l="Early exits" v={frac(stats.e.earlyExits, 'count')} />
                    <K l="Moved stop" v={frac(stats.e.movedStop, 'count')} /><K l="Impulsive" v={frac(stats.e.impulsive, 'count')} /><K l="Missed setups" v={na} />
                  </Grid>
                </Group>
                <Group title="Psychology">
                  <Grid>
                    <K l="Confidence" v={fx(toFive(stats.psy.confidence), 1, '/5')} /><K l="Discipline" v={fx(toFive(stats.psy.discipline), 1, '/5')} />
                    <K l="Patience" v={fx(toFive(stats.psy.patience), 1, '/5')} /><K l="Stress" v={fx(toFive(stats.psy.stress), 1, '/5')} />
                    <K l="FOMO" v={frac(stats.psy.fomo, 'count')} /><K l="Revenge" v={frac(stats.psy.revenge, 'count')} />
                    <K l="Hesitation" v={frac(stats.psy.hesitation, 'count')} /><K l="Overconfidence" v={frac(stats.psy.overconfidence, 'count')} />
                    <K l="Average psychology" v={fx(toFive(stats.psy.psychScore), 1, '/5')} />
                    <K l="Best psychology day" v={stats.psy.bestPsychDay ? `${stats.psy.bestPsychDay.date} ${fx(toFive(stats.psy.bestPsychDay.score), 1, '/5')}` : na} />
                    <K l="Worst psychology day" v={stats.psy.worstPsychDay ? `${stats.psy.worstPsychDay.date} ${fx(toFive(stats.psy.worstPsychDay.score), 1, '/5')}` : na} />
                    <K l="Fear / anxiety recorded" v={stats.psy.fear ? `${stats.psy.fear.trades} / ${stats.psy.fear.tradesRecorded} trades; ${stats.psy.fear.journalDays} / ${stats.psy.fear.journalRecorded} journal entries` : na} />
                    <K l="Discipline ↔ P&L" v={stats.psy.disciplineVsPnl == null ? 'Need ≥5 varied days' : `r = ${stats.psy.disciplineVsPnl.toFixed(2)}`} />
                    <K l="Stress ↔ P&L" v={stats.psy.stressVsPnl == null ? 'Need ≥5 varied days' : `r = ${stats.psy.stressVsPnl.toFixed(2)}`} />
                  </Grid>
                  <p className="mt-3 text-xs text-muted-foreground">Psychology score averages recorded confidence, discipline, patience and inverted stress; missing scores are excluded. Correlation does not establish causation.</p>
                  <dl className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                    <R l="Emotions before" v={stats.psy.emotionsBefore.map(([k, n]) => `${k} (${n})`).join(', ') || na} />
                    <R l="Emotions after" v={stats.psy.emotionsAfter.map(([k, n]) => `${k} (${n})`).join(', ') || na} />
                  </dl>
                </Group>
                <Group title="Planning">
                  <Grid>
                    <K l="Daily plans" v={String(stats.plan.dailyPlans)} /><K l="Weekly outlooks" v={`${stats.plan.weeklyComplete} / ${stats.plan.weeklyOutlooks} complete`} />
                    <K l="Plan checklist completion" v={fx(stats.plan.checklistRate, 1, '%')} />
                    <K l="Daily outlooks" v={String(stats.plan.dailyOutlooks)} /><K l="Pair checklists" v={stats.plan.pairChecklists ? `${stats.plan.pairChecklists.complete} / ${stats.plan.pairChecklists.total}` : na} />
                    <K l="Trades with a plan" v={stats.plan.tradesWithPlan ? `${stats.plan.tradesWithPlan.count} / ${stats.plan.tradesWithPlan.total}` : na} />
                    <K l="Planned setup used" v={frac(stats.plan.setupMatch, 'matched')} /><K l="Risk over plan" v={frac(stats.plan.riskOver, 'over')} />
                  </Grid>
                  <p className="mt-3 text-xs text-muted-foreground">News recorded: <span className="text-foreground">{stats.plan.news.length ? [...new Set(stats.plan.news)].join(', ') : na}</span></p>
                  <details className="mt-3 text-xs"><summary className="cursor-pointer text-primary">Planning evidence</summary><ul className="mt-2 space-y-2">
                    {source?.plans.map((p, i) => <li key={`plan-${i}`}>{p.plan_date} · {p.pair || 'All pairs'} · {p.account_key ?? 'all'}: bias {p.market_bias || na}; setups {p.setups_to_trade?.join(', ') || na}; risk {fx(p.max_risk_per_trade, 2, '%')}; max trades {p.max_trades ?? na}</li>)}
                    {source?.checklists.filter(c => ['weekly', 'weekly_outlook'].includes(c.checklist_type)).map((c, i) => <li key={`week-${i}`}>Week {c.period_date} · {c.pair || 'All pairs'} · {c.account_key ?? 'all'}: {c.data?.bias || na}; {typeof c.data?.mainIdea === 'string' ? c.data.mainIdea : ''}</li>)}
                  </ul></details>
                </Group>
                <Group title="Daily journal context">
                  <p className="mb-2 text-xs text-muted-foreground">User-level entries across accounts. Values use their original recorded scales.</p>
                  {stats.psy.journal ? <dl className="grid gap-2 text-xs"><R l="Entries" v={String(stats.psy.journal.entries)} />
                    <R l="Average recorded confidence" v={fx(stats.psy.journal.confidence?.avg)} /><R l="Average recorded stress" v={fx(stats.psy.journal.stress?.avg)} />
                    <R l="Moods" v={stats.psy.journal.moods.map(([k,n]) => `${k} (${n})`).join(', ') || na} />
                    <R l="Emotional triggers" v={stats.psy.journal.triggers.map(([k,n]) => `${k} (${n})`).join(', ') || na} />
                  </dl> : <p className="text-xs text-muted-foreground">Not enough data yet.</p>}
                </Group>
                <Group title="Mistakes & rules">
                  <dl className="grid gap-1.5 text-xs">
                    <R l="Rule violations" v={stats.e.violations.map(([k, n]) => `${k} (${n})`).join(', ') || na} />
                    <R l="Mistake tags" v={stats.e.mistakes.map(([k, n]) => `${k} (${n})`).join(', ') || na} />
                  </dl>
                </Group>
                <Group title="Insights">
                  {stats.ins.length ? <ul className="space-y-1.5 text-sm text-foreground">{stats.ins.map((i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{i}</li>)}</ul>
                    : <p className="text-sm text-muted-foreground">Not enough data yet.</p>}
                </Group>
              </div>
            )}

            {reviewState === 'loading' ? <Skeleton className="h-40 w-full" /> : reviewState === 'error' ? <ErrorBox text="Could not load this review. Your saved answers are safe." onRetry={() => setReloadKey((k) => k + 1)} />
              : !row ? (
                <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card p-8 text-center">
                  <p className="text-sm text-foreground">No review for {fmtRange} yet.</p>
                  {startError && <p role="alert" className="max-w-md text-xs text-foreground">{startError}</p>}
                  <Button onClick={start} disabled={starting} className="gap-2">{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Start review</Button>
                </div>
              ) : (<>
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className="flex min-w-[160px] flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
                    <span className="font-mono text-xs text-foreground">{pct}%</span>
                  </div>
                  <SaveBadge state={save} onReload={reloadAfterConflict} onRetry={saveNow} />
                </div>
                <Group title="Process ratings (1–10)">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {RATINGS.map(([k, l]) => (
                      <div key={k}><p className="mb-1.5 text-xs font-medium text-muted-foreground">{l} <span className="font-mono text-foreground">{row.ratings[k] ?? U}/10</span></p>
                        <div className="flex gap-0.5">{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <button key={n} type="button" aria-label={`${l} ${n}`} aria-pressed={row.ratings[k] === n} onClick={() => edit((r) => ({ ...r, ratings: { ...r.ratings, [k]: r.ratings[k] === n ? null : n } }))}
                            className={cn('h-6 flex-1 rounded-sm border text-[10px] transition-colors', Number(row.ratings[k]) >= n ? 'border-primary bg-primary/25 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{n}</button>
                        ))}</div></div>
                    ))}
                  </div>
                </Group>
                <Group title="Reflection">
                  <div className="grid gap-3 md:grid-cols-2">
                    {QUESTIONS.map(([k, q], i) => (
                      <label key={k} className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{i + 1}. {q}</span>
                        <textarea value={row.answers[k] ?? ''} rows={2} onChange={(e) => { const v = e.target.value; edit((r) => ({ ...r, answers: { ...r.answers, [k]: v } })); }}
                          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" /></label>
                    ))}
                  </div>
                </Group>
                <Group title="Next week action plan">
                  <div className="grid gap-3 md:grid-cols-2">
                    {ACTION_FIELDS.map(([k, l, t]) => (
                      <label key={k} className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{l}</span>
                        <input type={t} min={t === 'number' ? 0 : undefined} step="any" value={row.action_plan[k] ?? ''} onChange={(e) => { const v = e.target.value; edit((r) => ({ ...r, action_plan: { ...r.action_plan, [k]: v } })); }}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" /></label>
                    ))}
                  </div>
                </Group>
                {legacyEntries.length > 0 && (
                  <Group title="Earlier answers (read-only)">
                    <dl className="grid gap-2 text-sm md:grid-cols-2">{legacyEntries.map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')} → {QUESTIONS.find(([q]) => q === LEGACY_MAP[k])?.[1]}</dt><dd className="whitespace-pre-wrap text-foreground">{v}</dd></div>
                    ))}</dl>
                  </Group>
                )}
                <div className="sticky bottom-20 flex justify-end lg:bottom-3">
                  <Button onClick={saveNow} disabled={save === 'saving'} className="tn-btn-halo gap-2"><Save className="h-4 w-4" />{save === 'saving' ? 'Saving…' : 'Save review'}</Button>
                </div>
              </>)}
          </>)}
        </div>

        <aside className="space-y-4">
          <div className="hidden justify-center lg:flex"><RobotMark /></div>
          <div className="rounded-md border border-border bg-card p-3">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground"><History className="h-3.5 w-3.5 text-primary" />History</h3>
            {historyError ? <ErrorBox text="History unavailable." onRetry={() => loadHistory(0)} /> : history.length === 0 ? <p className="text-xs text-muted-foreground">No saved reviews yet.</p> : (
              <ul className="space-y-1">
                {history.map((raw) => { const h = metaFor(raw);
                  const active = period && h.period_start === period.start && h.period_end === period.end;
                  return <li key={h.id}><button type="button" onClick={() => void openHistory(h)} className={cn('flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors', active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted')}>
                    <span className="font-mono">{h.period_start} → {h.period_end.slice(5)}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">{h.status === 'complete' && <CheckCircle2 className="h-3 w-3 text-primary" />}{h.completion_pct}%</span></button></li>;
                })}
              </ul>
            )}
            {historyMore && <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={() => loadHistory(history.length)}>Load more</Button>}
          </div>
        </aside>
      </div>
      <div className="flex justify-center lg:hidden"><RobotMark small /></div>
    </div>
  );
}

function RobotMark({ small }: { small?: boolean }) {
  return <div className={cn('relative', small ? 'h-20 w-20' : 'h-32 w-32')} aria-hidden="true">
    <div className="absolute inset-[18%] rounded-full bg-primary/15 blur-xl" />
    <img src={robotSrc} alt="" draggable={false} className="relative h-full w-full object-contain mix-blend-lighten" />
  </div>;
}
function SaveBadge({ state, onReload, onRetry }: { state: SaveState; onReload: () => void; onRetry: () => void }) {
  if (state === 'saving') return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1.5 text-xs text-primary"><CheckCircle2 className="h-3 w-3" />Saved</span>;
  if (state === 'error') return <span className="flex items-center gap-1.5 text-xs text-foreground"><AlertCircle className="h-3 w-3" />Not saved — your changes are kept<Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onRetry}>Retry</Button></span>;
  if (state === 'conflict') return <span className="flex items-center gap-2 text-xs text-foreground"><AlertCircle className="h-3 w-3" />Changed elsewhere — your changes are kept<Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onReload}>Reload latest</Button></span>;
  return <span className="text-xs text-muted-foreground">Autosaves as you type</span>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="tn-card-light rounded-md border border-border bg-card p-4"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>{children}</section>;
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">{children}</div>;
function K({ l, v, accent }: { l: string; v: string; accent?: boolean }) {
  return <div className="rounded-md border border-border bg-background/60 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
    <p className={cn('mt-1 break-words font-mono text-[13px] font-semibold leading-snug', v === na ? 'text-muted-foreground' : accent ? 'text-primary' : 'text-foreground')} title={v}>{v}</p></div>;
}
const R = ({ l, v }: { l: string; v: string }) => <div><dt className="text-muted-foreground">{l}</dt><dd className="text-foreground">{v}</dd></div>;
const Empty = ({ text }: { text: string }) => <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">{text}</p>;
function ErrorBox({ text, onRetry }: { text: string; onRetry: () => void }) {
  return <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-card p-3 text-sm text-foreground"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" />{text}</span><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>;
}
