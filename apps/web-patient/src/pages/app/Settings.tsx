import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const GPT_CTA_KEY = 'bresca_show_gpt_cta';

export default function Settings() {
  const nav = useNavigate();
  const [gptCta, setGptCta] = useState(
    () => localStorage.getItem(GPT_CTA_KEY) !== 'false',
  );

  function toggleGptCta(enabled: boolean) {
    setGptCta(enabled);
    localStorage.setItem(GPT_CTA_KEY, enabled ? 'true' : 'false');
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button
          onClick={() => nav(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44, padding: 0 }}
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Configuración</span>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Asistente
        </p>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExternalLink size={18} color="#4B6EF5" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0 }}>Sugerir GPT Salud</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Mostrar opción de continuar en ChatGPT al final de cada respuesta
              </p>
            </div>
            <button
              onClick={() => toggleGptCta(!gptCta)}
              style={{
                width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: gptCta ? '#00C87A' : '#E2E8F0',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
                left: gptCta ? 23 : 3,
              }} />
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
          Cuando activás esta opción, el asistente te ofrece abrir ChatGPT con el contexto de tu consulta y tus estudios (sin datos personales).
          Bresca no tiene relación con OpenAI.
        </p>
      </div>
    </div>
  );
}
