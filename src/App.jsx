import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const APP_ID = '1089';
const SYMBOLS = [
  { value: 'R_10', label: 'Volatility 10 Index' },
  { value: 'R_25', label: 'Volatility 25 Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: 'R_75', label: 'Volatility 75 Index' },
  { value: 'R_100', label: 'Volatility 100 Index' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
];
const STRATEGIES = [
  { id: 'rise', name: 'Rise / Fall', description: 'Follow the last tick direction', contract: 'CALL', icon: '↗' },
  { id: 'digits', name: 'Digit differ', description: 'Trade when the last digit changes', contract: 'DIGITDIFF', icon: '◉' },
  { id: 'even', name: 'Even / Odd', description: 'Predict the last digit parity', contract: 'DIGITEVEN', icon: '⑂' },
];
const money = (v, currency='USD') => Number.isFinite(Number(v)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v)) : '—';
const stamp = () => new Date().toLocaleTimeString([], { hour12: false });

export default function App() {
  const [page, setPage] = useState('Bot Builder');
  const [symbol, setSymbol] = useState('1HZ100V');
  const [contract, setContract] = useState('CALL');
  const [stake, setStake] = useState('1');
  const [duration, setDuration] = useState('1');
  const [durationUnit, setDurationUnit] = useState('t');
  const [maxTrades, setMaxTrades] = useState('10');
  const [takeProfit, setTakeProfit] = useState('5');
  const [stopLoss, setStopLoss] = useState('5');
  const [token, setToken] = useState('');
  const [account, setAccount] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [botState, setBotState] = useState('stopped');
  const [ticks, setTicks] = useState([]);
  const [quote, setQuote] = useState(null);
  const [journal, setJournal] = useState([{ time: stamp(), type: 'info', message: 'Workspace ready. Connect a Deriv demo account to authorize trading.' }]);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState('Journal');
  const [notice, setNotice] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('rise');
  const [confirmLive, setConfirmLive] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [runningPnl, setRunningPnl] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const socketRef = useRef(null);
  const reqRef = useRef(0);
  const pendingRef = useRef(new Map());
  const configRef = useRef({});
  const botRef = useRef({ running: false, pending: false, count: 0, pnl: 0, lastQuote: null, lastDigit: null, openContract: null, lastSignal: null });
  const reconnectRef = useRef(null);
  const tokenRef = useRef('');
  const ticksRef = useRef([]);
  const accountRef = useRef(null);

  const addLog = useCallback((message, type='info') => {
    setJournal(old => [{ time: stamp(), type, message }, ...old].slice(0, 150));
  }, []);

  const send = useCallback((payload) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('Deriv connection is not open.');
    const req_id = ++reqRef.current;
    ws.send(JSON.stringify({ ...payload, req_id }));
    return req_id;
  }, []);

  const subscribeTicks = useCallback((market) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try { send({ forget_all: 'ticks' }); } catch {}
    try { send({ ticks: market, subscribe: 1 }); } catch {}
  }, [send]);

  useEffect(() => {
    let alive = true;
    const connect = () => {
      if (!alive) return;
      setConnection('connecting');
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
      socketRef.current = ws;
      ws.onopen = () => {
        if (!alive) return ws.close();
        setConnection('connected');
        addLog('Connected to Deriv market data.', 'success');
        try { send({ ticks: configRef.current.symbol || '1HZ100V', subscribe: 1 }); } catch {}
        if (tokenRef.current) {
          try { send({ authorize: tokenRef.current }); } catch (e) { addLog(e.message, 'error'); }
        }
      };
      ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.error) {
          const message = data.error.message || 'Deriv API request failed';
          addLog(message, 'error');
          if (data.msg_type === 'authorize' || data.error.code === 'InvalidToken') {
            setAccount(null); accountRef.current = null; setNotice('Authorization failed. Check your token and API permissions.');
          }
          if (data.msg_type === 'proposal' || data.msg_type === 'buy' || data.echo_req?.proposal || data.echo_req?.buy) {
            botRef.current.pending = false;
          }
          if (data.msg_type === 'proposal_open_contract' || data.echo_req?.proposal_open_contract) {
            botRef.current.running = false;
            setBotState('stopped');
            addLog('Contract updates failed. Bot stopped to avoid opening another trade while contract status is unknown.', 'error');
          }
          return;
        }
        if (data.msg_type === 'authorize' && data.authorize) {
          const a = data.authorize;
          const details = { loginid: a.loginid, currency: a.currency || 'USD', balance: Number(a.balance || 0), isDemo: /^VRTC|^VRT/i.test(a.loginid || '') };
          accountRef.current = details;
          setAccount(details);
          try { send({ balance: 1, subscribe: 1 }); } catch (e) { addLog(`Balance subscription failed: ${e.message}`, 'warn'); }
          setLiveMode(!details.isDemo);
          addLog(`Authorized ${details.loginid} · ${details.isDemo ? 'DEMO' : 'REAL'} account.`, details.isDemo ? 'success' : 'warn');
          setNotice(details.isDemo ? 'Demo account authorized. Check your risk limits before starting the bot.' : 'Real-money account authorized. Bot remains stopped until you explicitly confirm live trading.');
          if (botRef.current.openContract) {
            try { send({ proposal_open_contract: 1, contract_id: botRef.current.openContract, subscribe: 1 }); }
            catch (e) { addLog(`Could not restore contract monitoring: ${e.message}`, 'error'); }
          }
        }
        if (data.msg_type === 'balance' && data.balance) {
          const old = accountRef.current || {};
          const next = { ...old, balance: Number(data.balance.balance || 0), currency: data.balance.currency || old.currency || 'USD', loginid: data.balance.loginid || old.loginid };
          accountRef.current = next; setAccount(next);
        }
        if (data.msg_type === 'tick' && data.tick) {
          const t = data.tick;
          const rawQuote = String(t.quote);
          const precision = Number.isInteger(Number(t.pip_size)) ? Math.max(0, Math.min(10, Number(t.pip_size))) : ((rawQuote.split('.')[1] || '').length);
          const quoteText = Number(t.quote).toFixed(precision);
          const point = { epoch: t.epoch, quote: Number(t.quote), digit: Number(quoteText.replace('.', '').slice(-1)), time: new Date(t.epoch * 1000).toLocaleTimeString([], { hour12: false }) };
          const list = [...ticksRef.current, point].slice(-60);
          ticksRef.current = list;
          setTicks(list);
          setQuote(point);
          const b = botRef.current;
          if (!b.running || b.pending || b.openContract || !accountRef.current) { b.lastQuote = point; b.lastDigit = point.digit; return; }
          const cfg = configRef.current;
          if (b.count >= Number(cfg.maxTrades || 10)) { b.running = false; setBotState('stopped'); addLog('Maximum trade count reached. Bot stopped.', 'warn'); return; }
          if (Number(cfg.takeProfit) > 0 && b.pnl >= Number(cfg.takeProfit)) { b.running = false; setBotState('stopped'); addLog('Take-profit limit reached. Bot stopped.', 'success'); return; }
          if (Number(cfg.stopLoss) > 0 && b.pnl <= -Math.abs(Number(cfg.stopLoss))) { b.running = false; setBotState('stopped'); addLog('Stop-loss limit reached. Bot stopped.', 'warn'); return; }
          let signal = null;
          if (cfg.strategy === 'rise') {
            if (b.lastQuote && point.quote !== b.lastQuote.quote) signal = point.quote > b.lastQuote.quote ? 'CALL' : 'PUT';
          } else if (cfg.strategy === 'digits') {
            if (b.lastDigit !== null && point.digit !== b.lastDigit) signal = 'DIGITDIFF';
          } else if (cfg.strategy === 'even') {
            signal = point.digit % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD';
          }
          b.lastQuote = point; b.lastDigit = point.digit;
          if (signal) {
            b.pending = true; b.lastSignal = signal;
            const proposal = { proposal: 1, amount: Number(cfg.stake), basis: 'stake', contract_type: signal, currency: accountRef.current.currency || 'USD', duration: Number(cfg.duration), duration_unit: cfg.durationUnit, symbol: cfg.symbol };
            if (signal === 'DIGITDIFF') proposal.barrier = String(point.digit);
            try { send(proposal); addLog(`Signal ${signal} at ${point.quote}. Requesting proposal…`, 'info'); }
            catch (e) { b.pending = false; addLog(e.message, 'error'); }
          }
        }
        if (data.msg_type === 'proposal' && data.proposal) {
          const b = botRef.current;
          if (!b.running || !b.pending) return;
          try { send({ buy: data.proposal.id, price: Number(data.proposal.ask_price) }); addLog(`Proposal accepted. Buying ${b.lastSignal} contract…`, 'info'); }
          catch (e) { b.pending = false; addLog(e.message, 'error'); }
        }
        if (data.msg_type === 'buy' && data.buy) {
          const bought = data.buy;
          botRef.current.openContract = bought.contract_id;
          botRef.current.count += 1;
          setRunCount(botRef.current.count);
          setTrades(old => [{ id: bought.contract_id, time: stamp(), contract: botRef.current.lastSignal, buyPrice: Number(bought.buy_price || 0), payout: Number(bought.payout || 0), profit: null, status: 'Open' }, ...old].slice(0, 100));
          addLog(`Contract #${bought.contract_id} opened for ${money(bought.buy_price, accountRef.current?.currency)}.`, 'success');
          try { send({ proposal_open_contract: 1, contract_id: bought.contract_id, subscribe: 1 }); }
          catch (e) { addLog(e.message, 'error'); botRef.current.pending = false; }
        }
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
          const c = data.proposal_open_contract;
          if (c.is_sold) {
            if (data.subscription?.id) { try { send({ forget: data.subscription.id }); } catch {} }
            const profit = Number(c.profit || 0);
            botRef.current.pnl += profit;
            botRef.current.pending = false; botRef.current.openContract = null;
            setRunningPnl(botRef.current.pnl);
            setTrades(old => old.map(t => String(t.id) === String(c.contract_id) ? { ...t, profit, status: 'Closed' } : t));
            addLog(`Contract #${c.contract_id} closed · P/L ${money(profit, accountRef.current?.currency)}.`, profit >= 0 ? 'success' : 'warn');
          }
        }
      };
      ws.onerror = () => { if (alive) { setConnection('error'); addLog('WebSocket connection error. Check your network.', 'error'); } };
      ws.onclose = () => {
        if (!alive) return;
        setConnection('disconnected');
        if (botRef.current.running) { botRef.current.running = false; setBotState('stopped'); addLog('Connection lost. Bot stopped for safety.', 'error'); }
        reconnectRef.current = setTimeout(connect, 4000);
      };
    };
    connect();
    return () => { alive = false; clearTimeout(reconnectRef.current); try { socketRef.current?.close(); } catch {} };
  }, [addLog, send]);

  useEffect(() => { configRef.current = { symbol, stake, duration, durationUnit, maxTrades, takeProfit, stopLoss, strategy: selectedStrategy }; }, [symbol, stake, duration, durationUnit, maxTrades, takeProfit, stopLoss, selectedStrategy]);
  useEffect(() => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) subscribeTicks(symbol);
  }, [symbol, subscribeTicks]);

  const authorize = () => {
    if (!token.trim()) { setNotice('Paste a Deriv API token with read and trade permissions. For the first test, use a demo account token.'); return; }
    tokenRef.current = token.trim();
    try { send({ authorize: tokenRef.current }); setNotice('Authorization request sent to Deriv…'); }
    catch (e) { setNotice(e.message); }
  };

  const startBot = () => {
    if (botRef.current.openContract) { setNotice(`Contract #${botRef.current.openContract} is still being monitored. The bot cannot start another run until Deriv confirms that contract is closed.`); addLog('Start blocked: an existing contract is still open or its final status is not yet confirmed.', 'warn'); return; }
    if (botRef.current.pending) { setNotice('A trade request is still pending. Wait for Deriv to confirm its result before restarting the bot.'); return; }
    if (!account) { setNotice('Connect and authorize a Deriv demo account before starting.'); return; }
    if (!account.isDemo && !confirmLive) { setNotice('Real account detected. Tick “I understand this can place real-money trades” before starting.'); return; }
    if (!Number.isFinite(Number(stake)) || Number(stake) <= 0 || !Number.isFinite(Number(duration)) || Number(duration) <= 0) { setNotice('Stake and duration must be positive numbers.'); return; }
    if (!Number.isInteger(Number(maxTrades)) || Number(maxTrades) < 1 || Number(maxTrades) > 100) { setNotice('Maximum trades must be a whole number from 1 to 100.'); return; }
    if (!Number.isFinite(Number(takeProfit)) || Number(takeProfit) < 0 || !Number.isFinite(Number(stopLoss)) || Number(stopLoss) <= 0) { setNotice('Take profit must be zero or greater, and stop loss must be greater than zero.'); return; }
    botRef.current = { ...botRef.current, running: true, pending: false, count: 0, pnl: 0, lastQuote: quote, lastDigit: quote?.digit ?? null };
    setRunningPnl(0); setRunCount(0); setBotState('running'); setNotice('');
    addLog(`Bot started on ${SYMBOLS.find(s => s.value === symbol)?.label || symbol} · ${account.isDemo ? 'DEMO' : 'REAL'} · stake ${money(Number(stake), account.currency)}.`, 'success');
  };
  const stopBot = () => {
    botRef.current.running = false; setBotState('stopped');
    addLog('Stop requested. No new trades will be opened; an existing contract may finish normally.', 'warn');
  };
  const saveConfig = () => {
    const config = { symbol, contract, stake, duration, durationUnit, maxTrades, takeProfit, stopLoss, strategy: selectedStrategy, savedAt: new Date().toISOString() };
    try { localStorage.setItem('tradenovax-bot-config', JSON.stringify(config)); setNotice('Strategy saved in this browser.'); addLog('Strategy settings saved locally.', 'success'); }
    catch { setNotice('Could not save this strategy in the browser.'); }
  };
  const loadConfig = () => {
    try {
      const raw = localStorage.getItem('tradenovax-bot-config');
      if (!raw) { setNotice('No saved strategy found in this browser yet.'); return; }
      const c = JSON.parse(raw);
      setSymbol(c.symbol || '1HZ100V'); setContract(c.contract || 'CALL'); setStake(String(c.stake || '1')); setDuration(String(c.duration || '1')); setDurationUnit(c.durationUnit || 't'); setMaxTrades(String(c.maxTrades || '10')); setTakeProfit(String(c.takeProfit || '5')); setStopLoss(String(c.stopLoss || '5')); setSelectedStrategy(c.strategy || 'rise'); setNotice('Saved strategy loaded.');
    } catch { setNotice('Saved strategy could not be loaded.'); }
  };
  const exportConfig = () => {
    const config = { version: 1, symbol, contract, stake, duration, durationUnit, maxTrades, takeProfit, stopLoss, strategy: selectedStrategy };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tradenovax-strategy.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importConfig = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const c = JSON.parse(String(reader.result)); setSymbol(c.symbol || '1HZ100V'); setContract(c.contract || 'CALL'); setStake(String(c.stake || '1')); setDuration(String(c.duration || '1')); setDurationUnit(c.durationUnit || 't'); setMaxTrades(String(c.maxTrades || '10')); setTakeProfit(String(c.takeProfit || '5')); setStopLoss(String(c.stopLoss || '5')); setSelectedStrategy(c.strategy || 'rise'); setNotice('Strategy imported. Review all settings before running.'); } catch { setNotice('That strategy file is not valid JSON.'); } };
    reader.readAsText(file); event.target.value = '';
  };

  const chartPath = useMemo(() => {
    if (ticks.length < 2) return '';
    const min = Math.min(...ticks.map(t => t.quote)); const max = Math.max(...ticks.map(t => t.quote)); const range = max - min || 1;
    return ticks.map((t, i) => `${i ? 'L' : 'M'} ${(i / (ticks.length - 1)) * 100} ${95 - ((t.quote - min) / range) * 82}`).join(' ');
  }, [ticks]);
  const currentStrategy = STRATEGIES.find(s => s.id === selectedStrategy) || STRATEGIES[0];

  return <div className="dbot-shell">
    <aside className="dbot-sidebar">
      <div className="dbot-brand"><div className="dbot-logo">TN</div><div><strong>TradeNova<span>X</span></strong><small>BOT WORKSPACE</small></div><span className="beta-tag">BETA</span></div>
      <button className="account-card" onClick={() => setPage('Account')}><span className="account-avatar">◎</span><span><strong>{account?.loginid || 'Connect Deriv account'}</strong><small>{account ? (account.isDemo ? 'Demo account' : 'Real account') : 'Not authorized'}</small></span><b>⌄</b></button>
      <div className="side-label">WORKSPACE</div>
      {[['Bot Builder','▦'],['Charts & Markets','⌁'],['Trade History','↗'],['Performance','▥']].map(([name,icon])=><button key={name} className={`side-link ${page===name?'side-active':''}`} onClick={()=>setPage(name)}><span>{icon}</span>{name}</button>)}
      <div className="side-label side-label-tools">BOT TOOLS</div>
      <button className="side-link" onClick={saveConfig}><span>▣</span>Save strategy</button>
      <button className="side-link" onClick={loadConfig}><span>⟲</span>Load saved strategy</button>
      <label className="side-link file-label"><span>⇧</span>Import strategy<input type="file" accept=".json,application/json" onChange={importConfig}/></label>
      <button className="side-link" onClick={exportConfig}><span>⇩</span>Export strategy</button>
      <div className="sidebar-bottom"><div className="risk-card"><span>✦</span><strong>Trade with a plan</strong><p>Set clear loss limits and test your strategy on demo first.</p></div><div className="sidebar-status"><i className={connection==='connected'?'online':''}/><span>Market feed {connection}</span></div><small className="version">TradeNovaX · React workspace</small></div>
    </aside>

    <main className="dbot-main">
      <header className="dbot-topbar"><div className="dbot-breadcrumb"><button className="mobile-menu" onClick={()=>document.querySelector('.dbot-sidebar')?.classList.toggle('show-mobile')}>☰</button><span>Workspace</span><b>/</b><strong>{page}</strong></div><div className="top-status"><span className={`connection-light ${connection==='connected'?'connected':''}`}/><span>{connection==='connected'?'Deriv connected':connection==='connecting'?'Connecting…':'Market feed offline'}</span><span className="top-divider"/><span className="account-mode">{account ? (account.isDemo?'DEMO ACCOUNT':'REAL ACCOUNT') : 'PUBLIC MARKET DATA'}</span></div></header>
      <div className="dbot-content">
        {notice && <div className="dbot-notice"><span>ⓘ</span><p>{notice}</p><button onClick={()=>setNotice('')}>×</button></div>}
        {page==='Account' ? <section className="account-page panel"><div className="page-title"><div><span className="overline">ACCOUNT SETTINGS</span><h1>Connect your Deriv account</h1><p>Use a Deriv API token to authorize this browser session.</p></div></div><div className="token-panel"><label>API token</label><input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste demo API token" autoComplete="off"/><button className="btn btn-primary" onClick={authorize}>Authorize account</button><p>Token stays in this browser session and is not saved to local storage. Use a demo token with read and trade permissions to test.</p><a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer">Manage Deriv API tokens ↗</a>{account&&<div className="account-summary"><strong>{account.loginid}</strong><span>{money(account.balance,account.currency)} {account.currency}</span><small>{account.isDemo?'Demo account':'Real account'}</small></div>}</div></section> :
        page==='Trade History' ? <section className="panel data-page"><div className="page-title"><div><span className="overline">EXECUTION RECORD</span><h1>Trade history</h1><p>Contracts opened by this workspace session.</p></div></div><TradeTable trades={trades} currency={account?.currency||'USD'}/></section> :
        page==='Performance' ? <section className="panel data-page"><div className="page-title"><div><span className="overline">SESSION ANALYTICS</span><h1>Performance</h1><p>Live performance for this bot session.</p></div></div><div className="performance-cards"><Metric label="Session P/L" value={money(runningPnl,account?.currency)} tone={runningPnl>=0?'positive':'negative'}/><Metric label="Contracts bought" value={String(runCount)}/><Metric label="Closed contracts" value={String(trades.filter(t=>t.status==='Closed').length)}/></div><div className="empty-note">Statistics reflect contracts recorded by this browser session only.</div></section> :
        page==='Charts & Markets' ? <MarketPanel symbol={symbol} setSymbol={setSymbol} quote={quote} ticks={ticks} chartPath={chartPath}/> :
        <><section className="page-title"><div><span className="overline"><i className="live-dot"/> AUTOMATED TRADING STUDIO</span><h1>Bot Builder</h1><p>Configure your strategy, review the market, and test it on a Deriv demo account.</p></div><div className="page-actions"><button className="btn btn-secondary" onClick={loadConfig}>↶ Load</button><button className="btn btn-secondary" onClick={saveConfig}>▣ Save</button><button className="btn btn-secondary" onClick={exportConfig}>⇩ Export</button></div></section>
        <section className="control-strip"><div className="control-title"><span className="control-glyph">⌘</span><div><strong>Bot controls</strong><small>{botState==='running'?'Strategy is running':botState==='stopped'?'Ready to configure':'Paused'}</small></div></div><div className="run-meta"><span>Trades <b>{runCount}/{maxTrades}</b></span><span>Session P/L <b className={runningPnl>=0?'positive':'negative'}>{money(runningPnl,account?.currency)}</b></span></div><div className="run-buttons">{botState==='running'?<button className="btn btn-stop" onClick={stopBot}>■ Stop bot</button>:<button className="btn btn-run" onClick={startBot}>▶ Run bot</button>}<span className={`bot-pill ${botState}`}><i/>{botState==='running'?'RUNNING':'STOPPED'}</span></div></section>
        <div className="builder-grid">
          <section className="panel blocks-panel"><div className="panel-header"><div><h2>Strategy workspace</h2><p>Configure each block to define your trading rules.</p></div><span className="panel-count">3 BLOCKS</span></div>
            <div className="block-card block-market"><div className="block-heading"><span className="block-number">01</span><div><strong>Trade parameters</strong><small>Market, contract and stake</small></div><span className="block-chevron">⌄</span></div><div className="block-fields"><label>Market<select value={symbol} onChange={e=>setSymbol(e.target.value)}>{SYMBOLS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label>Strategy<select value={selectedStrategy} onChange={e=>{setSelectedStrategy(e.target.value);setContract(STRATEGIES.find(s=>s.id===e.target.value)?.contract||'CALL')}}>{STRATEGIES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="field-row"><label>Stake ({account?.currency||'USD'})<div className="input-unit"><input type="number" min="0.35" step="0.01" value={stake} onChange={e=>setStake(e.target.value)}/><span>{account?.currency||'USD'}</span></div></label><label>Duration<div className="input-unit"><input type="number" min="1" value={duration} onChange={e=>setDuration(e.target.value)}/><select value={durationUnit} onChange={e=>setDurationUnit(e.target.value)}><option value="t">Ticks</option><option value="s">Seconds</option><option value="m">Minutes</option></select></div></label></div></div></div>
            <div className="block-connector"><span>↓</span></div>
            <div className="block-card block-entry"><div className="block-heading"><span className="block-number">02</span><div><strong>Purchase conditions</strong><small>When should the bot enter a trade?</small></div><span className="block-chevron">⌄</span></div><div className="strategy-choice"><div className="strategy-icon">{currentStrategy.icon}</div><div><strong>{currentStrategy.name}</strong><p>{currentStrategy.description}</p></div><span className="strategy-badge">ACTIVE RULE</span></div><div className="condition-preview"><span>IF</span><p>{selectedStrategy==='rise'?'The latest tick moves up or down':selectedStrategy==='digits'?'The last digit differs from the previous tick':'The latest last digit is even or odd'}</p><span>THEN</span><p>Request a contract proposal and buy within the configured stake.</p></div></div>
            <div className="block-connector"><span>↓</span></div>
            <div className="block-card block-risk"><div className="block-heading"><span className="block-number">03</span><div><strong>Restart & risk limits</strong><small>Control trade count and session boundaries</small></div><span className="block-chevron">⌄</span></div><div className="field-row"><label>Maximum trades<input type="number" min="1" max="100" value={maxTrades} onChange={e=>setMaxTrades(e.target.value)}/></label><label>Take profit ({account?.currency||'USD'})<input type="number" min="0" step="0.1" value={takeProfit} onChange={e=>setTakeProfit(e.target.value)}/></label><label>Stop loss ({account?.currency||'USD'})<input type="number" min="0.1" step="0.1" value={stopLoss} onChange={e=>setStopLoss(e.target.value)}/></label></div><p className="risk-footnote">The bot stops opening new trades when a configured limit is reached. Open contracts may still settle.</p></div>
            <div className="workspace-toolbar"><span><i className="live-dot"/> Strategy settings are local to this browser</span><button onClick={saveConfig}>Save strategy settings ↗</button></div>
          </section>
          <aside className="right-stack">
            <section className="panel market-panel"><div className="panel-header"><div><h2>Market overview</h2><p>{SYMBOLS.find(s=>s.value===symbol)?.label||symbol}</p></div><span className={`market-live ${connection==='connected'?'':'offline'}`}>{connection==='connected'?'LIVE':'OFFLINE'}</span></div><div className="quote-row"><div><span className="quote-label">Latest quote</span><strong className="quote-number">{quote?quote.quote.toLocaleString('en-US',{maximumFractionDigits:4}):'—'}</strong></div><div className="digit-box"><small>LAST DIGIT</small><strong>{quote?quote.digit:'—'}</strong></div></div><div className="chart-mini"><div className="chart-guides"><i/><i/><i/><i/></div>{chartPath?<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Recent live tick prices"><path d={`${chartPath} L 100 100 L 0 100 Z`} fill="#32b98b" opacity=".09"/><path d={chartPath} fill="none" stroke="#40d5a0" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>:<div className="chart-placeholder">Waiting for live ticks…</div>}</div><div className="chart-foot"><span>{ticks.length} recent ticks</span><span>{quote?.time||'Waiting'}</span></div></section>
            <section className="panel account-panel"><div className="panel-header"><div><h2>Account connection</h2><p>Deriv API authorization</p></div><span className={`connection-light ${account?'connected':''}`}/></div>{account?<><div className="connected-account"><span className="account-avatar">◎</span><div><strong>{account.loginid}</strong><small>{account.isDemo?'Demo account':'Real account'}</small></div><span className="connected-check">✓</span></div><div className="balance-line"><span>Available balance</span><strong>{money(account.balance,account.currency)}</strong></div><button className="btn btn-secondary full-btn" onClick={()=>{setPage('Account');setNotice('')}}>Manage connection</button></>:<><div className="token-entry"><label htmlFor="api-token">API token</label><input id="api-token" type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste demo token" autoComplete="off"/><small>Token is not saved. Use a demo token first.</small></div><button className="btn btn-primary full-btn" onClick={authorize}>Connect Deriv account ↗</button><a className="token-help" href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer">Create an API token ↗</a></>}</section>
            {account&&!account.isDemo&&<section className="panel live-warning"><label><input type="checkbox" checked={confirmLive} onChange={e=>setConfirmLive(e.target.checked)}/><span><strong>Live trading acknowledgement</strong><small>I understand this bot can place real-money trades.</small></span></label></section>}
            <section className="panel stats-panel"><div className="panel-header"><div><h2>Session summary</h2><p>Current browser session</p></div></div><div className="summary-line"><span>Contracts opened</span><strong>{runCount}</strong></div><div className="summary-line"><span>Realized P/L</span><strong className={runningPnl>=0?'positive':'negative'}>{money(runningPnl,account?.currency)}</strong></div><div className="summary-line"><span>Contracts open</span><strong>{trades.filter(t=>t.status==='Open').length}</strong></div><div className="summary-line"><span>Account mode</span><strong className={account?.isDemo?'positive':'muted'}>{account?(account.isDemo?'DEMO':'REAL'):'Not connected'}</strong></div></section>
          </aside>
        </div>
        <section className="panel activity-panel"><div className="activity-top"><div><h2>Execution monitor</h2><p>Live bot events, contracts and API messages</p></div><div className="activity-tabs">{['Journal','Trades'].map(t=><button key={t} className={tab===t?'tab-active':''} onClick={()=>setTab(t)}>{t}</button>)}</div></div>{tab==='Journal'?<div className="journal"><div className="journal-head"><span>TIME</span><span>TYPE</span><span>EVENT</span></div>{journal.slice(0,20).map((entry,i)=><div className="journal-row" key={i}><time>{entry.time}</time><span className={`log-type ${entry.type}`}>{entry.type.toUpperCase()}</span><span>{entry.message}</span></div>)}</div>:<TradeTable trades={trades} currency={account?.currency||'USD'}/>}</section>
        <footer className="dbot-footer"><span>TradeNovaX · Automated trading workspace</span><span><i className={connection==='connected'?'online':''}/> {connection==='connected'?'Connected to Deriv API':'Market connection unavailable'} · Trading involves risk</span><a href="https://www.mkoreanwwn.com/?account=demo" target="_blank" rel="noreferrer">Reference demo ↗</a></footer>
        </>}
      </div>
    </main>
  </div>;
}

function Metric({label,value,tone}) { return <div className="performance-metric"><span>{label}</span><strong className={tone||''}>{value}</strong></div>; }
function TradeTable({trades,currency}) { return <div className="trade-table-wrap"><table className="trade-table"><thead><tr><th>CONTRACT ID</th><th>TIME</th><th>TYPE</th><th>BUY PRICE</th><th>PROFIT / LOSS</th><th>STATUS</th></tr></thead><tbody>{trades.length?trades.map(t=><tr key={t.id}><td>#{t.id}</td><td>{t.time}</td><td>{t.contract}</td><td>{money(t.buyPrice,currency)}</td><td className={t.profit==null?'muted':t.profit>=0?'positive':'negative'}>{t.profit==null?'Pending':money(t.profit,currency)}</td><td><span className={`trade-status ${t.status==='Open'?'open':'closed'}`}>{t.status}</span></td></tr>):<tr><td colSpan="6" className="empty-table">No contracts yet. Start on a demo account to record your first trade.</td></tr>}</tbody></table></div>; }
function MarketPanel({symbol,setSymbol,quote,ticks,chartPath}) { return <section className="panel data-page market-page"><div className="page-title"><div><span className="overline">LIVE MARKET DATA</span><h1>Charts & Markets</h1><p>Subscribe to public Deriv tick feeds without authorizing an account.</p></div></div><div className="market-select"><label>Market<select value={symbol} onChange={e=>setSymbol(e.target.value)}>{SYMBOLS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><div><small>Latest quote</small><strong>{quote?quote.quote:'—'}</strong></div><div><small>Last digit</small><strong>{quote?quote.digit:'—'}</strong></div></div><div className="large-chart">{chartPath?<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d={`${chartPath} L 100 100 L 0 100 Z`} fill="#32b98b" opacity=".09"/><path d={chartPath} fill="none" stroke="#40d5a0" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>:<div className="chart-placeholder">Waiting for market data…</div>}</div><div className="chart-foot"><span>{ticks.length} ticks buffered</span><span>{quote?.time||'Waiting for quote'}</span></div></section>; }
