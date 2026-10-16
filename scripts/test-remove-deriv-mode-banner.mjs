import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const script = path.join(root, 'scripts', 'remove-deriv-mode-banner.mjs');
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'tradenovax-banner-test-'));
const html = path.join(tempRoot, 'index.html');
const css = path.join(tempRoot, 'style.css');

try {
  mkdirSync(tempRoot, { recursive: true });
  writeFileSync(html, '<body><div id="tnx-live-guard">🟢 DERIV TRADING MODE — REAL and DEMO accounts supported — Every REAL BUY requires confirmation</div><main>Bot Builder</main></body>');
  writeFileSync(css, '#tnx-live-guard{position:fixed;top:0} body{padding-top:32px!important} .workspace{display:grid}');
  execFileSync(process.execPath, [script, tempRoot], { stdio: 'inherit' });

  const resultHtml = readFileSync(html, 'utf8');
  const resultCss = readFileSync(css, 'utf8');
  assert.ok(!resultHtml.includes('tnx-live-guard'), 'Must remove the full banner element.');
  assert.ok(!resultHtml.includes('DERIV TRADING MODE'), 'Must remove the unwanted banner text.');
  assert.ok(resultHtml.includes('<main>Bot Builder</main>'), 'Must preserve the bot workspace.');
  assert.ok(!resultCss.includes('#tnx-live-guard'), 'Must remove banner-specific CSS.');
  assert.ok(!/body\s*\{\s*padding-top\s*:\s*32px\s*!important/i.test(resultCss), 'Must remove the banner spacer.');
  assert.ok(resultCss.includes('.workspace{display:grid}'), 'Must preserve unrelated workspace styling.');
  console.log('Banner-removal regression tests passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
