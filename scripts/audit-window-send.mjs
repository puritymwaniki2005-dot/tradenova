import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('Pass the extracted bot application root.');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.html']);
let found = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) walk(file);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!/window\s*\.\s*send|window\[['"]send['"]\]/.test(lines[i])) continue;
      found++;
      const from = Math.max(0, i - 3);
      const to = Math.min(lines.length, i + 4);
      console.log('\n[TradeNovaX send audit]', path.relative(root, file) + ':' + (i + 1));
      for (let j = from; j < to; j++) console.log(String(j + 1).padStart(5) + ' | ' + lines[j].slice(0, 500));
    }
  }
}
walk(root);
console.log('[TradeNovaX send audit] occurrences:', found);
