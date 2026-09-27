import React from 'react';

export default function App(){
  return <div className="app">
    <header className="topbar"><div><strong>TradeNovaX</strong><span> React Trading Platform</span></div><div className="badge">ENGINE MIGRATION READY</div></header>
    <main className="workspace">
      <section className="hero"><h1>TradeNovaX</h1><p>The React foundation contains the existing TradeNovaX application and the reference bot engine source.</p><div className="actions"><a className="button primary" href="/legacy/TradeNovaX_FULLY_FIXED.html" target="_blank" rel="noreferrer">Open Existing TradeNovaX</a><span className="button ghost">Reference bot engine included</span></div></section>
      <section className="cards"><article><h2>Existing application</h2><p>Your current 466 KB TradeNovaX HTML is preserved under <code>public/legacy</code>.</p></article><article><h2>Reference engine</h2><p>The extracted <code>src/external/bot-skeleton</code> source is preserved under <code>src/reference-bot-engine</code> for the React migration.</p></article><article><h2>Next integration</h2><p>Deriv WebSocket, account state, proposal → buy → contract → sell lifecycle, and the Blockly bot builder will be connected into React without discarding the existing application.</p></article></section>
    </main>
  </div>
}
