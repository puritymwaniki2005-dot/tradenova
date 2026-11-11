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
const referenceWorkspaceTheme = "<style id=\"tnx-reference-workspace-theme\">\n:root{--gold:#c89b25;--gold-dark:#a97812;--gold-light:#e6c55c;--navy:#65070d;--navy-light:#8e111a;--bg:#fff;--card:#fff;--text:#24262b;--text-muted:#737780;--border:rgba(101,7,13,.14);--green:#159b70;--red:#d52d3a;--sidebar-width:250px}\nhtml,body{background:#f5f6f8!important;color:#25272d!important}\n.sidebar{background:#62070d!important;border-right:1px solid #7e1119!important}\n.sidebar-brand,.sidebar-user,.sidebar-footer{border-color:rgba(255,255,255,.15)!important}\n.sidebar-user .name,.sidebar-nav a:hover,.sidebar-nav a.active,.sidebar-footer .footer-item{color:#fff!important}\n.sidebar-nav a{color:#f0dfe1!important;border-left-color:transparent!important}.sidebar-nav a.active{background:#8b1019!important;border-left-color:#f0c84b!important}.sidebar-nav a:hover{background:rgba(255,255,255,.1)!important}\n.sidebar-nav a .badge{background:#f1ca50!important;color:#4d080d!important}\n.main-content{background:#f5f6f8!important;color:#26282e!important}\n.topbar{background:#fff!important;border-bottom:1px solid #e5e6e9!important;box-shadow:0 2px 10px rgba(24,24,30,.045)!important}\n.topbar-left h1{color:#2a2c32!important}.topbar-left .page-sub,.topbar-right .deriv-status{color:#747983!important}.topbar-right .balance{color:#168b68!important}.menu-toggle{color:#6a080f!important}\n.card,.execution-panel,.bot-card,.template-card{background:#fff!important;color:#292b31!important;border:1px solid #e3e5e9!important;box-shadow:0 4px 16px rgba(28,30,36,.045)!important}\n.card p,.card small,.bot-card .bot-desc,.run-hint,.summary-item span{color:#6e737c!important}\n.bot-card:hover,.template-card:hover{border-color:#bb1e2b!important;box-shadow:0 9px 24px rgba(115,10,20,.1)!important}\n.btn-load,.tnx-builder-btn.primary,.tnx-builder-run-ref{background:linear-gradient(110deg,#65070d,#c51f2b)!important;color:#fff!important;border-color:#8f111a!important}\n.btn-run{background:linear-gradient(110deg,#65070d,#c51f2b)!important;color:#fff!important;box-shadow:0 6px 18px rgba(132,9,20,.2)!important}\n.btn-bot,.tnx-builder-btn{background:#fff!important;color:#34363d!important;border-color:#dfe1e5!important}\n.execution-tabs{border-color:#e1e3e7!important}.tab-btn{color:#717680!important}.tab-btn.active{color:#8c1018!important;border-bottom-color:#bd202b!important}\n.summary-item{background:#f7f8fa!important;border:1px solid #e8eaee!important}\n.account-selector{background:#fff!important;border-color:#e2e4e8!important}.account-selector label{color:#6e737c!important}.account-btn{color:#676d76!important;border-color:#dfe2e7!important}.account-btn:hover{color:#8c1018!important;border-color:#b91e29!important}\n.tnx-ref-tabs{background:#fff!important;border-color:#e1e3e7!important}.tnx-ref-tab{background:#62070d!important;color:#f7e9ea!important}.tnx-ref-tab.active{background:linear-gradient(110deg,#62070d,#b81c27)!important;color:#fff!important;border-bottom-color:#e4bf48!important}\n.tnx-builder-reference{box-shadow:0 8px 28px rgba(20,20,25,.08)!important}.tnx-reference-bulk{background:#fff!important;color:#292b31!important}.tnx-reference-bulk .tnx-bulk-head,.tnx-reference-bulk .tnx-bulk-footer{background:#fff!important;color:#34363d!important}\n.tnx-reference-bulk .tnx-bulk-action.even{background:linear-gradient(110deg,#4ab4ad,#348f8a)!important}.tnx-reference-bulk .tnx-bulk-action.odd{background:linear-gradient(110deg,#e9424b,#c91f2b)!important}\n.tnx-pinned-buy,.tnx-mobile-run,.tnx-builder-run-ref{background:#720910!important;color:#fff!important}\n@media(min-width:701px){
.tnx-builder-reference{background:#fff!important;border:1px solid #e4e5e8!important;box-shadow:0 10px 30px rgba(28,30,36,.08)!important}
.tnx-builder-sidebar{background:#fff!important;color:#34363d!important;border-right:1px solid #e1e3e7!important}
.tnx-builder-sidebar .tnx-blocks-menu-head{background:#f2f3f5!important;color:#34363d!important;border:1px solid #e2e4e8!important}
.tnx-builder-sidebar .tnx-builder-search{background:#fff!important;border-color:#dfe2e6!important;color:#7b8088!important}
.tnx-builder-sidebar .tnx-builder-search input{color:#34363d!important}
.tnx-toolbox-panel{background:#fff!important}
.tnx-toolbox-panel button{background:#fff!important;color:#41454d!important;border-bottom:1px solid #eceef1!important}
.tnx-toolbox-panel button:hover,.tnx-toolbox-panel button.active{background:#f5f6f8!important;color:#750b12!important}
.tnx-builder-stage{background:#fff!important}
.tnx-blockly-workspace,.tnx-builder-stage .blocklySvg{background:#fff!important}
.tnx-builder-stage .blocklyMainBackground{fill:#fff!important;stroke:#fff!important}
.tnx-builder-toolbar-ref{background:#fff!important;border-color:#dfe2e6!important;box-shadow:0 3px 12px rgba(25,25,30,.06)!important}
.tnx-builder-toolbar-ref button{background:#fff!important;color:#4b5058!important}
.tnx-builder-toolbar-ref i{background:#dfe2e6!important}
.tnx-builder-bottom-ref{background:#fff!important;border-top:1px solid #e3e5e8!important}
.tnx-builder-running-ref{background:#fff!important;border-color:#dfe2e6!important;color:#34363d!important}
.tnx-builder-summary{background:#fff!important;color:#2e3036!important;border-left:1px solid #e2e4e8!important}
.tnx-summary-tabs{background:#65070d!important;border-bottom:1px solid #8d1821!important}
.tnx-summary-tabs button{color:#f8e9ea!important}
.tnx-summary-empty{border-bottom-color:#eceef1!important;color:#737983!important}
.tnx-summary-empty strong,.tnx-summary-grid strong{color:#30333a!important}
.tnx-summary-bot{background:#f2f3f5!important;color:#790d15!important}
.tnx-summary-grid{border-bottom-color:#eceef1!important}
.tnx-summary-grid div{border-right-color:#eceef1!important;border-bottom-color:#eceef1!important}
.tnx-summary-grid span{color:#777d86!important}
.tnx-summary-reset{background:#fff!important;color:#6d0a12!important;border-color:#d9dde2!important}
.tnx-summary-list span{background:#f8f9fa!important;border-color:#e2e5e9!important;color:#42464e!important}
}
input,select,textarea{max-width:100%}\n@media(max-width:768px){.main-content{padding:0 1rem 1.25rem!important}.topbar{position:sticky!important;top:0!important;z-index:120!important;padding:.8rem 0!important;gap:.65rem!important}.topbar-right{display:flex!important;align-items:center!important;gap:.65rem!important;flex-wrap:nowrap!important}.topbar-right .balance{font-size:1.35rem!important}.page-content{padding:1.2rem 0!important}.card,.execution-panel{padding:1.25rem!important;border-radius:12px!important}.tnx-ref-tabs{position:sticky!important;top:0!important;z-index:40!important;flex-wrap:nowrap!important;overflow-x:auto!important;white-space:nowrap!important}.tnx-ref-tab{padding:.95rem 1.1rem!important;font-size:1.15rem!important}.tnx-builder-reference{max-width:100%!important}}\n@media(max-width:480px){.topbar-left{gap:.8rem!important}.topbar-left h1{font-size:1.5rem!important}.topbar-right .deriv-status{display:none!important}.btn-logout{padding:.45rem .9rem!important}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n</style>";

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
workspaceHtml = addBeforeBodyEnd(workspaceHtml, 'id="tnx-reference-workspace-theme"', referenceWorkspaceTheme, 'reference-inspired workspace theme');
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
