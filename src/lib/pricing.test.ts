import { describe, expect, it } from 'vitest';
import { MONTHLY_PLAN_CENTS, monthlyPlanAmount, monthlyPlanPrice, annualMonthlyEquivalent } from './pricing';

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
  it('displays the $71.88 annual Pro quote equivalent to $5.99/month', () => {
    expect(annualMonthlyEquivalent(71.88)).toBe('$5.99');
  });
  it('displays the $119.88 annual Elite quote equivalent to $9.99/month', () => {
    expect(annualMonthlyEquivalent(119.88)).toBe('$9.99');
  });
});