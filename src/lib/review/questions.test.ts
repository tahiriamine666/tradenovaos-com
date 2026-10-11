import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTIONS, activeQuestions, applyEdit, labelFor, normalizeTemplate, otherAnswers, restoreDefaults } from './questions';
import { completion, execution, performance, planning, psychology, type ReviewTrade } from './stats';
import { MIN_SAMPLE, executionScore, overallScore, performanceScore, planningScore, psychologyScore, statusOf } from './scores';

describe('review question template', () => {
  it('users without a template get the four defaults', () => {
    for (const raw of [null, undefined, [], 'bad', [{ nope: 1 }]]) {
      expect(activeQuestions(normalizeTemplate(raw)).map(q => q.text)).toEqual([
        'What did I do well this week?', 'What were my biggest mistakes?', 'What did I learn this week?', 'What will I improve next week?']);
    }
  });
  it('edit, add, remove and reorder by stable id; removed questions are kept inactive', () => {
    const t = normalizeTemplate(DEFAULT_QUESTIONS);
    const next = applyEdit(t, [{ id: 'improve_next', text: 'Fix next week?' }, { id: 'did_well', text: 'Wins?' }, { id: 'q_new', text: 'Custom?' }, { id: 'q_blank', text: '  ' }]);
    expect(activeQuestions(next).map(q => [q.id, q.text])).toEqual([['improve_next', 'Fix next week?'], ['did_well', 'Wins?'], ['q_new', 'Custom?']]);
    expect(next.filter(q => !q.active).map(q => q.id).sort()).toEqual(['learned', 'went_wrong']);
    expect(next.some(q => q.id === 'q_blank')).toBe(false);
    // persisted round-trip keeps order and inactive entries
    expect(normalizeTemplate(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it('answers stay linked to their question id after rewording and reordering', () => {
    const answers = { did_well: 'A', improve_next: 'B' };
    const next = applyEdit(normalizeTemplate(null), [{ id: 'improve_next', text: 'Renamed' }, { id: 'did_well', text: 'Wins?' }]);
    const shown = activeQuestions(next).map(q => [q.text, (answers as any)[q.id]]);
    expect(shown).toEqual([['Renamed', 'B'], ['Wins?', 'A']]);
  });
  it('historical 14-question answers and removed questions stay readable', () => {
    const t = applyEdit(normalizeTemplate(null), [{ id: 'did_well', text: 'Wins?' }]);
    const o = otherAnswers({ did_well: 'x', went_wrong: 'gone', best_setup: 'CRT', stop_doing: '  ' }, t);
    expect(o).toEqual([
      { id: 'went_wrong', label: 'What were my biggest mistakes?', value: 'gone' },
      { id: 'best_setup', label: 'Which setup worked best?', value: 'CRT' },
    ]);
    expect(labelFor('q_unknown_x', t)).toBe('q unknown x');
  });
  it('restore defaults reactivates the four defaults and keeps custom ones inactive', () => {
    const t = applyEdit(normalizeTemplate(null), [{ id: 'q_c', text: 'Custom' }]);
    const r = restoreDefaults(t);
    expect(activeQuestions(r).map(q => q.id)).toEqual(['did_well', 'went_wrong', 'learned', 'improve_next']);
    expect(r.find(q => q.id === 'q_c')).toMatchObject({ active: false, text: 'Custom' });
  });
  it('completion counts only the active questions and given action keys', () => {
    expect(completion({ did_well: 'x', best_setup: 'old' }, { primary_focus: 'y' }, ['did_well', 'learned'], ['primary_focus', 'risk_goal'])).toBe(50);
    expect(completion({}, {}, [], [])).toBe(0);
  });
});

const base: ReviewTrade = {
  id: '', pair: 'EURUSD', side: 'long', result: null, rr: null, trade_date: '2026-10-05', session: 'london', setup: null, playbook_id: null, daily_bias: null,
  emotion_before: null, emotion_after: null, confidence_score: null, discipline_score: null, stress_score: null, patience_score: null,
  followed_plan: null, plan_status: null, impulsive_entry: null, fomo: null, revenge_trade: null, hesitation: null, overconfidence: null,
  late_entry: null, early_exit: null, moved_stop: null, checklist_completed: null, planned_trade: null, rule_violations: [], mistakes: [], risk_percent: null, risk_amount: null,
} as ReviewTrade;
const t = (o: Partial<ReviewTrade>, i: number) => ({ ...base, id: String(i), ...o });

describe('weekly scorecard', () => {
  it('shows Not enough data (null), never 0, without evidence', () => {
    const tr = [t({ result: 10 }, 1)];
    expect(performanceScore(performance(tr), 0).score).toBeNull();
    expect(executionScore(execution(tr, [], [])).score).toBeNull();
    expect(psychologyScore(psychology(tr)).score).toBeNull();
    expect(planningScore(planning([], [], []), 0, 0).score).toBeNull();
    expect(statusOf(null)).toBe('Not enough data');
    expect(MIN_SAMPLE).toBe(3);
  });
  it('computes deterministic scores from real recorded fields', () => {
    const tr = [
      t({ result: 100, rr: 2, plan_status: 'yes', checklist_completed: true, impulsive_entry: false, discipline_score: 10, confidence_score: 10, patience_score: 10, stress_score: 1, fomo: false }, 1),
      t({ result: 100, rr: 2, plan_status: 'partial', checklist_completed: true, impulsive_entry: false, discipline_score: 10, confidence_score: 10, patience_score: 10, stress_score: 1, fomo: false }, 2),
      t({ result: -100, rr: 2, plan_status: 'no', checklist_completed: false, impulsive_entry: true, discipline_score: 10, confidence_score: 10, patience_score: 10, stress_score: 1, fomo: true }, 3),
    ];
    const p = performanceScore(performance(tr), 3);
    // win rate 66.7, profit factor 2 -> 100, avg RR 2 -> 100 => 89
    expect(p.score).toBe(89);
    const e = executionScore(execution(tr, [], []));
    // plan (1+0.5)/3=50, checklist 66.7, impulsive avoided 66.7 => 61
    expect(e.score).toBe(61);
    const psy = psychologyScore(psychology(tr));
    // core 100, emotional control 100-33.3 => 83
    expect(psy.score).toBe(83);
    expect(statusOf(89)).toBe('Excellent'); expect(statusOf(61)).toBe('Good'); expect(statusOf(40)).toBe('Needs improvement');
  });
  it('overall only when all four categories have scores', () => {
    const c = (score: number | null) => ({ key: 'k', title: '', summary: '', components: [], score });
    expect(overallScore([c(80), c(60), c(70), c(90)])).toBe(75);
    expect(overallScore([c(80), c(null), c(70), c(90)])).toBeNull();
  });
  it('planning counts a missing Weekly Outlook as 0 only when there was trading activity', () => {
    const tr = [1, 2, 3].map(i => t({ result: 10 }, i));
    const s = planningScore(planning(tr, [], []), 3, 1);
    expect(s.components.find(x => x.label.startsWith('Weekly Outlook'))!.value).toBe(0);
    expect(s.components.find(x => x.label.startsWith('Trades with'))!.value).toBe(0);
  });
});
