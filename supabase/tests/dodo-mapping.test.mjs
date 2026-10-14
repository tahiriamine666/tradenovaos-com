import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { productIdForPlan, planFromProductId } from '../functions/_shared/dodo.ts';

// Synthetic environment only: never read deployed secrets or contact the provider.
const products = {
  DODO_PRODUCT_PRO_MONTHLY: 'test-pro-monthly',
  DODO_PRODUCT_ELITE_MONTHLY: 'test-elite-monthly',
  DODO_PRODUCT_PRO_YEARLY: 'test-pro-yearly',
  DODO_PRODUCT_ELITE_YEARLY: 'test-elite-yearly',
};

afterEach(() => { delete globalThis.Deno; });

test('resolves all four configured products independently of display prices', () => {
    globalThis.Deno = { env: { get: (key) => products[key] } };
    assert.equal(productIdForPlan('pro', 'monthly'), 'test-pro-monthly');
    assert.equal(productIdForPlan('elite', 'monthly'), 'test-elite-monthly');
    assert.equal(productIdForPlan('pro', 'yearly'), 'test-pro-yearly');
    assert.equal(productIdForPlan('elite', 'yearly'), 'test-elite-yearly');
    assert.deepEqual(planFromProductId('test-pro-monthly'), { plan: 'pro', billing: 'monthly' });
    assert.deepEqual(planFromProductId('test-elite-monthly'), { plan: 'elite', billing: 'monthly' });
    assert.deepEqual(planFromProductId('test-pro-yearly'), { plan: 'pro', billing: 'yearly' });
    assert.deepEqual(planFromProductId('test-elite-yearly'), { plan: 'elite', billing: 'yearly' });
    assert.equal(planFromProductId('unconfigured-product'), null);
  });
test('does not invent a product when configuration is absent', () => {
    globalThis.Deno = { env: { get: () => undefined } };
    assert.equal(productIdForPlan('pro', 'monthly'), null);
    assert.equal(productIdForPlan('elite', 'yearly'), null);
  });