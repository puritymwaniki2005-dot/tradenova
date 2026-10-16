import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const archive = path.join(root, 'bot-app (2).zip');
const extractionRoot = path.join(root, 'bot-app-source');

if (!existsSync(archive)) {
  throw new Error('Missing bot-app (2).zip. Keep the uploaded archive at the repository root.');
}

rmSync(extractionRoot, { recursive: true, force: true });
mkdirSync(extractionRoot, { recursive: true });
execFileSync('unzip', ['-q', archive, '-d', extractionRoot], { stdio: 'inherit' });

function findAppRoot(directory, depth = 0) {
  if (depth > 4) return null;
  const entries = readdirSync(directory, { withFileTypes: true });
  if (entries.some((entry) => entry.isFile() && entry.name === 'rsbuild.config.ts') &&
      entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
    return directory;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || ['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const found = findAppRoot(path.join(directory, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

const appRoot = findAppRoot(extractionRoot);
if (!appRoot) {
  throw new Error('Could not find the uploaded app root (expected package.json and rsbuild.config.ts).');
}

const packageJson = JSON.parse(
  await (await import('node:fs/promises')).readFile(path.join(appRoot, 'package.json'), 'utf8')
);
if (!packageJson.scripts?.build) {
  throw new Error('Uploaded bot package.json has no build script.');
}

console.log('Building the exact uploaded bot:', path.relative(root, appRoot));
console.log('Package:', packageJson.name ?? '(unnamed)', 'version:', packageJson.version ?? '(unknown)');

const env = {
  ...process.env,
  NEXT_PUBLIC_DERIV_APP_ID: process.env.NEXT_PUBLIC_DERIV_APP_ID || '34g3dK2hXuNSYEMsOUlvT',
  NEXT_PUBLIC_DERIV_APP_NAME: process.env.NEXT_PUBLIC_DERIV_APP_NAME || 'TradeNovaX',
  NEXT_PUBLIC_DERIV_ENV: process.env.NEXT_PUBLIC_DERIV_ENV || 'production',
  NEXT_PUBLIC_DERIV_OAUTH_SCOPES: process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES || 'trade',
};

execFileSync('npm', ['install', '--include=dev', '--no-audit', '--no-fund'], {
  cwd: appRoot,
  env,
  stdio: 'inherit',
});
execFileSync('npm', ['run', 'build'], {
  cwd: appRoot,
  env,
  stdio: 'inherit',
});

const output = path.join(appRoot, 'dist');
if (!existsSync(path.join(output, 'index.html')) || !statSync(path.join(output, 'index.html')).isFile()) {
  throw new Error('Build completed without producing dist/index.html.');
}

console.log('Build verified. Output directory:', path.relative(root, output));
