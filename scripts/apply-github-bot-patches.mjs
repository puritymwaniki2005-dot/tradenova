import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = process.argv[2];
if (!appRoot) throw new Error('Pass the extracted bot application root.');

const target = path.join(appRoot, 'src', 'services', 'derivws-accounts.service.ts');
const source = readFileSync(target, 'utf8');
const oldHeader = "Authorization: `Bearer ${accessToken}`,";
const newHeader = [
  "Authorization: `Bearer ${accessToken}`,",
  "                        ...(process.env.NEXT_PUBLIC_DERIV_APP_ID ? { 'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID } : {}),",
].join('\n');

const marker = "'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID";
const alreadyPatched = source.split(marker).length - 1;
if (alreadyPatched === 2) {
  console.log('Deriv-App-ID header patch already present; no change needed.');
  process.exit(0);
}
if (alreadyPatched !== 0) {
  throw new Error('Found a partial Deriv-App-ID patch; refusing to continue.');
}
const matches = source.split(oldHeader).length - 1;
if (matches !== 2) {
  throw new Error('Expected exactly 2 Deriv account request headers; found ' + matches + '. Refusing to apply an uncertain patch.');
}
const patched = source.split(oldHeader).join(newHeader);
if (patched.split(marker).length - 1 !== 2) {
  throw new Error('Patch verification failed: expected both account API requests to include Deriv-App-ID.');
}
writeFileSync(target, patched);
console.log('Applied and verified Deriv-App-ID header patch for account and OTP requests.');
