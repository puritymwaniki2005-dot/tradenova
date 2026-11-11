import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const script = path.join(root, 'scripts', 'publish-tradenova-workspace.mjs');
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'tradenovax-workspace-test-'));
const outputDir = path.join(tempRoot, 'dist');
const legacyFile = path.join(tempRoot, 'legacy.html');

try {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'index.html'), '<!doctype html><html><body><div id="root"></div></body></html>');
  writeFileSync(legacyFile, '<!doctype html><html><body><main>Manual Trader · Bulk Trader</main><script>window.location.href=\'/\';location.href=\'/\';</script></body></html>');

  const run = () => execFileSync(process.execPath, [script, outputDir, legacyFile], {
    env: { ...process.env, NEXT_PUBLIC_ASSET_PREFIX: '/tradenova/' },
    stdio: 'inherit',
  });
  run();

  const rootHtml = readFileSync(path.join(outputDir, 'index.html'), 'utf8');
  const workspaceHtml = readFileSync(path.join(outputDir, 'workspace', 'index.html'), 'utf8');
  assert.ok(rootHtml.includes('href="/tradenova/workspace/"'), 'Bot Builder must link to the full workspace under the Pages base path.');
  assert.ok(workspaceHtml.includes('href="/tradenova/"'), 'Full workspace must link back to the visual bot builder.');
  assert.ok(workspaceHtml.includes("window.location.href='/tradenova/workspace/'"), 'Workspace home redirects must preserve the workspace route.');
  assert.ok(workspaceHtml.includes('Manual Trader · Bulk Trader'), 'Workspace publishing must preserve the source modules.');
  assert.ok(workspaceHtml.includes('id="tnx-visual-builder-switch"'), 'Workspace must expose the visual builder launcher.');
  assert.ok(workspaceHtml.includes('id="tnx-reference-workspace-theme"'), 'Workspace must include the responsive reference-inspired theme.');
  assert.ok(workspaceHtml.includes('--navy:#65070d') && workspaceHtml.includes('.tnx-ref-tabs'), 'Workspace theme must retain the red terminal palette and mobile strategy tabs.');
  assert.ok(workspaceHtml.includes('.tnx-builder-stage{background:#fff!important}') && workspaceHtml.includes('.tnx-builder-sidebar{background:#fff!important}'), 'Blockly workspace and toolbox must use the reference white canvas on desktop.');

  const rootOnce = rootHtml;
  const workspaceOnce = workspaceHtml;
  run();
  assert.equal(readFileSync(path.join(outputDir, 'index.html'), 'utf8'), rootOnce, 'Root launcher injection must be idempotent.');
  assert.equal(readFileSync(path.join(outputDir, 'workspace', 'index.html'), 'utf8'), workspaceOnce, 'Workspace publishing must be idempotent.');
  console.log('TradeNovaX workspace publishing and cross-navigation tests passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
