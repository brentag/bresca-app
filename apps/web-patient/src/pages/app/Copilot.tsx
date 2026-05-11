import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ExternalLink, X } from 'lucide-react';
import { sendCopilotMessage, fetchContextCard } from '../../lib/api';
import { Spinner } from '../../components/Spinner';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';
import { useProfile } from '../../lib/useProfile';
import CopilotConsentGate from '../../components/CopilotConsentGate';

type Message = { role: 'user' | 'assistant'; content: string };
type GPTContext = { userMsg: string; assistantMsg: string };

function showGptCta() {
  return localStorage.getItem('bresca_show_gpt_cta') !== 'false';
}

export default function Asistente() {
  useTrackNode('copilot');
  const nav = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { isDark } = useTheme();
  const c = themeColors(isDark);
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

  async function confirmGPT() {
    if (!gptModal) return;
    let vaultSummary = '';
    try {
      const { context } = await fetchContextCard();
      vaultSummary = context;
    } catch { /* si falla, usa solo el contexto de la conversación */ }
    const context = [
      vaultSummary,
      `Mi consulta: ${gptModal.userMsg}`,
      `Respuesta de mi asistente de salud: ${gptModal.assistantMsg}`,
      'Quiero profundizar sobre este tema.',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(context).catch(() => {});
    window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
    setGptModal(null);
  }

  if (profileLoading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: c.bg }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: '#00C87A', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <CopilotConsentGate profileId={profile.id} onBack={() => nav(-1)}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: c.bg }}>

        <div style={{ padding: '16px 20px', background: c.card, borderBottom: `1px solid ${c.border}` }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Asistente</h1>
          <p style={{ fontSize: 13, color: c.textSub }}>
            Consultá sobre tus estudios y resultados{remaining !== null ? ` · ${remaining} consultas restantes` : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>🧬</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>¿En qué te ayudo?</h2>
              <p style={{ fontSize: 14, color: c.textSub, maxWidth: 260 }}>Preguntame sobre tus estudios, resultados o cualquier duda de salud.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? '#00C87A' : c.card,
                color: m.role === 'user' ? '#fff' : c.text,
                fontSize: 15, lineHeight: 1.6,
                border: m.role === 'assistant' ? `1px solid ${c.border}` : 'none',
              }}>
                {m.content}
              </div>
              {m.role === 'assistant' && showGptCta() && (
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
            placeholder="Preguntá sobre tus estudios…"
            rows={1}
            style={{ flex: 1, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: '12px 14px', fontSize: 16, fontFamily: "'Space Grotesk',sans-serif", resize: 'none', outline: 'none', maxHeight: 120, color: c.text, background: c.card }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ width: 46, height: 46, borderRadius: 14, border: 'none', background: loading || !input.trim() ? c.border : '#00C87A', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
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
            style={{ background: c.card, width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>¿Querés verlo con GPT Salud?</h2>
              <button onClick={() => setGptModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
                <X size={20} color={c.textMuted} />
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

            <p style={{ fontSize: 13, color: c.textSub, lineHeight: 1.6, marginBottom: 20 }}>
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
                style={{ padding: '14px', borderRadius: 14, background: c.cardAlt, color: c.textSub, border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </CopilotConsentGate>
  );
}
