// Isolated component verification; never connects to production or user data.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/components/settings/MtAutoSyncComingSoon.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require });
const markup = renderToStaticMarkup(React.createElement(exports.default));
const css = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css')).map(f => fs.readFileSync(`dist/assets/${f}`, 'utf8')).join('\n');
assert.ok(css.length > 0, 'Production CSS must exist');
fs.mkdirSync('artifacts/mt-lockdown', { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route('**/*', route => route.abort());
    await page.setContent(`<html class="dark"><head><style>${css}</style></head><body class="bg-background text-foreground"><main class="mx-auto max-w-5xl p-4 sm:p-8">${markup}</main></body></html>`);
    assert.equal(await page.getByRole('heading', { name: 'MT5 Auto Sync — Coming Soon' }).isVisible(), true);
    assert.equal(await page.locator('input, button, form, select').count(), 0);
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    assert.ok(size.scroll <= size.width, `${name}: horizontal overflow`);
    const box = await page.locator('section').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${name}: panel is clipped`);
    await page.screenshot({ path: `artifacts/mt-lockdown/${name}.png`, fullPage: true });
    await page.close();
  }
  console.log('PASS: isolated Coming Soon panel at 1440px, 390px and 320px; no controls, overflow or clipping. Full authenticated Settings still requires staging verification.');
} finally { await browser.close(); }
