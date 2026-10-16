import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = process.argv[2];
if (!appRoot) throw new Error('Pass the extracted bot application root.');

function replaceExactlyOnce(file, original, replacement, label) {
  const source = readFileSync(file, 'utf8');
  if (source.includes(replacement)) {
    console.log(label + ' patch already present; no change needed.');
    return;
  }
  const count = source.split(original).length - 1;
  if (count !== 1) {
    throw new Error('Expected exactly one unpatched ' + label + ' target; found ' + count + '. Refusing an uncertain patch.');
  }
  writeFileSync(file, source.replace(original, replacement));
  console.log('Applied and verified ' + label + ' patch.');
}

const accountsFile = path.join(appRoot, 'src', 'services', 'derivws-accounts.service.ts');
const oldHeader = "Authorization: `Bearer ${accessToken}`,";
const newHeader = [
  oldHeader,
  "                        ...(process.env.NEXT_PUBLIC_DERIV_APP_ID ? { 'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID } : {}),",
].join('\n');
const accountSource = readFileSync(accountsFile, 'utf8');
const marker = "'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_APP_ID";
const headerCount = accountSource.split(marker).length - 1;
if (headerCount !== 2) {
  if (headerCount !== 0) throw new Error('Found a partial Deriv-App-ID patch; refusing to continue.');
  const matches = accountSource.split(oldHeader).length - 1;
  if (matches !== 2) throw new Error('Expected exactly 2 Deriv account request headers; found ' + matches + '. Refusing an uncertain patch.');
  const patched = accountSource.split(oldHeader).join(newHeader);
  if (patched.split(marker).length - 1 !== 2) throw new Error('Patch verification failed for Deriv-App-ID headers.');
  writeFileSync(accountsFile, patched);
  console.log('Applied and verified Deriv-App-ID header patch for account and OTP requests.');
} else {
  console.log('Deriv-App-ID header patch already present; no change needed.');
}

const helperFile = path.join(appRoot, 'src', 'components', 'shared', 'utils', 'object', 'object.ts');
const oldHelper = `export const findValueByKeyRecursively = (obj: any, key: string) => {
    let return_value;

    Object.keys(obj).some(obj_key => {
        const value = obj[obj_key];

        if (obj_key === key) {
            return_value = obj[key];
            return true;
        }

        if (typeof value === 'object') {
            const nested_value = findValueByKeyRecursively(value, key);

            if (nested_value) {
                return_value = nested_value;
                return true;
            }
        }

        return false;
    });

    return return_value;
};`;
const newHelper = `export const findValueByKeyRecursively = (obj: any, key: string, visited: WeakSet<object> = new WeakSet()) => {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
        return undefined;
    }

    // API errors may contain circular references; never recurse into an object twice.
    if (visited.has(obj)) {
        return undefined;
    }
    visited.add(obj);

    for (const obj_key of Object.keys(obj)) {
        if (obj_key === key) {
            return obj[obj_key];
        }

        const value = obj[obj_key];
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
            const nested_value = findValueByKeyRecursively(value, key, visited);
            if (nested_value !== undefined) {
                return nested_value;
            }
        }
    }

    return undefined;
};`;
replaceExactlyOnce(helperFile, oldHelper, newHelper, 'cycle-safe recursive error inspection');

const proposalFile = path.join(appRoot, 'src', 'external', 'bot-skeleton', 'services', 'tradeEngine', 'trade', 'Proposal.js');
replaceExactlyOnce(
  proposalFile,
  `                                error: localizedError,
                            });

                            return null;
                        }
                        if (!has_informed_error) {
                            has_informed_error = true;
                            // Use localized error message for general errors
                            const localizedErrorMessage = error.error.code
                                ? getLocalizedErrorMessage(error.error.code, error.error)
                                : error.error.message || getLocalizedErrorMessage('GeneralError');`,
  `                                error: localizedError,
                            });
                            // An invalid proposal still counts as a response; let the opposite
                            // contract proposal become ready instead of leaving the bot waiting forever.
                            this.checkProposalReady();

                            return null;
                        }
                        if (!has_informed_error) {
                            has_informed_error = true;
                            // Use localized error message for general errors, even for malformed errors.
                            const errorDetails = error?.error ?? {};
                            const localizedErrorMessage = errorDetails.code
                                ? getLocalizedErrorMessage(errorDetails.code, errorDetails)
                                : errorDetails.message || error?.message || getLocalizedErrorMessage('GeneralError');
                            const localizedError = {
                                ...errorDetails,
                                message: localizedErrorMessage,
                            };
                            // Record a rejected proposal as a response so the bot cannot wait forever.
                            this.data.proposals.push({
                                ...(errorDetails.echo_req ?? {}),
                                ...(errorDetails.echo_req?.passthrough ?? {}),
                                ...(error?.echo_req?.passthrough ?? {}),
                                ...(errorDetails.passthrough ?? {}),
                                error: localizedError,
                            });
                            this.checkProposalReady();`,
  'proposal request error readiness and safe error handling'
);
replaceExactlyOnce(
  proposalFile,
  `                        this.data.proposals.push({
                            ...passthrough,
                            error: localizedError,
                        });
                        return;
                    }`,
  `                        this.data.proposals.push({
                            ...passthrough,
                            error: localizedError,
                        });
                        // Error responses also satisfy the response slot for this template.
                        this.checkProposalReady();
                        return;
                    }`,
  'proposal subscription error readiness'
);

const rsbuildFile = path.join(appRoot, 'rsbuild.config.ts');
const oldAssetPrefix = "        NEXT_PUBLIC_APP_BUILD: JSON.stringify(process.env.NEXT_PUBLIC_APP_BUILD ?? ''),";
const newAssetPrefix = oldAssetPrefix + "\n        NEXT_PUBLIC_ASSET_PREFIX: JSON.stringify(process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''),";
replaceExactlyOnce(rsbuildFile, oldAssetPrefix, newAssetPrefix, 'static asset-prefix environment');
replaceExactlyOnce(
  rsbuildFile,
  "    assetPrefix: isStaticBuild ? '/bot/preview/' : '/',",
  "    assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || (isStaticBuild ? '/bot/preview/' : '/'),",
  'GitHub Pages asset base path'
);

const appFile = path.join(appRoot, 'src', 'app', 'App.tsx');
replaceExactlyOnce(
  appFile,
  "const routerBasename = isPreviewMode() ? PREVIEW_BASE_PATH : undefined;",
  "const routerBasename = isPreviewMode() ? PREVIEW_BASE_PATH : (process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\\/$/, '') || undefined);",
  'GitHub Pages router base path'
);
