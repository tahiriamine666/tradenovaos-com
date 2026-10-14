import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real handlers with imports injected; never contact a live service.
function load(relative, bindings) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, Response, console, ...bindings };
  vm.runInNewContext(output, context);
  return context.exports;
}

test('MT flag fails closed for missing, malformed and inaccessible environment', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1', ' true ']) {
    const guard = load('../functions/_shared/mtFeature.ts', { Deno: { env: { get: () => value } } });
    assert.equal(guard.mtAutoSyncEnabled(), false);
    assert.throws(() => guard.assertMtAutoSyncEnabled(), /mt_auto_sync_disabled/);
  }
  const guard = load('../functions/_shared/mtFeature.ts', { Deno: { env: { get: () => { throw Error('denied'); } } } });
  assert.equal(guard.mtAutoSyncEnabled(), false);
});

test('only exact backend true enables the flag; this does not bypass handler authorization', () => {
  const guard = load('../functions/_shared/mtFeature.ts', { Deno: { env: { get: () => 'true' } } });
  assert.equal(guard.mtAutoSyncEnabled(), true);
  assert.equal(guard.mtDisabledResponse({}), null);
});

for (const name of ['mt-connect', 'mt-sync']) {
  test(`${name} blocks ordinary, anonymous and scheduler requests before side effects`, async () => {
    let handler;
    const deny = () => { throw Error('Unexpected credential, database or provider access'); };
    const Deno = { env: { get: () => undefined }, serve: fn => { handler = fn; } };
    const guard = load('../functions/_shared/mtFeature.ts', { Deno });
    load(`../functions/${name}/index.ts`, { Deno, ...guard, corsHeaders: {}, createClient: deny, admin: deny, createStepLog: deny, createAccount: deny, syncAccount: deny });
    for (const headers of [{}, { Authorization: 'Bearer user-token' }, { 'x-sync-secret': 'scheduler-token' }]) {
      const req = new Request('https://example.test', { method: 'POST', headers, body: 'not-json' });
      const response = await handler(req);
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error, 'mt_auto_sync_disabled');
      assert.equal(req.bodyUsed, false);
    }
    assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 200);
  });
}

test('shared provider and sync entry points reject bypass calls while disabled', async () => {
  const deny = () => { throw Error('Unexpected side effect'); };
  const Deno = { env: { get: () => undefined } };
  const guard = load('../functions/_shared/mtFeature.ts', { Deno });
  const provider = load('../functions/_shared/metaapi.ts', { Deno, ...guard, fetch: deny });
  await assert.rejects(provider.getAccount('demo'), /mt_auto_sync_disabled/);
  const sync = load('../functions/_shared/mtSync.ts', { Deno, ...guard, createClient: deny });
  await assert.rejects(sync.syncAccount({ id: 'demo' }, {}), /mt_auto_sync_disabled/);
});
