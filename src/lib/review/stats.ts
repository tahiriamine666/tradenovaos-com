// Pure statistics for Weekly / Bi-Weekly reviews. Unknown values are `null`
// (rendered as "Unavailable"), never fake zeros. A trade whose `result` is
// null is UNRESOLVED — it is not breakeven.

export type ReviewTrade = {
  id: string; trading_account_id?: string | null; pair: string; side: string | null; result: number | null; rr: number | null;
  trade_date: string; session: string | null; setup: string | null; playbook_id: string | null;
  daily_bias: string | null; weekly_context?: string | null;
  emotion_before: string | null; emotion_after: string | null;
  confidence_score: number | null; discipline_score: number | null; stress_score: number | null; patience_score: number | null;
  followed_plan: boolean | null; plan_status: string | null; impulsive_entry: boolean | null;
  fomo: boolean | null; revenge_trade: boolean | null; hesitation: boolean | null; overconfidence: boolean | null;
  late_entry: boolean | null; early_exit: boolean | null; moved_stop: boolean | null;
  checklist_completed: boolean | null; planned_trade: boolean | null;
  rule_violations: string[] | null; mistakes: string[] | null;
  risk_percent: number | null; risk_amount: number | null;
};
export type ReviewPlan = {
  account_key?: string; ai_analysis?: any; plan_date: string; pair: string; session: string | null; market_bias: string | null;
  max_trades: number | null; max_risk_per_trade: number | null; setups_to_trade: string[] | null;
  news_events: unknown; checklist?: unknown;
};
export type ReviewChecklist = { account_key?: string; checklist_type: string; period_date: string; pair: string; status: string; data: any };
const accountMatches = (t: ReviewTrade, p: { account_key?: string }) => (p.account_key ?? 'all') === (t.trading_account_id ?? 'all');
export const planForTrade = (t: ReviewTrade, plans: ReviewPlan[]) => plans.find(p => accountMatches(t, p) && p.plan_date === t.trade_date && p.pair === t.pair);
/** Journal entries are user-level (not tied to an account); scales are stored as entered. */
export type ReviewJournal = {
  entry_date: string; mood: string | null; confidence_level: number | null; energy_level: number | null; rule_adherence: number | null;
  stress_score: number | null; stress_label: string | null; confidence_score: number | null; emotional_trigger: string | null; mistakes_list: string[] | null;
};

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const monday = (d: Date) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));

export type PeriodType = 'weekly' | 'biweekly';
export type Preset = 'this_week' | 'last_week' | 'custom_week' | 'current_2w' | 'previous_2w' | 'custom_range';
export const PRESETS: Record<PeriodType, { id: Preset; label: string }[]> = {
  weekly: [{ id: 'this_week', label: 'This Week' }, { id: 'last_week', label: 'Last Week' }, { id: 'custom_week', label: 'Custom Week' }, { id: 'custom_range', label: 'Custom Date Range' }],
  biweekly: [{ id: 'current_2w', label: 'Current 2 Weeks' }, { id: 'previous_2w', label: 'Previous 2 Weeks' }, { id: 'custom_range', label: 'Custom Date Range' }],
};

/** Returns ISO start/end for a preset. `customStart` picks the week for custom_week; custom_range uses both. */
export function resolvePeriod(preset: Preset, today: Date, customStart?: string, customEnd?: string): { start: string; end: string } | null {
  const m = monday(today);
  switch (preset) {
    case 'this_week': return { start: iso(m), end: iso(addDays(m, 6)) };
    case 'last_week': return { start: iso(addDays(m, -7)), end: iso(addDays(m, -1)) };
    case 'current_2w': return { start: iso(addDays(m, -7)), end: iso(addDays(m, 6)) };
    case 'previous_2w': return { start: iso(addDays(m, -21)), end: iso(addDays(m, -8)) };
    case 'custom_week': { if (!customStart) return null; const s = monday(parseIso(customStart)); return { start: iso(s), end: iso(addDays(s, 6)) }; }
    case 'custom_range': if (!customStart || !customEnd || customEnd < customStart) return null; return { start: customStart, end: customEnd };
  }
}

const num = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
function group<T>(xs: T[], key: (x: T) => string | null | undefined) {
  const m = new Map<string, T[]>(); xs.forEach((x) => { const k = key(x); if (k) m.set(k, [...(m.get(k) ?? []), x]); }); return m;
}
export function counts(xs: (string | null | undefined)[]) {
  const m: Record<string, number> = {}; xs.forEach((x) => { if (x) m[x] = (m[x] ?? 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

// ── Performance ──────────────────────────────────────────────────────────────
export function performance(trades: ReviewTrade[], setupName: (t: ReviewTrade) => string | null = (t) => t.setup) {
  const resolved = trades.filter((t) => num(t.result) != null);
  const pnl = resolved.map((t) => Number(t.result));
  const wins = pnl.filter((x) => x > 0), losses = pnl.filter((x) => x < 0);
  const grossWin = sum(wins), grossLoss = Math.abs(sum(losses));
  const rank = (m: Map<string, ReviewTrade[]>) => [...m.entries()].map(([k, ts]) => ({ key: k, pnl: sum(ts.map((t) => Number(t.result))), trades: ts.length }))
    .sort((a, b) => b.pnl - a.pnl);
  const byPair = rank(group(resolved, (t) => t.pair)), bySession = rank(group(resolved, (t) => t.session)), bySetup = rank(group(resolved, setupName));
  const sorted = [...resolved].sort((a, b) => Number(b.result) - Number(a.result));
  const rrs = trades.map((t) => num(t.rr)).filter((x): x is number => x != null);
  return {
    total: trades.length, resolved: resolved.length, unresolved: trades.length - resolved.length,
    wins: wins.length, losses: losses.length, breakeven: pnl.filter((x) => x === 0).length,
    winRate: resolved.length ? (wins.length / resolved.length) * 100 : null,
    net: resolved.length ? sum(pnl) : null,
    avgRR: avg(rrs), avgWin: avg(wins), avgLoss: avg(losses),
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null, // null when no losses (undefined ratio)
    expectancy: resolved.length ? sum(pnl) / resolved.length : null,
    bestTrade: sorted[0] ?? null, worstTrade: sorted.length ? sorted[sorted.length - 1] : null,
    bestPair: byPair[0] ?? null, worstPair: byPair.length > 1 ? byPair[byPair.length - 1] : null,
    bestSession: bySession[0] ?? null, worstSession: bySession.length > 1 ? bySession[bySession.length - 1] : null,
    bestSetup: bySetup[0] ?? null, worstSetup: bySetup.length > 1 ? bySetup[bySetup.length - 1] : null,
    sides: rank(group(resolved, (t) => t.side)).map((s) => ({ ...s, winRate: (resolved.filter((t) => t.side === s.key && Number(t.result) > 0).length / s.trades) * 100 })),
    duration: null as null, // trades store no entry/exit timestamps
  };
}

// ── Execution ────────────────────────────────────────────────────────────────
export const planStatus = (t: ReviewTrade): 'yes' | 'no' | 'partial' | null =>
  (t.plan_status as any) ?? (t.followed_plan === true ? 'yes' : t.followed_plan === false ? 'no' : null);
const flagCount = (trades: ReviewTrade[], k: keyof ReviewTrade) => {
  const rec = trades.filter((t) => t[k] != null); return rec.length ? { count: rec.filter((t) => t[k] === true).length, recorded: rec.length } : null;
};
/** A trade's rule_violations is known only if it lists something or the trade was saved with the newer plan/checklist fields. */
export const violationsKnown = (trades: ReviewTrade[]) => trades.filter((t) => (t.rule_violations?.length ?? 0) > 0 || t.plan_status != null || t.planned_trade != null || t.checklist_completed != null);
const biasDir = (b: string | null | undefined) => { const s = (b ?? '').toLowerCase(); return s.includes('bull') ? 'long' : s.includes('bear') ? 'short' : null; };

export function execution(trades: ReviewTrade[], plans: ReviewPlan[], checklists: ReviewChecklist[]) {
  const ps = trades.map(planStatus).filter(Boolean) as string[];
  const planFor = (t: ReviewTrade) => planForTrade(t, plans) ?? null;
  const sessionChecked = trades.filter((t) => t.session && planFor(t)?.session);
  const dailyDirection = (t: ReviewTrade) => biasDir(t.daily_bias || planFor(t)?.market_bias);
  const dailyAligned = trades.filter((t) => t.side && dailyDirection(t));
  const weekly = checklists.filter((c) => c.checklist_type === 'weekly_outlook' || c.checklist_type === 'weekly');
  const weeklyBiasFor = (t: ReviewTrade) => {
    const w = weekly.filter((c) => accountMatches(t, c) && (!c.pair || c.pair === t.pair) && c.period_date <= t.trade_date && t.trade_date <= iso(addDays(parseIso(c.period_date), 6)));
    return biasDir(w.find(c => c.pair === t.pair)?.data?.bias || w.find(c => !c.pair)?.data?.bias || t.weekly_context);
  };
  const weeklyAligned = trades.filter((t) => t.side && weeklyBiasFor(t));
  const days = group(trades, (t) => `${t.trade_date}|${t.pair}|${t.trading_account_id ?? 'all'}`);
  const overtrade: { date: string; pair: string; trades: number; max: number }[] = [];
  let overtradeChecked = 0;
  days.forEach((ts, k) => { const [date, pair] = k.split('|'); const p = planFor(ts[0]); const max = num(p?.max_trades);
    if (max != null && max >= 0) { overtradeChecked++; if (ts.length > max) overtrade.push({ date, pair, trades: ts.length, max }); } });
  const ruleAttempts = trades.filter((t) => t.checklist_completed != null);
  return {
    plan: ps.length ? { yes: ps.filter((x) => x === 'yes').length, no: ps.filter((x) => x === 'no').length, partial: ps.filter((x) => x === 'partial').length, recorded: ps.length } : null,
    violations: counts(trades.flatMap((t) => t.rule_violations ?? [])),
    violationsRecorded: violationsKnown(trades).length, // historic rows default to [] — that is NOT a known zero
    mistakes: counts(trades.flatMap((t) => t.mistakes ?? [])),
    checklist: ruleAttempts.length ? { completed: ruleAttempts.filter((t) => t.checklist_completed).length, recorded: ruleAttempts.length } : null,
    outsideSession: sessionChecked.length ? { count: sessionChecked.filter((t) => planFor(t)!.session!.toLowerCase() !== t.session!.toLowerCase()).length, recorded: sessionChecked.length } : null,
    dailyBias: dailyAligned.length ? { aligned: dailyAligned.filter((t) => dailyDirection(t) === t.side).length, recorded: dailyAligned.length } : null,
    weeklyBias: weeklyAligned.length ? { aligned: weeklyAligned.filter((t) => weeklyBiasFor(t) === t.side).length, recorded: weeklyAligned.length } : null,
    overtrade: overtradeChecked ? { days: overtrade, excess: sum(overtrade.map((d) => d.trades - d.max)), checkedDays: overtradeChecked } : null,
    revenge: flagCount(trades, 'revenge_trade'), lateEntries: flagCount(trades, 'late_entry'), earlyExits: flagCount(trades, 'early_exit'),
    movedStop: flagCount(trades, 'moved_stop'), impulsive: flagCount(trades, 'impulsive_entry'),
    missedSetups: null as null, // not recorded anywhere in the data model
  };
}

// ── Planning ─────────────────────────────────────────────────────────────────
export function planning(trades: ReviewTrade[], plans: ReviewPlan[], checklists: ReviewChecklist[]) {
  const withPlan = trades.filter((t) => planForTrade(t, plans));
  const setupComparable = trades.filter((t) => t.setup && planForTrade(t, plans)?.setups_to_trade?.length);
  const riskComparable = trades.filter((t) => num(t.risk_percent) != null && num(planForTrade(t, plans)?.max_risk_per_trade) != null);
  const news = plans.flatMap((p) => { const n = p.ai_analysis?.daily_v2?.news ?? p.news_events; return Array.isArray(n) ? n : []; });
  const checklistItems = plans.flatMap(p => { const d = p.ai_analysis?.daily_v2; return Array.isArray(d?.checklist) ? d.checklist.map((c: any) => d.checked?.[c.id] === true) : []; });
  const weekly = checklists.filter((c) => c.checklist_type === 'weekly_outlook' || c.checklist_type === 'weekly');
  weekly.forEach((c) => { if (Array.isArray(c.data?.news)) news.push(...c.data.news); });
  const pairChecks = checklists.filter((c) => c.checklist_type === 'pair_checklist');
  return {
    dailyPlans: plans.length, planDays: new Set(plans.map((p) => p.plan_date)).size,
    weeklyOutlooks: weekly.length, weeklyComplete: weekly.filter((c) => c.status === 'complete').length,
    dailyOutlooks: checklists.filter((c) => c.checklist_type === 'daily').length,
    pairChecklists: pairChecks.length ? { complete: pairChecks.filter((c) => c.status === 'complete').length, total: pairChecks.length } : null,
    tradesWithPlan: trades.length ? { count: withPlan.length, total: trades.length } : null,
    setupMatch: setupComparable.length ? { matched: setupComparable.filter((t) => planForTrade(t, plans)!.setups_to_trade!.some((s) => s.toLowerCase() === t.setup!.toLowerCase())).length, recorded: setupComparable.length } : null,
    riskOver: riskComparable.length ? { over: riskComparable.filter((t) => Number(t.risk_percent) > Number(planForTrade(t, plans)!.max_risk_per_trade)).length, recorded: riskComparable.length } : null,
    checklistRate: checklistItems.length ? 100 * checklistItems.filter(Boolean).length / checklistItems.length : null,
    news: news.map((n: any) => (typeof n === 'string' ? n : n?.title)).filter(Boolean) as string[],
    plannedPairs: [...new Set(plans.map((p) => p.pair).filter(Boolean))].sort(),
    untradedPlans: plans.filter((p) => !trades.some((t) => accountMatches(t, p) && t.trade_date === p.plan_date && t.pair === p.pair)).map((p) => ({ date: p.plan_date, pair: p.pair })),
    weeklyBiases: weekly.map((c) => ({ week: c.period_date, bias: (c.data?.bias as string) || null })).filter((w) => w.bias),
  };
}

// ── Psychology (scores stored 1–10; UI shows /5 as value/2) ─────────────────
export const toFive = (v: number | null) => (v == null ? null : v / 2);
export function pearson(xs: number[], ys: number[]) {
  const n = xs.length; if (n < 5 || n !== ys.length) return null;
  const mx = sum(xs) / n, my = sum(ys) / n;
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))), sxx = sum(xs.map((x) => (x - mx) ** 2)), syy = sum(ys.map((y) => (y - my) ** 2));
  if (sxx === 0 || syy === 0) return null; return sxy / Math.sqrt(sxx * syy);
}
const FEAR = /fear|anxious|anxiety|scared|nervous/i;
/** Per-trade psychology score on 1–10: mean of confidence, discipline, patience and inverted stress (11 − stress). */
export const tradePsychScore = (t: ReviewTrade) => avg([num(t.confidence_score), num(t.discipline_score), num(t.patience_score), num(t.stress_score) == null ? null : 11 - Number(t.stress_score)].filter((x): x is number => x != null));
export function psychology(trades: ReviewTrade[], journal: ReviewJournal[] = []) {
  const scores = (k: keyof ReviewTrade) => avg(trades.map((t) => num(t[k])).filter((x): x is number => x != null));
  const byDay = [...group(trades.filter((t) => num(t.result) != null), (t) => t.trade_date).entries()].map(([date, ts]) => ({
    date, pnl: sum(ts.map((t) => Number(t.result))), discipline: avg(ts.map((t) => num(t.discipline_score)).filter((x): x is number => x != null)),
    stress: avg(ts.map((t) => num(t.stress_score)).filter((x): x is number => x != null)),
  })).sort((a, b) => b.pnl - a.pnl);
  const corr = (k: 'discipline' | 'stress') => { const d = byDay.filter((x) => x[k] != null); return pearson(d.map((x) => x[k]!), d.map((x) => x.pnl)); };
  return {
    confidence: scores('confidence_score'), discipline: scores('discipline_score'), patience: scores('patience_score'), stress: scores('stress_score'),
    fomo: flagCount(trades, 'fomo'), revenge: flagCount(trades, 'revenge_trade'), hesitation: flagCount(trades, 'hesitation'), overconfidence: flagCount(trades, 'overconfidence'),
    emotionsBefore: counts(trades.map((t) => t.emotion_before)), emotionsAfter: counts(trades.map((t) => t.emotion_after)),
    bestDay: byDay[0] ?? null, worstDay: byDay.length > 1 ? byDay[byDay.length - 1] : null,
    disciplineVsPnl: corr('discipline'), stressVsPnl: corr('stress'),
    ...psychDays(trades),
    fear: (() => { const tr = trades.filter((t) => t.emotion_before != null || t.emotion_after != null); const jr = journal.filter((j) => j.mood || j.emotional_trigger);
      if (!tr.length && !jr.length) return null;
      return { trades: tr.filter((t) => FEAR.test(`${t.emotion_before ?? ''} ${t.emotion_after ?? ''}`)).length, tradesRecorded: tr.length,
        journalDays: jr.filter((j) => FEAR.test(`${j.mood ?? ''} ${j.emotional_trigger ?? ''}`)).length, journalRecorded: jr.length }; })(),
    journal: journalSummary(journal),
  };
}

/** Best / worst days ranked by average psychology score (not P&L). Needs ≥2 scored days for a worst day. */
export function psychDays(trades: ReviewTrade[]) {
  const days = [...group(trades, (t) => t.trade_date).entries()].map(([date, ts]) => ({ date, score: avg(ts.map(tradePsychScore).filter((x): x is number => x != null)), trades: ts.length }))
    .filter((d): d is { date: string; score: number; trades: number } => d.score != null).sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const all = trades.map(tradePsychScore).filter((x): x is number => x != null);
  return { psychScore: avg(all), psychScored: all.length, bestPsychDay: days[0] ?? null, worstPsychDay: days.length > 1 ? days[days.length - 1] : null };
}
export function journalSummary(journal: ReviewJournal[]) {
  if (!journal.length) return null;
  const a = (k: keyof ReviewJournal) => { const xs = journal.map((j) => num(j[k])).filter((x): x is number => x != null); return xs.length ? { avg: avg(xs)!, n: xs.length } : null; };
  return {
    entries: journal.length, confidence: a('confidence_level'), energy: a('energy_level'), ruleAdherence: a('rule_adherence'), stress: a('stress_score'),
    moods: counts(journal.map((j) => j.mood)), stressLabels: counts(journal.map((j) => j.stress_label)),
    triggers: counts(journal.map((j) => j.emotional_trigger)), mistakes: counts(journal.flatMap((j) => j.mistakes_list ?? [])),
  };
}

// ── Rule-based insights (only with sufficient real samples) ─────────────────
export function insights(p: ReturnType<typeof performance>, e: ReturnType<typeof execution>, psy: ReturnType<typeof psychology>): string[] {
  const out: string[] = [];
  if (p.resolved >= 5 && p.winRate != null) out.push(`Win rate ${p.winRate.toFixed(0)}% across ${p.resolved} resolved trades.`);
  if (p.bestSetup && p.bestSetup.trades >= 3) out.push(`Best setup by P&L: ${p.bestSetup.key} (${p.bestSetup.trades} trades).`);
  if (e.plan && e.plan.recorded >= 5 && e.plan.no / e.plan.recorded >= 0.3) out.push(`Plan not followed on ${e.plan.no} of ${e.plan.recorded} recorded trades.`);
  if (e.violations[0] && e.violations[0][1] >= 2) out.push(`Most broken rule: ${e.violations[0][0]} (${e.violations[0][1]}×).`);
  if (e.overtrade && e.overtrade.days.length) out.push(`Exceeded planned max trades on ${e.overtrade.days.length} day(s), ${e.overtrade.excess} extra trade(s).`);
  if (psy.disciplineVsPnl != null && Math.abs(psy.disciplineVsPnl) >= 0.5) out.push(`Discipline and daily P&L move ${psy.disciplineVsPnl > 0 ? 'together' : 'opposite'} (r=${psy.disciplineVsPnl.toFixed(2)}).`);
  if (psy.fomo && psy.fomo.recorded >= 5 && psy.fomo.count >= 2) out.push(`FOMO flagged on ${psy.fomo.count} of ${psy.fomo.recorded} trades.`);
  return out;
}

// ── Reflection / action plan ─────────────────────────────────────────────────
export const QUESTIONS = [
  ['did_well', 'What did I do well?'], ['went_wrong', 'What went wrong?'], ['repeated_mistakes', 'What mistakes repeated?'],
  ['rule_broken_most', 'Which rule did I break most?'], ['best_setup', 'Which setup worked best?'], ['worst_setup', 'Which setup performed worst?'],
  ['learned', 'What did I learn?'], ['stop_doing', 'What should I stop doing?'], ['continue_doing', 'What should I continue doing?'],
  ['improve_next', 'What should I improve next week?'], ['main_focus', 'Main focus for next week'], ['process_goal', 'One process goal'],
  ['risk_goal', 'One risk goal'], ['psychology_goal', 'One psychology goal'],
] as const;
export const ACTION_FIELDS = [
  ['primary_focus', 'Primary focus', 'text'], ['max_trades_per_day', 'Max trades per day', 'number'], ['max_daily_loss', 'Max daily loss', 'number'],
  ['risk_per_trade', 'Risk per trade (%)', 'number'], ['preferred_sessions', 'Preferred sessions', 'text'], ['avoid_conditions', 'Avoid these conditions', 'text'],
  ['rules_focus', 'Rules to focus on', 'text'], ['psychology_focus', 'Psychology focus', 'text'], ['setup_focus', 'Setup focus', 'text'],
  ['commitment', 'One sentence commitment', 'text'],
] as const;
/** Legacy text columns → new question ids (shown read-only; never auto-copied over a new answer). */
export const LEGACY_MAP: Record<string, string> = {
  what_worked: 'did_well', what_didnt_work: 'went_wrong', recurring_patterns: 'repeated_mistakes', rules_broken: 'rule_broken_most',
  biggest_mistake: 'went_wrong', best_decision: 'did_well', rules_followed: 'continue_doing', what_to_fix: 'improve_next',
  what_to_modify: 'improve_next', next_period_focus: 'main_focus', keep_doing: 'continue_doing', stop_doing: 'stop_doing',
  start_doing: 'improve_next', overall_notes: 'learned',
};
const filled = (v: unknown) => v != null && String(v).trim() !== '';
export function completion(answers: Record<string, unknown>, action: Record<string, unknown>) {
  const total = QUESTIONS.length + ACTION_FIELDS.length;
  const done = QUESTIONS.filter(([k]) => filled(answers[k])).length + ACTION_FIELDS.filter(([k]) => filled(action[k])).length;
  return Math.round((done / total) * 100);
}
