import React, { useState } from 'react';

const LEGACY_WORKSPACE = `${import.meta.env.BASE_URL}legacy/TradeNovaX_FULLY_FIXED.html`;

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <main className="tradenova-host" aria-label="TradeNovaX trading workspace">
      {!loaded && !failed && (
        <div className="tradenova-loading" role="status" aria-live="polite">
          <div className="tradenova-mark">TN</div>
          <div className="tradenova-spinner" />
          <strong>Opening TradeNovaX</strong>
          <span>Preparing your trading workspace…</span>
        </div>
      )}
      {failed ? (
        <section className="tradenova-fallback">
          <div className="tradenova-mark">TN</div>
          <h1>TradeNovaX could not be opened</h1>
          <p>The trading workspace did not load. You can open the full workspace directly.</p>
          <a href={LEGACY_WORKSPACE}>Open TradeNovaX workspace</a>
          <button type="button" onClick={() => { setFailed(false); setLoaded(false); window.location.reload(); }}>Try again</button>
        </section>
      ) : (
        <iframe
          className={`tradenova-frame ${loaded ? 'is-ready' : ''}`}
          src={LEGACY_WORKSPACE}
          title="TradeNovaX full trading workspace"
          allow="clipboard-read; clipboard-write; fullscreen"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </main>
  );
}
