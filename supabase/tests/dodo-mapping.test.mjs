import { afterEach, describe, expect, it, vi } from 'vitest';

// Synthetic environment only: never read deployed secrets or contact the provider.
const products: Record<string, string> = {
  DODO_PRODUCT_PRO_MONTHLY: 'test-pro-monthly',
  DODO_PRODUCT_ELITE_MONTHLY: 'test-elite-monthly',
  DODO_PRODUCT_PRO_YEARLY: 'test-pro-yearly',
  DODO_PRODUCT_ELITE_YEARLY: 'test-elite-yearly',
};

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Unchanged authoritative Dodo product mapping', () => {
  it('resolves all four configured products independently of display prices', async () => {
    vi.stubGlobal('Deno', { env: { get: (key: string) => products[key] } });
    const { productIdForPlan, planFromProductId } = await import('../../supabase/functions/_shared/dodo');
    expect(productIdForPlan('pro', 'monthly')).toBe('test-pro-monthly');
    expect(productIdForPlan('elite', 'monthly')).toBe('test-elite-monthly');
    expect(productIdForPlan('pro', 'yearly')).toBe('test-pro-yearly');
    expect(productIdForPlan('elite', 'yearly')).toBe('test-elite-yearly');
    expect(planFromProductId('test-pro-monthly')).toEqual({ plan: 'pro', billing: 'monthly' });
    expect(planFromProductId('test-elite-monthly')).toEqual({ plan: 'elite', billing: 'monthly' });
    expect(planFromProductId('test-pro-yearly')).toEqual({ plan: 'pro', billing: 'yearly' });
    expect(planFromProductId('test-elite-yearly')).toEqual({ plan: 'elite', billing: 'yearly' });
    expect(planFromProductId('unconfigured-product')).toBeNull();
  });
  it('does not invent a product when configuration is absent', async () => {
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    const { productIdForPlan } = await import('../../supabase/functions/_shared/dodo');
    expect(productIdForPlan('pro', 'monthly')).toBeNull();
    expect(productIdForPlan('elite', 'yearly')).toBeNull();
  });
});