import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = process.argv[2];
if (!appRoot) throw new Error('Pass the extracted bot application root.');

const sourceExtensions = new Set(['.tsx', '.ts', '.jsx', '.js', '.html']);
const removeCopy = [
  /🟢\s*DERIV TRADING MODE\s*[—–-]?/gi,
  /REAL and DEMO accounts supported\s*[—–-]?/gi,
  /Every REAL BUY requires confirmation/gi,
];
let scanned = 0;
let changed = 0;

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) walk(file);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    scanned += 1;
    const before = readFileSync(file, 'utf8');
    let after = before;
    // Remove the complete guard element and its specific CSS spacer from the ZIP app.
    after = after.replace(/<div\b[^>]*id=["']tnx-live-guard["'][^>]*>[\s\S]*?<\/div>\s*/gi, '');
    after = after.replace(/#tnx-live-guard\s*\{[^}]*\}/gi, '');
    after = after.replace(/body\s*\{\s*padding-top\s*:\s*32px\s*!important\s*;?\s*\}/gi, '');
    for (const pattern of removeCopy) after = after.replace(pattern, '');
    if (after !== before) {
      writeFileSync(file, after);
      changed += 1;
      console.log('Removed unwanted trading-mode banner copy from', path.relative(appRoot, file));
    }
  }
}

walk(appRoot);
console.log('Trading-mode banner cleanup scanned ' + scanned + ' source files; updated ' + changed + '.');
