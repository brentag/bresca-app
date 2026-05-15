import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronDown, Send } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { sendSupportMessage } from '../lib/api';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_ACTIONS = [
  { label: '📤 Subir un estudio',    message: '¿Cómo subo un estudio?' },
  { label: '🔗 Compartir con QR',    message: '¿Cómo comparto un estudio con mi médico?' },
  { label: '👨‍👩‍👧 Gestionar familiar', message: '¿Cómo agrego un familiar?' },
  { label: '❓ ¿Qué hace el OCR?',   message: '¿Qué hace el OCR automáticamente?' },
];

// Parse [label →](/path) deep-link markdown into segments
function parseLinks(text: string) {
  const parts: { type: 'text' | 'link'; content: string; path?: string }[] = [];
  const re = /\[([^\]]+)\]\((\/[^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    parts.push({ type: 'link', content: m[1], path: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

export default function UnifiedAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDark } = useTheme();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      // Inject current screen context into the first message (not shown in UI)
      const apiText = messages.length === 0
        ? `${text}\n\n[Pantalla actual: ${pathname}]`
        : text;
      const { reply, remaining: rem } = await sendSupportMessage(apiText, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setRemaining(rem);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Tuve un problema para conectarme. Intentá de nuevo en un momento.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleLink(path: string) {
    navigate(path);
    setOpen(false);
  }

  const bg        = isDark ? '#0F172A' : '#ffffff';
  const bgMsg     = isDark ? '#1E293B' : '#F1F5F9';
  const textMain  = isDark ? '#F1F5F9' : '#0F172A';
  const border    = isDark ? '#1E293B' : '#E2E8F0';
  const chipBg    = isDark ? '#1E293B' : '#EEF2FF';
  const chipBorder = isDark ? '#334155' : '#C7D2FE';
  const chipText  = isDark ? '#A5B4FC' : '#4B6EF5';

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente"
          style={{
            position: 'fixed',
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            right: 16,
            zIndex: 200,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #4B6EF5, #818CF8)',
            boxShadow: '0 4px 20px rgba(75,110,245,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(75,110,245,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(75,110,245,0.4)'; }}
        >
          <MessageCircle size={24} color="#fff" strokeWidth={1.8} />
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 149, background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0,
          bottom: open ? 0 : '-88vh',
          height: '85vh',
          zIndex: 150,
          background: bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'bottom 320ms cubic-bezier(0.32,0,0.67,0)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 14px',
          background: 'linear-gradient(135deg, #4B6EF5, #818CF8)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🛟</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                Asistente Bresca
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
                {remaining !== null ? `${remaining} consultas restantes` : 'Aquí para ayudarte'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronDown size={18} color="#fff" />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Empty state: greeting + quick actions */}
          {messages.length === 0 && (
            <>
              <div style={{
                background: bgMsg,
                borderRadius: '18px 18px 18px 4px',
                padding: '12px 16px',
                color: textMain,
                fontSize: 14,
                lineHeight: 1.55,
                alignSelf: 'flex-start',
                maxWidth: '85%',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                ¡Hola! Soy el asistente de Bresca. ¿En qué te puedo ayudar?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => send(qa.message)}
                    style={{
                      background: chipBg,
                      border: `1px solid ${chipBorder}`,
                      borderRadius: 20,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: chipText,
                      cursor: 'pointer',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              <div style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4B6EF5, #818CF8)'
                  : bgMsg,
                color: msg.role === 'user' ? '#fff' : textMain,
                borderRadius: msg.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.55,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {msg.role === 'assistant'
                  ? parseLinks(msg.content).map((part, j) =>
                      part.type === 'link' ? (
                        <button
                          key={j}
                          onClick={() => handleLink(part.path!)}
                          style={{
                            display: 'inline-block',
                            background: isDark ? '#4B6EF5' : '#EEF2FF',
                            color: isDark ? '#fff' : '#4B6EF5',
                            border: 'none',
                            borderRadius: 12,
                            padding: '3px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                            margin: '2px 2px',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {part.content}
                        </button>
                      ) : (
                        <span key={j}>{part.content}</span>
                      )
                    )
                  : msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              display: 'flex',
              gap: 5,
              padding: '12px 16px',
              background: bgMsg,
              borderRadius: '18px 18px 18px 4px',
            }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: isDark ? '#475569' : '#94A3B8',
                    display: 'inline-block',
                    animation: `ua-bounce 1s ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '10px 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          borderTop: `1px solid ${border}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
          background: bg,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Escribí tu consulta..."
            style={{
              flex: 1,
              border: `1px solid ${border}`,
              borderRadius: 22,
              padding: '10px 16px',
              fontSize: 14,
              outline: 'none',
              background: isDark ? '#1E293B' : '#F8FAFC',
              color: textMain,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Enviar"
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              border: 'none',
              background: !input.trim() || loading
                ? (isDark ? '#334155' : '#E2E8F0')
                : 'linear-gradient(135deg, #4B6EF5, #818CF8)',
              cursor: !input.trim() || loading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 150ms ease-out',
            }}
          >
            <Send size={16} color={!input.trim() || loading ? (isDark ? '#475569' : '#94A3B8') : '#fff'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ua-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
