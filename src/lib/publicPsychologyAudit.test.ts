import { describe, expect, it } from 'vitest';
import { AUDIT_QUESTIONS, scoreAudit } from './publicPsychologyAudit';

const answers = (value: number) => Object.fromEntries(AUDIT_QUESTIONS.map(q => [q.id, value]));
describe('anonymous psychology reflection scoring', () => {
  it('requires every question and rejects invalid values', () => {
    expect(scoreAudit({})).toBeNull();
    for (const value of [0, 6, 2.5, NaN, Infinity]) expect(scoreAudit(answers(value))).toBeNull();
    const partial = answers(3); delete partial[AUDIT_QUESTIONS[0].id];
    expect(scoreAudit(partial)).toBeNull();
  });
  it('uses the published zero to one hundred formula', () => {
    expect(scoreAudit(answers(1))?.score).toBe(0);
    expect(scoreAudit(answers(3))?.score).toBe(50);
    expect(scoreAudit(answers(5))?.score).toBe(100);
  });
  it('scores areas independently and ignores unrelated keys', () => {
    const input = { ...answers(1), 'discipline-0': 5, 'discipline-1': 5, unrelated: 999 };
    const result = scoreAudit(input)!;
    expect(result.score).toBe(17);
    expect(result.areas[0].score).toBe(100);
    expect(result.areas.slice(1).every(area => area.score === 0)).toBe(true);
    expect(input['discipline-0']).toBe(5);
  });
});
