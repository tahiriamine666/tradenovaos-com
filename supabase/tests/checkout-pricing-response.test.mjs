import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the real handler with synthetic auth/provider dependencies, never network.
const source = readFileSync(new URL('../functions/dodo-checkout/index.ts', import.meta.url), 'utf8');
const { stripTypeScriptTypes } = await import('node:module');
const code = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''), { mode: 'strip' });
const ids = { pro_monthly: 'pdt_0NiAkpxz9gAN0Spuarqm5', elite_monthly: 'pdt_0NiAlZAx8DbY0elDOHsMG', pro_yearly: 'pdt_0NiAmV62ykhrW7sAAVde7', elite_yearly: 'pdt_0NiAmBjsscYee7NKrWj7J' };
const quoteCents = { [ids.pro_monthly]: 599, [ids.elite_monthly]: 999, [ids.pro_yearly]: 7188, [ids.elite_yearly]: 11988 };
function harness() {
  let handler;
  const calls = [];
  const sandbox = {
    Response, console,
    Deno: { env: { get: () => 'synthetic-only' }, serve: fn => { handler = fn; } },
    createClient: () => ({ auth: { getClaims: async token => token === 'valid-synthetic' ? { data: { claims: { sub: 'synthetic-user' } } } : { error: true } } }),
    productIdForPlan: (plan, billing) => ids[`${plan}_${billing}`],
    dodoApiBase: () => 'https://synthetic.invalid', dodoAuthHeaders: () => ({}),
    fetch: async (url, init = {}) => {
      calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
      return Response.json(init.method === 'POST' ? { checkout_url: 'https://synthetic.invalid/checkout' } : { price: { price: quoteCents[url.split('/').at(-1)], currency: 'USD', trial_period_days: 14 } });
    },
  };
  vm.runInNewContext(code, sandbox);
  return { calls, run: (body, authorized = true) => handler(new Request('https://synthetic.invalid', { method: 'POST', headers: authorized ? { Authorization: 'Bearer valid-synthetic' } : {}, body: JSON.stringify(body) })) };
}
test('authorized quote returns exact public IDs only and unauthorized read performs no provider call', async () => {
  const h = harness();
  assert.equal((await h.run({ action: 'prices' }, false)).status, 401);
  assert.equal(h.calls.length, 0);
  const data = await (await h.run({ action: 'prices' })).json();
  assert.equal(data.prices.pro_monthly.product_id, 'pdt_0NiAkpxz9gAN0Spuarqm5');
  assert.equal(data.prices.elite_monthly.product_id, 'pdt_0NiAlZAx8DbY0elDOHsMG');
  assert.deepEqual(Object.keys(data.prices.pro_monthly).sort(), ['amount','currency','product_id','trial_days']);
  assert.equal(h.calls.length, 4);
});
test('Pro annual quote preserves the existing product ID and exact USD 71.88', async () => {
  const data = await (await harness().run({ action: 'prices' })).json();
  assert.equal(data.prices.pro_yearly.product_id, 'pdt_0NiAmV62ykhrW7sAAVde7');
  assert.equal(data.prices.pro_yearly.amount, 71.88);
  assert.equal(data.prices.pro_yearly.currency, 'USD');
});
test('Elite annual quote preserves the existing product ID and exact USD 119.88', async () => {
  const data = await (await harness().run({ action: 'prices' })).json();
  assert.equal(data.prices.elite_yearly.product_id, 'pdt_0NiAmBjsscYee7NKrWj7J');
  assert.equal(data.prices.elite_yearly.amount, 119.88);
  assert.equal(data.prices.elite_yearly.currency, 'USD');
});
test('annual onboarding explicitly overrides trial to 14 days without changing product mapping', async () => {
  const h = harness();
  await h.run({ plan: 'pro', billing: 'yearly', onboarding: true });
  assert.equal(h.calls[0].body.subscription_data.trial_period_days, 14);
  assert.equal(h.calls[0].body.product_cart[0].product_id, 'pdt_0NiAmV62ykhrW7sAAVde7');
});
test('non-onboarding annual checkout retains provider defaults with no trial override', async () => {
  const h = harness();
  await h.run({ plan: 'elite', billing: 'yearly' });
  assert.equal(h.calls[0].body.subscription_data, undefined);
  assert.equal(h.calls[0].body.product_cart[0].product_id, 'pdt_0NiAmBjsscYee7NKrWj7J');
});
