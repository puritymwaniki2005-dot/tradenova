import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outputDir = process.argv[2];
const legacyFile = process.argv[3];
if (!outputDir || !legacyFile) {
  throw new Error('Usage: node publish-tradenova-workspace.mjs <build-output-dir> <legacy-workspace-html>');
}
if (!existsSync(path.join(outputDir, 'index.html'))) {
  throw new Error('Build output is missing index.html.');
}
if (!existsSync(legacyFile)) {
  throw new Error('The full TradeNovaX workspace source file is missing: ' + legacyFile);
}

const configuredPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || '/';
const prefix = configuredPrefix.endsWith('/') ? configuredPrefix : configuredPrefix + '/';
const workspaceUrl = prefix + 'workspace/';
const builderUrl = prefix;
const switcherStyle = `
<style id="tnx-switcher-styles">
.tnx-app-switcher{position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483000!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:11px 16px!important;border:1px solid #b28a25!important;border-radius:999px!important;background:#0b1830!important;color:#f2d77b!important;font:700 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif!important;text-decoration:none!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important;cursor:pointer!important}
.tnx-app-switcher:hover{filter:brightness(1.12)!important;transform:translateY(-1px)}
.tnx-app-switcher:focus-visible{outline:3px solid #f2d77b!important;outline-offset:3px!important}
@media(max-width:600px){.tnx-app-switcher{right:12px!important;bottom:12px!important;padding:10px 13px!important;font-size:11px!important}}
</style>`;

function addBeforeBodyEnd(html, marker, markup, label) {
  if (html.includes(marker)) {
    console.log(label + ' already present.');
    return html;
  }
  const matches = html.match(/<\/body\s*>/gi) || [];
  if (matches.length !== 1) {
    throw new Error('Expected exactly one closing body tag while adding ' + label + '; found ' + matches.length + '.');
  }
  return html.replace(/<\/body\s*>/i, markup + '\n</body>');
}

const rootIndex = path.join(outputDir, 'index.html');
let rootHtml = readFileSync(rootIndex, 'utf8');
rootHtml = addBeforeBodyEnd(
  rootHtml,
  'id="tnx-workspace-switch"',
  switcherStyle + '\n<a id="tnx-workspace-switch" class="tnx-app-switcher" href="' + workspaceUrl + '" aria-label="Open the full TradeNovaX trading workspace">↗ Full trading workspace</a>',
  'full-workspace launcher'
);
writeFileSync(rootIndex, rootHtml);

let workspaceHtml = readFileSync(legacyFile, 'utf8');
const workspacePath = path.join(outputDir, 'workspace');
mkdirSync(workspacePath, { recursive: true });
workspaceHtml = workspaceHtml
  .replaceAll("window.location.href='/'", "window.location.href='" + workspaceUrl + "'")
  .replaceAll("location.href='/'", "location.href='" + workspaceUrl + "'");
workspaceHtml = addBeforeBodyEnd(
  workspaceHtml,
  'id="tnx-visual-builder-switch"',
  switcherStyle + '\n<a id="tnx-visual-builder-switch" class="tnx-app-switcher" href="' + builderUrl + '" aria-label="Open the TradeNovaX visual bot builder">▦ Visual Bot Builder</a>',
  'visual-builder launcher'
);
writeFileSync(path.join(workspacePath, 'index.html'), workspaceHtml);

const publishedWorkspace = readFileSync(path.join(workspacePath, 'index.html'), 'utf8');
const publishedRoot = readFileSync(rootIndex, 'utf8');
if (!publishedRoot.includes('href="' + workspaceUrl + '"') ||
    !publishedWorkspace.includes('href="' + builderUrl + '"') ||
    !publishedWorkspace.includes("window.location.href='" + workspaceUrl + "'")) {
  throw new Error('TradeNovaX workspace cross-navigation verification failed.');
}
console.log('Published the full TradeNovaX workspace at ' + workspaceUrl + ' and linked it to the visual bot builder.');
