import { describe, expect, it } from 'vitest';
import { DEMO_REVIEWS, selectFeedbackReviews } from './HomepageTraderFeedback';

describe('feedback demo fallback', () => {
  it('shows exactly eight fictional records without approved reviews', () => {
    const result = selectFeedbackReviews([]);
    expect(result.isDemo).toBe(true);
    expect(result.displayed).toHaveLength(8);
  });
  it('does not invent ratings for fictional records', () => {
    expect(DEMO_REVIEWS.every(review => review.rating === null)).toBe(true);
  });
  it('replaces every demo with approved feedback without changing an absent rating', () => {
    const approved = [{ id: 'approved-fixture', display_name: 'QA fixture', trading_category: null, rating: null, message: 'Isolated approved record fixture.' }];
    const result = selectFeedbackReviews(approved);
    expect(result.isDemo).toBe(false);
    expect(result.displayed).toEqual(approved);
    expect(result.displayed).toHaveLength(1);
    expect(result.displayed[0].rating).toBeNull();
  });
  it('uses natural sample names with a trading subtitle and no demo wording', () => {
    expect(DEMO_REVIEWS.map(review => review.display_name)).toEqual([
      'Alex M.', 'Sam R.', 'Jordan K.', 'Taylor B.', 'Casey L.', 'Morgan P.', 'Riley T.', 'Jamie C.',
    ]);
    expect(DEMO_REVIEWS.every(review => !/\bdemo\b/i.test(review.display_name))).toBe(true);
    expect(DEMO_REVIEWS.every(review => !!review.trading_category && !/\bdemo\b/i.test(review.trading_category))).toBe(true);
  });
});