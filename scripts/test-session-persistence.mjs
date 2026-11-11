import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const legacy = readFileSync('public/legacy/TradeNovaX_FULLY_FIXED.html', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');

assert.match(legacy, /TNX_SESSION_IDLE_MS=30\*60\*1000/, 'Legacy workspace must use a 30-minute inactivity timeout.');
assert.match(legacy, /function tnxSessionIsValid\(\)/, 'Legacy workspace must validate persisted sessions.');
assert.match(legacy, /if\(!tnxSessionIsValid\(\)\)return null/, 'Legacy API access must reject expired sessions.');
assert.match(legacy, /function tnxStartSessionMonitor\(\)/, 'Legacy workspace must monitor inactivity.');
assert.match(legacy, /window\.addEventListener\('storage'/, 'Legacy workspace must synchronize logout across tabs.');
assert.match(legacy, /tnxEndSession\('You have been logged out successfully\.'/, 'Legacy logout must clear the shared session.');

assert.match(app, /const SESSION_IDLE_MS = 30 \* 60 \* 1000/, 'React workspace must use the same inactivity timeout.');
assert.match(app, /useRef\(readSavedDerivToken\(\)\)/, 'React workspace must restore the saved token after reload.');
assert.match(app, /localStorage\.setItem\('deriv_access_token', tokenRef\.current\)/, 'React workspace must persist only a successful authorization.');
assert.match(app, /tradenovax_session_last_activity/, 'React sign-out must end the shared session.');
assert.match(app, /onClick=\{disconnectAccount\}/, 'React workspace must expose an explicit sign-out action.');
assert.match(legacy, /function executeManualTrade\(direction\)/, 'Manual Trader must expose a direct, non-recursive execution handler.');
assert.match(legacy, /if\(!tnxCanOpenTrade\(amount,'manual'\)\)return/, 'Manual Trader must apply risk checks inside its core handler.');
assert.match(legacy, /let manualTradeInFlight=false/, 'Manual Trader must block duplicate in-flight orders.');
assert.doesNotMatch(legacy, /_tnxOriginalExecuteManualTrade/, 'Manual Trader must not use the recursive wrapper that caused the call-stack failure.');
assert.match(legacy, /if\(ctx\\.manualTrade\)manualTradeInFlight=false/, 'Manual Trader must release its request lock after a response or error.');

console.log('TradeNovaX shared session persistence and inactivity policy checks passed.');
