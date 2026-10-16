import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = process.argv[2];
if (!appRoot) throw new Error('Pass the extracted bot application root.');

const target = path.join(appRoot, 'src', 'services', 'derivws-accounts.service.ts');
const source = readFileSync(target, 'utf8');
const oldHeader = "Authorization: `Bearer ${accessToken}`,";
const newHeader = `Authorization: \`Bearer \${accessToken}\`,
                        ...(process.env.NEXT_PUBLIC_DERIV_APP_ID
                            ? { 'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID }
                            : {}),`;

const matches = source.split(oldHeader).length - 1;
if (matches !== 2) {
  throw new Error(`Expected exactly 2 Deriv account request headers in ${target}; found ${matches}. Refusing to apply an uncertain patch.`);
}
if (source.includes("'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID")) {
  console.log('Deriv-App-ID header patch already present; no change needed.');
  process.exit(0);
}
writeFileSync(target, source.split(oldHeader).join(newHeader));
console.log('Applied GitHub-only Deriv-App-ID header patch to account and OTP requests.');
