import { describe, expect, it } from 'vitest';
import { feedbackSchema } from './traderFeedback';

const base = { displayName: 'Sam', email: 'sam@example.com', tradingCategory: '', rating: null, message: 'This journal helped me review my trades.' };

describe('feedbackSchema', () => {
  it('accepts a valid submission without a rating', () => {
    expect(feedbackSchema.safeParse(base).success).toBe(true);
  });
  it('rejects messages shorter than 20 characters', () => {
    expect(feedbackSchema.safeParse({ ...base, message: 'too short' }).success).toBe(false);
  });
  it('rejects ratings outside 1-5', () => {
    expect(feedbackSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
  });
  it('rejects invalid emails', () => {
    expect(feedbackSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
});
