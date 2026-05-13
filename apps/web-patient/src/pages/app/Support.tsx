import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { sendSupportMessage } from '../../lib/api';
import { Spinner } from '../../components/Spinner';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';

type Message = { role: 'user' | 'assistant'; content: string };

const GREETING = '¡Hola! Soy el Asistente de Soporte de Bresca. Puedo ayudarte con cómo usar la app: subir estudios, compartir por QR, gestionar familiares y más. ¿En qué te ayudo?';

export default function SupportChat() {
  useTrackNode('support');
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ]);
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
    // history excluye el saludo inicial del estado; solo enviamos la conversación real
    const history = messages.slice(1);
    const next: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply, remaining: rem } = await sendSupportMessage(msg, history);
      setMessages([...next, { role: 'assistant', content: reply }]);
      setRemaining(rem);
    } catch {
      setError('Error al conectar. Intentá de nuevo.');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: c.bg }}>

      <div style={{ padding: '16px 20px', background: c.card, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#4B6EF5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🛟</span>
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>Asistente XYZ</h1>
            <p style={{ fontSize: 12, color: c.textSub, margin: 0 }}>
              Soporte de BrescaApp{remaining !== null ? ` · ${remaining} consultas restantes` : ''}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%', padding: '12px 16px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? '#4B6EF5' : c.card,
              color: m.role === 'user' ? '#fff' : c.text,
              fontSize: 15, lineHeight: 1.6,
              border: m.role === 'assistant' ? `1px solid ${c.border}` : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: c.card, border: `1px solid ${c.border}` }}>
              <Spinner />
            </div>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: c.card, borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
          placeholder="¿Cómo puedo ayudarte?"
          rows={1}
          style={{ flex: 1, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: '12px 14px', fontSize: 16, fontFamily: "'Space Grotesk',sans-serif", resize: 'none', outline: 'none', maxHeight: 120, color: c.text, background: c.card }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ width: 46, height: 46, borderRadius: 14, border: 'none', background: loading || !input.trim() ? c.border : '#4B6EF5', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
