import { describe, expect, it } from 'vitest';
import { weekCardAnchor, weeklyReportAnchor } from './weekSelection';

describe('calendar week card selection', () => {
  it('anchors the Oct 4–10 card to Oct 4, not today', () => {
    const d = weeklyReportAnchor(2026, 9, 4, new Date(2026, 9, 20));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 4]);
  });
  it('anchors the partial Oct 1–3 card inside the viewed month', () => {
    expect(weekCardAnchor(2026, 9, 1).getDate()).toBe(1);
    expect(weekCardAnchor(2026, 9, 1).getMonth()).toBe(9);
  });
  it('without a selected week the Weekly button keeps using today clamped to the month', () => {
    expect(weeklyReportAnchor(2026, 1, null, new Date(2026, 2, 31)).getDate()).toBe(28);
  });
});
