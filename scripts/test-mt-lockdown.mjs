import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let flag;
let handler;
let sideEffects = 0;
const forbidden = () => { sideEffects++; throw new Error('Unexpected downstream operation'); };
const env = { get: name => { if (name !== 'MT_AUTO_SYNC_ENABLED') return forbidden(); return flag; } };
function load(path, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => imports[id] ?? forbidden(), Deno: { env, serve: fn => { handler = fn; } }, Response, Headers, console, fetch: forbidden });
  return exports;
}
const feature = load('supabase/functions/_shared/mtFeature.ts');
for (const value of [undefined, '', 'false', 'TRUE', '1', ' true ']) {
  flag = value;
  assert.equal(feature.mtAutoSyncEnabled(), false);
}
flag = 'true'; assert.equal(feature.mtAutoSyncEnabled(), true);
flag = undefined;
for (const endpoint of ['mt-connect', 'mt-sync']) {
  load(`supabase/functions/${endpoint}/index.ts`, {
    '../_shared/mtFeature.ts': feature,
    'npm:@supabase/supabase-js@2/cors': { corsHeaders: { 'Access-Control-Allow-Origin': '*' } },
    'npm:@supabase/supabase-js@2': { createClient: forbidden },
    '../_shared/metaapi.ts': { createAccount: forbidden },
    '../_shared/mtSync.ts': { admin: forbidden, syncAccount: forbidden, createStepLog: forbidden },
  });
  for (const headers of [{}, { Authorization: 'Bearer test-user' }, { 'x-sync-secret': 'test-cron' }]) {
    const response = await handler({ method: 'POST', headers: new Headers(headers), json: forbidden });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'MT_AUTO_SYNC_DISABLED');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal((await handler({ method: 'OPTIONS' })).status, 200);
}
const meta = load('supabase/functions/_shared/metaapi.ts', { './mtFeature.ts': feature });
await assert.rejects(meta.createAccount(new Proxy({}, { get: forbidden })), /coming soon/);
await assert.rejects(meta.getAccount('test'), /coming soon/);
const sync = load('supabase/functions/_shared/mtSync.ts', { './mtFeature.ts': feature, './metaapi.ts': meta, 'npm:@supabase/supabase-js@2': { createClient: forbidden } });
await assert.rejects(sync.syncAccount({ id: 'test' }), /coming soon/);
assert.equal(sideEffects, 0, 'No body/credential reads, DB operations or network calls while disabled');
const panel = load('src/components/settings/MtAutoSyncComingSoon.tsx', { 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': require('lucide-react') });
const html = renderToStaticMarkup(React.createElement(panel.default));
assert.match(html, /MT5 Auto Sync — Coming Soon/);
assert.doesNotMatch(html, /<input|<form|<button/);
const settings = fs.readFileSync('src/pages/StudioSettings.tsx', 'utf8');
assert.match(settings, /<MtAutoSyncComingSoon/);
assert.doesNotMatch(settings, /<TradingAccountsSection|<ConnectionStatusSection/);
console.log('PASS: default-off config, direct/user/cron requests, preflight, shared sync and MetaApi guards, zero downstream side effects, and Coming Soon render.');
