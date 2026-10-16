import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const archive = path.join(root, 'bot-app (2).zip');
const patchScript = path.join(root, 'scripts', 'apply-github-bot-patches.mjs');
const servicePath = 'src/services/derivws-accounts.service.ts';
const helperPath = 'src/components/shared/utils/object/object.ts';
const rsbuildPath = 'rsbuild.config.ts';
const appPath = 'src/app/App.tsx';
const proposalPath = 'src/external/bot-skeleton/services/tradeEngine/trade/Proposal.js';
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'tradenovax-deriv-patch-test-'));

try {
  const originalService = execFileSync('unzip', ['-p', archive, servicePath], { encoding: 'utf8' });
  const originalHelper = execFileSync('unzip', ['-p', archive, helperPath], { encoding: 'utf8' });
  const originalRsbuild = execFileSync('unzip', ['-p', archive, rsbuildPath], { encoding: 'utf8' });
  const originalApp = execFileSync('unzip', ['-p', archive, appPath], { encoding: 'utf8' });
  const originalProposal = execFileSync('unzip', ['-p', archive, proposalPath], { encoding: 'utf8' });
  assert.ok(originalService.length > 0, 'Uploaded archive must contain the Deriv account service.');
  assert.ok(originalHelper.length > 0, 'Uploaded archive must contain the shared object helper.');
  assert.ok(originalRsbuild.length > 0, 'Uploaded archive must contain the Rsbuild config.');
  assert.ok(originalApp.length > 0, 'Uploaded archive must contain the app router.');
  assert.ok(originalProposal.length > 0, 'Uploaded archive must contain the Deriv proposal engine.');
  assert.equal(originalService.split("Authorization: `Bearer ${accessToken}`,").length - 1, 2,
    'Expected account-list and OTP requests to use bearer authorization.');

  for (const [relativePath, content] of [[servicePath, originalService], [helperPath, originalHelper], [rsbuildPath, originalRsbuild], [appPath, originalApp], [proposalPath, originalProposal]]) {
    const file = path.join(tempRoot, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  const runPatch = () => execFileSync(process.execPath, [patchScript, tempRoot], {
    env: { ...process.env, NEXT_PUBLIC_DERIV_APP_ID: 'test-app-id' },
    stdio: 'inherit',
  });
  runPatch();

  const patchedService = readFileSync(path.join(tempRoot, servicePath), 'utf8');
  const headerMarker = "'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID";
  assert.equal(patchedService.split(headerMarker).length - 1, 2,
    'Both account API requests must include Deriv-App-ID.');
  assert.equal(patchedService.split("Authorization: `Bearer ${accessToken}`,").length - 1, 2,
    'Bearer authorization must remain in both requests.');

  const patchedHelper = readFileSync(path.join(tempRoot, helperPath), 'utf8');
  assert.ok(patchedHelper.includes('visited: WeakSet<object>'),
    'Recursive error inspection must track visited objects to avoid circular-reference overflow.');
  const match = patchedHelper.match(/export const findValueByKeyRecursively = [\s\S]*?\n};/);
  assert.ok(match, 'Patched recursive helper must be present.');
  const runnableFunction = match[0].replace(
    '(obj: any, key: string, visited: WeakSet<object> = new WeakSet())',
    '(obj, key, visited = new WeakSet())'
  );
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(runnableFunction).toString('base64');
  const { findValueByKeyRecursively } = await import(moduleUrl);
  const cyclic = { nested: { msg_type: 'proposal' } };
  cyclic.self = cyclic;
  cyclic.nested.parent = cyclic;
  assert.equal(findValueByKeyRecursively(cyclic, 'msg_type'), 'proposal',
    'Should locate a value inside an object graph containing cycles.');
  assert.equal(findValueByKeyRecursively(cyclic, 'missing'), undefined,
    'Should safely return undefined when the key is absent in a cyclic graph.');
  assert.equal(findValueByKeyRecursively(null, 'msg_type'), undefined,
    'Should safely handle null error values.');

  const patchedRsbuild = readFileSync(path.join(tempRoot, rsbuildPath), 'utf8');
  assert.ok(patchedRsbuild.includes('NEXT_PUBLIC_ASSET_PREFIX: JSON.stringify(process.env.NEXT_PUBLIC_ASSET_PREFIX ?? \'\')'),
    'Build config must expose the optional static asset prefix.');
  assert.ok(patchedRsbuild.includes("assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || (isStaticBuild ? '/bot/preview/' : '/')"),
    'Build config must allow GitHub Pages assets to load from the repository subpath.');
  const patchedApp = readFileSync(path.join(tempRoot, appPath), 'utf8');
  assert.ok(patchedApp.includes("process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\\/$/, '')"),
    'Router must use the configured GitHub Pages base path.');
  const patchedProposal = readFileSync(path.join(tempRoot, proposalPath), 'utf8');
  assert.ok(patchedProposal.includes('const errorDetails = error?.error ?? {};'),
    'Malformed Deriv errors must be handled without throwing a second error.');
  assert.ok((patchedProposal.match(/this\.checkProposalReady\(\);/g) || []).length >= 4,
    'Rejected requests and subscription errors must check readiness, in addition to the success path.');
  assert.ok(patchedProposal.includes('errorDetails.echo_req ?? {}'),
    'Rejected proposal requests must be recorded so the bot does not wait forever.');
  assert.ok(patchedProposal.includes('errorDetails.echo_req?.passthrough ?? {}'),
    'Rejected requests must retain nested purchase references when matching readiness.');
  const serviceOnce = patchedService;
  const helperOnce = patchedHelper;
  const rsbuildOnce = patchedRsbuild;
  const appOnce = patchedApp;
  const proposalOnce = patchedProposal;
  runPatch();
  assert.equal(readFileSync(path.join(tempRoot, servicePath), 'utf8'), serviceOnce,
    'Header patch must be idempotent.');
  assert.equal(readFileSync(path.join(tempRoot, helperPath), 'utf8'), helperOnce,
    'Cycle-safe patch must be idempotent.');
  assert.equal(readFileSync(path.join(tempRoot, rsbuildPath), 'utf8'), rsbuildOnce,
    'Asset-prefix patch must be idempotent.');
  assert.equal(readFileSync(path.join(tempRoot, appPath), 'utf8'), appOnce,
    'Router-base patch must be idempotent.');
  assert.equal(readFileSync(path.join(tempRoot, proposalPath), 'utf8'), proposalOnce,
    'Proposal readiness patch must be idempotent.');
  console.log('Deriv API header, circular-error, and proposal-readiness regression tests passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
