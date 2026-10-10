import { describe, expect, it } from 'vitest';
import { MONTHLY_PLAN_CENTS, monthlyPlanAmount, monthlyPlanPrice } from './pricing';

describe('Production monthly display pricing', () => {
  it('prices Pro at exactly $5.99 without rounding away cents', () => {
    expect(MONTHLY_PLAN_CENTS.pro).toBe(599);
    expect(monthlyPlanAmount('pro')).toBe(5.99);
    expect(monthlyPlanPrice('pro')).toBe('$5.99');
  });
  it('prices Elite at exactly $9.99 without rounding away cents', () => {
    expect(MONTHLY_PLAN_CENTS.elite).toBe(999);
    expect(monthlyPlanAmount('elite')).toBe(9.99);
    expect(monthlyPlanPrice('elite')).toBe('$9.99');
  });
});