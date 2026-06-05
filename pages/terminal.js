import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Terminal.module.css';

const BRIDGE_URL = 'https://synoecious-quizzable-adrian.ngrok-free.dev';
const BRIDGE_PASSWORD = 'wildrose123';

export default function Terminal() {
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!termRef.current) return;

    let term, fitAddon, onResize;

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

      const wsUrl = BRIDGE_URL.replace(/^http/, 'ws') + `?token=${encodeURIComponent(BRIDGE_PASSWORD)}&ngrok-skip-browser-warning=true`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('● Connected');
        setConnected(true);
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };
      ws.onmessage = (e) => term.write(e.data);
      ws.onclose = () => {
        setStatus('○ Disconnected');
        setConnected(false);
        term.write('\r\n\x1b[31mDisconnected. Refresh to reconnect.\x1b[0m\r\n');
      };
      ws.onerror = () => {
        setStatus('○ Error');
        setConnected(false);
      };

      term.onData((data) => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });

      onResize = () => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      };
      window.addEventListener('resize', onResize);
    };

    load();

    return () => {
      window.removeEventListener('resize', onResize);
      term?.dispose();
      wsRef.current?.close();
    };
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.logo}>◆</span>
        <span className={styles.title}>Claude Code</span>
        <a href="/" className={styles.navLink}>Chat</a>
        <span className={`${styles.status} ${connected ? styles.connected : ''}`}>{status}</span>
      </header>
      <div className={styles.termWrap} ref={termRef} />
    </div>
  );
}
