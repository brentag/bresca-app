import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { sendCopilotMessage } from '../../lib/api';
import { Spinner } from '../../components/Spinner';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput(''); setError('');
    const next: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply, remaining: rem } = await sendCopilotMessage(msg, messages);
      setMessages([...next, { role: 'assistant', content: reply }]);
      setRemaining(rem);
    } catch {
      setError('Error al conectar con el Copilot. Intentá de nuevo.');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F9FC' }}>
      <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Copilot</h1>
        <p style={{ fontSize: 13, color: '#64748B' }}>
          Tu asistente médico personal{remaining !== null ? ` · ${remaining} consultas restantes hoy` : ''}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>🧬</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>¿En qué te ayudo?</h2>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 260 }}>Preguntame sobre tus estudios, resultados o cualquier duda de salud.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? '#00C87A' : '#fff', color: m.role === 'user' ? '#fff' : '#0F172A', fontSize: 15, lineHeight: 1.6, border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <Spinner />
            </div>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Preguntá sobre tus estudios…"
          rows={1}
          style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '12px 14px', fontSize: 15, fontFamily: "'Space Grotesk',sans-serif", resize: 'none', outline: 'none', maxHeight: 120, color: '#0F172A' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ width: 46, height: 46, borderRadius: 14, border: 'none', background: loading || !input.trim() ? '#E2E8F0' : '#00C87A', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
