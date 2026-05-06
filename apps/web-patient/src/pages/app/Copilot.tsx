import { useEffect, useRef, useState } from 'react';
import { Send, ExternalLink, X } from 'lucide-react';
import { sendCopilotMessage } from '../../lib/api';
import { Spinner } from '../../components/Spinner';

type Message = { role: 'user' | 'assistant'; content: string };
type GPTContext = { userMsg: string; assistantMsg: string };

export default function Asistente() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [gptModal, setGptModal] = useState<GPTContext | null>(null);
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
      setError('Error al conectar. Intentá de nuevo.');
    }
    setLoading(false);
  }

  function openGPTModal(idx: number) {
    const assistantMsg = messages[idx].content;
    const userMsg = idx > 0 ? messages[idx - 1].content : '';
    setGptModal({ userMsg, assistantMsg });
  }

  function confirmGPT() {
    if (!gptModal) return;
    const context = `Mi consulta de salud:\n${gptModal.userMsg}\n\nRespuesta recibida:\n${gptModal.assistantMsg}\n\nQuiero profundizar sobre este tema.`;
    navigator.clipboard.writeText(context).catch(() => {});
    window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
    setGptModal(null);
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F9FC' }}>

        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Asistente</h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            Consultá sobre tus estudios y resultados{remaining !== null ? ` · ${remaining} consultas restantes` : ''}
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
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? '#00C87A' : '#fff',
                color: m.role === 'user' ? '#fff' : '#0F172A',
                fontSize: 15, lineHeight: 1.6,
                border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
              }}>
                {m.content}
              </div>
              {m.role === 'assistant' && (
                <button
                  onClick={() => openGPTModal(i)}
                  style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4B6EF5', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <ExternalLink size={12} />
                  ¿Querés verlo con GPT Salud?
                </button>
              )}
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

      {/* GPT Salud bottom sheet */}
      {gptModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setGptModal(null)}
        >
          <div
            style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>¿Querés verlo con GPT Salud?</h2>
              <button onClick={() => setGptModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
                <X size={20} color="#94A3B8" />
              </button>
            </div>

            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.65, margin: '0 0 10px' }}>
                Solo te conectamos con <strong>ChatGPT</strong>, un servicio de OpenAI.{' '}
                <strong>Bresca no tiene ninguna relación con ChatGPT ni con OpenAI</strong> y no se hace responsable por las respuestas que recibas allí.
              </p>
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.65, margin: 0 }}>
                Esto no es una recomendación médica. Es una guía disponible en internet que,{' '}
                <strong>bajo ningún punto de vista, reemplaza ni complementa la visión de un profesional de la medicina.</strong>
              </p>
            </div>

            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
              Vamos a copiar el contexto de tu consulta al portapapeles y abrir ChatGPT. Pegalo al inicio del chat para que tenga contexto de tu pregunta.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={confirmGPT}
                style={{ padding: '14px', borderRadius: 14, background: '#4B6EF5', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <ExternalLink size={16} />
                Copiar contexto y abrir ChatGPT
              </button>
              <button
                onClick={() => setGptModal(null)}
                style={{ padding: '14px', borderRadius: 14, background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
