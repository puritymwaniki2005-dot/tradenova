import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const archive = path.join(root, 'bot-app (2).zip');
const patchScript = path.join(root, 'scripts', 'apply-github-bot-patches.mjs');
const servicePath = 'src/services/derivws-accounts.service.ts';
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'tradenovax-deriv-header-test-'));

try {
  const original = execFileSync('unzip', ['-p', archive, servicePath], { encoding: 'utf8' });
  assert.ok(original.length > 0, 'The uploaded archive must contain the Deriv account service.');
  assert.equal(original.split("Authorization: `Bearer ${accessToken}`,").length - 1, 2,
    'Expected account-list and OTP requests to use bearer authorization.');

  const serviceFile = path.join(tempRoot, servicePath);
  mkdirSync(path.dirname(serviceFile), { recursive: true });
  writeFileSync(serviceFile, original);

  execFileSync(process.execPath, [patchScript, tempRoot], {
    env: { ...process.env, NEXT_PUBLIC_DERIV_APP_ID: 'test-app-id' },
    stdio: 'inherit',
  });

  const once = readFileSync(serviceFile, 'utf8');
  const marker = "'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID";
  assert.equal(once.split(marker).length - 1, 2, 'Both account API requests must include Deriv-App-ID.');
  assert.equal(once.split("Authorization: `Bearer ${accessToken}`,").length - 1, 2,
    'Bearer authorization must remain in both requests.');

  execFileSync(process.execPath, [patchScript, tempRoot], {
    env: { ...process.env, NEXT_PUBLIC_DERIV_APP_ID: 'test-app-id' },
    stdio: 'inherit',
  });
  assert.equal(readFileSync(serviceFile, 'utf8'), once, 'Applying the patch twice must be idempotent.');
  console.log('Deriv API header patch tests passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
