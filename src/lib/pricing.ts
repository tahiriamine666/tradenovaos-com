/** Display pricing only. Dodo products remain authoritative for checkout and billing. */
export const MONTHLY_PLAN_CENTS = { pro: 599, elite: 999 } as const;

export type PricedPlan = keyof typeof MONTHLY_PLAN_CENTS;

export function monthlyPlanAmount(plan: PricedPlan): number {
  return MONTHLY_PLAN_CENTS[plan] / 100;
}

export function monthlyPlanPrice(plan: PricedPlan): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(monthlyPlanAmount(plan));
}

/** Annual equivalents must be calculated from the provider quote, not monthly offers. */
export function annualMonthlyEquivalent(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount / 12);
}