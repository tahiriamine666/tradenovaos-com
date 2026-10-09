import { describe, expect, it } from 'vitest';
import { completion, execution, insights, pearson, performance, planning, psychology, resolvePeriod, type ReviewTrade, QUESTIONS, ACTION_FIELDS } from './stats';
import { effectivePlanStatus, EMPTY_PSYCHOLOGY, toStored, toUi, withPlanStatus } from '@/components/journal/PsychologyFields';
import { fetchAll } from './fetchAll';

const base: ReviewTrade = {
  id: '', pair: 'EURUSD', side: 'long', result: null, rr: null, trade_date: '2026-10-05', session: 'london', setup: null, playbook_id: null, daily_bias: null,
  emotion_before: null, emotion_after: null, confidence_score: null, discipline_score: null, stress_score: null, patience_score: null,
  followed_plan: null, plan_status: null, impulsive_entry: null, fomo: null, revenge_trade: null, hesitation: null, overconfidence: null,
  late_entry: null, early_exit: null, moved_stop: null, checklist_completed: null, planned_trade: null, rule_violations: [], mistakes: [], risk_percent: null, risk_amount: null,
};
const t = (o: Partial<ReviewTrade>, i = Math.random()): ReviewTrade => ({ ...base, id: String(i), ...o });

describe('account and psychology regression checks', () => {
  it('never matches another account plan or pair outlook', () => {
    const trade = t({ trading_account_id: 'a', daily_bias: null });
    const plans: any[] = [{ account_key: 'b', pair: 'EURUSD', plan_date: trade.trade_date, market_bias: 'Bullish', max_trades: 0 }];
    expect(execution([trade], plans, []).dailyBias).toBeNull();
    expect(planning([trade], plans, []).tradesWithPlan?.count).toBe(0);
    expect(execution([trade], [], [{account_key:'a',pair:'GBPUSD',checklist_type:'weekly_outlook',period_date:trade.trade_date,status:'draft',data:{bias:'Bullish'}}]).weeklyBias).toBeNull();
    plans[0].account_key = 'a';
    expect(execution([trade], plans, []).dailyBias?.aligned).toBe(1);
    expect(execution([trade], plans, []).overtrade?.excess).toBe(1);
  });
  it('ranks psychology days by score, independently of P&L', () => {
    const p = psychology([t({trade_date:'2026-10-05',result:-100,discipline_score:10}),t({trade_date:'2026-10-06',result:100,discipline_score:2})]);
    expect(p.bestPsychDay?.date).toBe('2026-10-05');
    expect(p.worstPsychDay?.date).toBe('2026-10-06');
  });
});

describe('periods', () => {
  const thu = new Date(2026, 9, 8); // Thu Oct 8 2026
  it('resolves week presets Monday→Sunday', () => {
    expect(resolvePeriod('this_week', thu)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(resolvePeriod('last_week', thu)).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(resolvePeriod('current_2w', thu)).toEqual({ start: '2026-09-28', end: '2026-10-11' });
    expect(resolvePeriod('previous_2w', thu)).toEqual({ start: '2026-09-14', end: '2026-09-27' });
    expect(resolvePeriod('custom_week', thu, '2026-10-01')).toEqual({ start: '2026-09-28', end: '2026-10-04' });
  });
  it('rejects invalid custom ranges', () => {
    expect(resolvePeriod('custom_range', thu, '2026-10-05', '2026-10-01')).toBeNull();
    expect(resolvePeriod('custom_range', thu, '2026-10-01')).toBeNull();
  });
});

describe('performance', () => {
  it('treats null result as unresolved, not breakeven', () => {
    const p = performance([t({ result: 100 }), t({ result: 0 }), t({ result: null }), t({ result: -50 })]);
    expect(p).toMatchObject({ total: 4, resolved: 3, unresolved: 1, wins: 1, losses: 1, breakeven: 1, net: 50 });
    expect(p.winRate).toBeCloseTo(33.33, 1);
    expect(p.profitFactor).toBe(2);
    expect(p.expectancy).toBeCloseTo(16.67, 1);
  });
  it('returns unavailable (null) instead of zeros with no data', () => {
    const p = performance([t({ result: null })]);
    expect(p.net).toBeNull(); expect(p.winRate).toBeNull(); expect(p.avgRR).toBeNull(); expect(p.profitFactor).toBeNull(); expect(p.duration).toBeNull();
  });
  it('ranks best pair/session by P&L, not frequency', () => {
    const p = performance([t({ pair: 'EURUSD', session: 'london', result: 10 }), t({ pair: 'EURUSD', session: 'london', result: 10 }), t({ pair: 'XAUUSD', session: 'new_york', result: 500 })]);
    expect(p.bestPair?.key).toBe('XAUUSD'); expect(p.bestSession?.key).toBe('new_york'); expect(p.worstPair?.key).toBe('EURUSD');
  });
});

describe('execution & planning', () => {
  const plans = [{ plan_date: '2026-10-05', pair: 'EURUSD', session: 'london', market_bias: null, max_trades: 1, max_risk_per_trade: 1, setups_to_trade: ['CRT'], news_events: [{ title: 'CPI' }] }];
  it('uses plan_status with legacy boolean fallback and partial', () => {
    const e = execution([t({ plan_status: 'partial' }), t({ followed_plan: true }), t({ followed_plan: false })], [], []);
    expect(e.plan).toEqual({ yes: 1, no: 1, partial: 1, recorded: 3 });
  });
  it('reports overtrading only against recorded max trades, scoped by pair', () => {
    const e = execution([t({}), t({}), t({ pair: 'GBPUSD' })], plans, []);
    expect(e.overtrade).toMatchObject({ excess: 1, checkedDays: 1 });
    expect(execution([t({})], [], []).overtrade).toBeNull();
  });
  it('flags are unavailable unless recorded', () => {
    const e = execution([t({}), t({ revenge_trade: true })], [], []);
    expect(e.revenge).toEqual({ count: 1, recorded: 1 }); expect(e.lateEntries).toBeNull();
  });
  it('bias alignment uses daily bias and weekly outlook', () => {
    const e = execution([t({ daily_bias: 'Bullish', side: 'long' }), t({ daily_bias: 'Bearish', side: 'long' })],
      [], [{ checklist_type: 'weekly_outlook', period_date: '2026-10-05', pair: '', status: 'complete', data: { bias: 'Bearish' } }]);
    expect(e.dailyBias).toEqual({ aligned: 1, recorded: 2 }); expect(e.weeklyBias).toEqual({ aligned: 0, recorded: 2 });
  });
  it('compares planned setup / risk and collects news', () => {
    const pl = planning([t({ setup: 'crt', risk_percent: 2 })], plans, []);
    expect(pl.setupMatch).toEqual({ matched: 1, recorded: 1 }); expect(pl.riskOver).toEqual({ over: 1, recorded: 1 }); expect(pl.news).toEqual(['CPI']);
  });
});

describe('psychology', () => {
  it('needs ≥5 paired days with variance for correlation', () => {
    const days = (n: number, disc: (i: number) => number) => Array.from({ length: n }, (_, i) => t({ trade_date: `2026-10-0${i + 1}`, result: i * 10, discipline_score: disc(i) }));
    expect(psychology(days(4, (i) => i)).disciplineVsPnl).toBeNull();
    expect(psychology(days(5, () => 6)).disciplineVsPnl).toBeNull();
    expect(psychology(days(5, (i) => i * 2)).disciplineVsPnl).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [1, 2, 3, 4])).toBeNull();
  });
  it('insights say nothing without sufficient samples', () => {
    const tr = [t({ result: 10 })];
    expect(insights(performance(tr), execution(tr, [], []), psychology(tr))).toEqual([]);
  });
});

describe('trade psychology scale', () => {
  it('maps UI 1–5 to stored 1–10 and keeps legacy half values', () => {
    expect(toStored(3)).toBe(6); expect(toUi(6)).toBe(3); expect(toUi(7)).toBe(3.5); expect(toUi(null)).toBeNull();
  });
  it('partial plan keeps the existing boolean (non-destructive)', () => {
    const p = withPlanStatus({ ...EMPTY_PSYCHOLOGY, followed_plan: true }, 'partial');
    expect(p).toMatchObject({ plan_status: 'partial', followed_plan: true });
    expect(withPlanStatus(EMPTY_PSYCHOLOGY, 'no').followed_plan).toBe(false);
    expect(effectivePlanStatus({ plan_status: null, followed_plan: false })).toBe('no');
  });
});

describe('completion & pagination', () => {
  it('counts filled answers and action fields', () => {
    expect(completion({}, {})).toBe(0);
    const all = Object.fromEntries(QUESTIONS.map(([k]) => [k, 'x'])), act = Object.fromEntries(ACTION_FIELDS.map(([k]) => [k, '1']));
    expect(completion(all, act)).toBe(100);
    expect(completion({ did_well: '   ' }, {})).toBe(0);
  });
  it('fetchAll pages until a short page', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => i);
    const calls: number[] = [];
    const out = await fetchAll((a, b) => { calls.push(a); return Promise.resolve({ data: rows.slice(a, b + 1), error: null }); }, 10);
    expect(out).toHaveLength(25); expect(calls).toEqual([0, 10, 20]);
  });
});
