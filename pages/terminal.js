import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Terminal.module.css';

export default function Terminal() {
  const [configured, setConfigured] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const termInstanceRef = useRef(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('bridgeUrl');
    const savedPw = localStorage.getItem('bridgePassword');
    if (savedUrl && savedPw) {
      setBridgeUrl(savedUrl);
      setPassword(savedPw);
      setConfigured(true);
    } else {
      setShowSetup(true);
    }
  }, []);

  useEffect(() => {
    if (!configured || !termRef.current) return;

    let term, fitAddon;

    const load = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      term = new Terminal({
        theme: { background: '#0f0f0f', foreground: '#e8e8e8', cursor: '#d97706', selectionBackground: '#1e3a5f' },
        fontFamily: '"SF Mono", "Fira Code", Menlo, monospace',
        fontSize: 14,
        lineHeight: 1.4,
        cursorBlink: true,
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      fitAddon.fit();
      termInstanceRef.current = term;

      const base = bridgeUrl.replace(/\/$/, '');
      const wsUrl = base.replace(/^http/, 'ws') + `?token=${encodeURIComponent(password)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const statusEl = document.getElementById('ws-status');

      ws.onopen = () => {
        if (statusEl) { statusEl.textContent = '● Connected'; statusEl.className = styles.connected; }
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };
      ws.onmessage = (e) => term.write(e.data);
      ws.onclose = () => {
        if (statusEl) { statusEl.textContent = '○ Disconnected'; statusEl.className = ''; }
        term.write('\r\n\x1b[31mDisconnected. Refresh to reconnect.\x1b[0m\r\n');
      };
      ws.onerror = () => {
        if (statusEl) { statusEl.textContent = '○ Error'; statusEl.className = styles.error; }
      };

      term.onData((data) => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });

      const onResize = () => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    };

    const cleanup = load();
    return () => {
      cleanup.then((fn) => fn && fn());
      term?.dispose();
      wsRef.current?.close();
    };
  }, [configured, bridgeUrl, password]);

  const save = () => {
    if (!bridgeUrl.trim() || !password.trim()) { setError('Both fields required'); return; }
    localStorage.setItem('bridgeUrl', bridgeUrl.trim());
    localStorage.setItem('bridgePassword', password.trim());
    setError('');
    setShowSetup(false);
    setConfigured(true);
  };

  const reset = () => {
    wsRef.current?.close();
    termInstanceRef.current?.dispose();
    setConfigured(false);
    setShowSetup(true);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.logo}>◆</span>
        <span className={styles.title}>Claude Code — Terminal</span>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>Chat</a>
          {configured && <button onClick={reset} className={styles.settingsBtn}>Settings</button>}
        </nav>
        {configured && <span id="ws-status" className={styles.status}>Connecting...</span>}
      </header>

      {showSetup && (
        <div className={styles.setup}>
          <div className={styles.card}>
            <div className={styles.cardLogo}>◆</div>
            <h2>Connect to your Mac</h2>
            <p>Enter the Cloudflare tunnel URL and password from your local bridge server.</p>
            <input
              className={styles.input}
              type="text"
              placeholder="https://your-tunnel.trycloudflare.com"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button className={styles.btn} onClick={save}>Connect</button>
            <a href="/" className={styles.backLink}>← Back to Chat</a>
          </div>
        </div>
      )}

      {configured && (
        <div className={styles.termWrap} ref={termRef} />
      )}
    </div>
  );
}
