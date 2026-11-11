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
assert.match(app, /localStorage\.removeItem\('tradenovax_session_last_activity'\)/, 'React sign-out must end the shared session.');
assert.match(app, /onClick=\{disconnectAccount\}/, 'React workspace must expose an explicit sign-out action.');
console.log('TradeNovaX shared session persistence and inactivity policy checks passed.');
