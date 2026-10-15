import React, { useMemo, useState } from 'react';

const nav = [
  { section: 'WORKSPACE', items: [['Overview','◫'],['Bot Builder','⌘'],['My Bots','▦'],['Market Watch','⌁']] },
  { section: 'ACCOUNT', items: [['Deriv Connection','◎'],['Trade History','↗'],['Performance','▥']] },
  { section: 'PREFERENCES', items: [['Settings','⚙'],['Help Centre','?']] },
];
const strategies = [
  { name: 'Volatility Pulse', type: 'Rise / Fall', market: 'Volatility 100 Index', status: 'Ready', tone: 'green' },
  { name: 'Momentum Catcher', type: 'Higher / Lower', market: 'Volatility 50 Index', status: 'Paused', tone: 'amber' },
  { name: 'Quick Digit Scout', type: 'Digits', market: 'Volatility 10 Index', status: 'Draft', tone: 'slate' },
];

function Icon({ children }) { return <span className="nav-icon" aria-hidden="true">{children}</span>; }

export default function App() {
  const [active, setActive] = useState('Overview');
  const [period, setPeriod] = useState('7D');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => strategies.filter(x => (x.name + x.market + x.type).toLowerCase().includes(search.toLowerCase())), [search]);
  const legacyUrl = `${import.meta.env.BASE_URL}legacy/TradeNovaX_FULLY_FIXED.html`;

  const choose = (item) => {
    setActive(item);
    setMobileOpen(false);
    if (item !== 'Overview' && item !== 'My Bots') setNotice(`${item} workspace selected. Connect your Deriv account to enable live account data.`);
    else setNotice('');
  };

  return <div className="shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">T<span>N</span></div><div><strong>TradeNova<span>X</span></strong><small>TRADING WORKSPACE</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">×</button></div>
      <div className="workspace-switch"><div className="workspace-avatar">TN</div><div><strong>Personal workspace</strong><small>Free plan</small></div><span className="chevron">⌄</span></div>
      {nav.map(group => <div className="nav-group" key={group.section}><p>{group.section}</p>{group.items.map(([label, icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => choose(label)}><Icon>{icon}</Icon><span>{label}</span>{label === 'Bot Builder' && <span className="nav-tag">NEW</span>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-spark">✦</div><strong>Unlock your potential</strong><p>Build, test and refine your trading strategies.</p><button onClick={() => setNotice('Plan options will be available here soon.')}>Explore features <span>↗</span></button></div><div className="profile"><div className="profile-avatar">K</div><div><strong>Trader account</strong><small>Local workspace</small></div><button aria-label="Profile options" onClick={() => setNotice('Profile settings selected.')}>•••</button></div></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <main className="main">
      <header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button><div className="crumb">Workspace <span>/</span> <strong>{active}</strong></div></div><div className="top-actions"><label className="searchbox"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bots..." aria-label="Search bots"/><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up. No new notifications.')}>♧<i /></button><div className="top-avatar">K</div></div></header>
      <div className="content">
        {notice && <div className="notice"><span>ⓘ</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR TRADING COMMAND CENTRE</div><h1>{active === 'Overview' ? 'Good trading starts here.' : active}</h1><p className="subheading">{active === 'Overview' ? 'Your strategies, performance and market tools — all in one place.' : `Manage your ${active.toLowerCase()} from your TradeNovaX workspace.`}</p></div><a className="button button-primary" href={legacyUrl} target="_blank" rel="noreferrer"><span>↗</span> Open classic platform</a></section>
        <section className="connect-banner"><div className="connect-symbol"><span>◎</span></div><div className="connect-copy"><strong>Connect your Deriv account</strong><p>Securely connect to access live market data and run your bots. Your account is not connected yet.</p></div><button className="button button-light" onClick={() => {setActive('Deriv Connection');setNotice('Deriv connection setup selected. Live trading is not active until you authorize your account.')}}>Connect account <span>→</span></button><div className="banner-glow" /></section>
        <section className="section-heading"><div><h2>Workspace overview</h2><p>A quick look at your trading workspace.</p></div><div className="period-switch">{['24H','7D','30D','ALL'].map(x => <button key={x} onClick={() => setPeriod(x)} className={period === x ? 'selected' : ''}>{x}</button>)}</div></section>
        <section className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>Account balance</span><span className="stat-icon purple">◈</span></div><div className="stat-value">— <small>USD</small></div><div className="stat-foot"><span className="muted-dot" /> Connect Deriv to load balance</div></article>
          <article className="stat-card"><div className="stat-top"><span>Net profit / loss</span><span className="stat-icon mint">↗</span></div><div className="stat-value">— <small>USD</small></div><div className="stat-foot"><span className="muted-dot" /> No trades recorded yet</div></article>
          <article className="stat-card"><div className="stat-top"><span>Active bots</span><span className="stat-icon blue">⌘</span></div><div className="stat-value">0 <small>/ 3 saved</small></div><div className="stat-foot"><span className="status-dot" /> Bots are currently stopped</div></article>
          <article className="stat-card"><div className="stat-top"><span>Win rate</span><span className="stat-icon amber">◎</span></div><div className="stat-value">— <small>%</small></div><div className="stat-foot"><span className="muted-dot" /> Available after your first trades</div></article>
        </section>
        <section className="middle-grid"><article className="panel performance-panel"><div className="panel-head"><div><h3>Performance</h3><p>Your account activity over time</p></div><button className="more-button" onClick={() => choose('Performance')}>•••</button></div><div className="chart-wrap"><div className="chart-labels"><span>$100</span><span>$75</span><span>$50</span><span>$25</span><span>$0</span></div><div className="chart-area"><div className="chart-grid"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 640 180" preserveAspectRatio="none" role="img" aria-label="No performance data available yet"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7b6cff" stopOpacity=".22"/><stop offset="100%" stopColor="#7b6cff" stopOpacity="0"/></linearGradient></defs><path d="M0 145 C70 145 72 145 125 145 S210 145 260 145 S350 145 405 145 S520 145 640 145 L640 180 L0 180Z" fill="url(#chartFill)"/><path d="M0 145 C70 145 72 145 125 145 S210 145 260 145 S350 145 405 145 S520 145 640 145" fill="none" stroke="#8a7cff" strokeWidth="2" strokeDasharray="5 6"/></svg><div className="chart-empty"><span>⌁</span><strong>Your chart will appear here</strong><small>Connect Deriv and start trading to see performance.</small></div></div><div className="chart-xlabels"><span>Start</span><span>+1 day</span><span>+2 days</span><span>+3 days</span><span>+4 days</span><span>Now</span></div></div></article>
          <article className="panel activity-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Pick up where you left off</p></div></div><button className="quick-action" onClick={() => choose('Bot Builder')}><span className="quick-icon purple">⌘</span><span><strong>Build a trading bot</strong><small>Create a strategy with the bot builder</small></span><b>→</b></button><button className="quick-action" onClick={() => choose('My Bots')}><span className="quick-icon blue">▦</span><span><strong>Manage your bots</strong><small>Review saved strategies and settings</small></span><b>→</b></button><button className="quick-action" onClick={() => choose('Market Watch')}><span className="quick-icon mint">⌁</span><span><strong>Explore markets</strong><small>Choose a market for your next strategy</small></span><b>→</b></button><div className="tip-box"><span>✦</span><div><strong>Trade thoughtfully</strong><p>Test strategies in a demo account before using real funds. Trading involves risk.</p></div></div></article></section>
        <section className="panel bots-panel"><div className="panel-head"><div><h3>Your strategies</h3><p>Saved bot ideas in this workspace</p></div><button className="button button-outline" onClick={() => choose('My Bots')}>View all <span>→</span></button></div><div className="table-scroll"><table><thead><tr><th>STRATEGY</th><th>CONTRACT TYPE</th><th>MARKET</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((bot, i) => <tr key={bot.name}><td><div className="bot-name"><span className={`bot-avatar bot-${i % 3}`}>{['ϟ','↗','◉'][i % 3]}</span><span><strong>{bot.name}</strong><small>Strategy template</small></span></div></td><td>{bot.type}</td><td><span className="market-dot" />{bot.market}</td><td><span className={`pill ${bot.tone}`}><i />{bot.status}</span></td><td><button className="row-more" aria-label={`Open ${bot.name}`} onClick={() => {setActive('Bot Builder');setNotice(`${bot.name} selected. Configure and test this strategy before running it.`)}}>•••</button></td></tr>)}{filtered.length === 0 && <tr><td colSpan="5" className="no-results">No strategies match “{search}”.</td></tr>}</tbody></table></div><div className="table-foot"><span>Showing {filtered.length} of {strategies.length} saved strategy templates</span><button onClick={() => {setSearch('');choose('My Bots')}}>Manage strategies <span>→</span></button></div></section>
        <footer className="footer"><span>© {new Date().getFullYear()} TradeNovaX</span><span><i className="footer-dot" /> Workspace ready <b>·</b> Live trading requires account authorization</span><a href={legacyUrl} target="_blank" rel="noreferrer">Classic platform ↗</a></footer>
      </div>
    </main>
  </div>;
}
