import { useState, useRef, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages([...updated, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>◆</span>
          <span className={styles.title}>Claude</span>
          <a href="/terminal" className={styles.terminalLink}>Terminal →</a>
        </div>
      </header>

      <main className={styles.main}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◆</span>
            <h2>How can I help you today?</h2>
          </div>
        )}

        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
              <div className={styles.bubble}>
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className={`${styles.message} ${styles.assistant}`}>
              <div className={styles.bubble}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e); }}
            onKeyDown={handleKeyDown}
            placeholder="Message Claude..."
            rows={1}
          />
          <button
            className={styles.sendBtn}
            onClick={send}
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
        <p className={styles.hint}>Enter to send · Shift+Enter for new line</p>
      </footer>
    </div>
  );
}
