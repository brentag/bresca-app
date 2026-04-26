import { useNavigate } from 'react-router-dom';
import { Check, FlaskConical } from 'lucide-react';
import { ProgressDots } from './ProgressDots';
import { wrap, title, sub, btn, skip } from './_styles';

const POINTS = [
  'Siempre es optativo — vos decidís',
  'Tus datos nunca se identifican',
  'Podés revocar en cualquier momento',
  'Recibís info sobre estudios relevantes',
];

export default function ConsentIntro() {
  const nav = useNavigate();
  return (
    <div style={wrap}>
      <ProgressDots step={3} total={4} />
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(75,110,245,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <FlaskConical size={28} color="#4B6EF5" />
      </div>
      <h2 style={title}>Sobre la investigación médica</h2>
      <p style={sub}>Bresca colabora con organizaciones de investigación clínica. Podés elegir contribuir con tus datos de forma anónima.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        {POINTS.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,200,122,0.12)', border: '1px solid rgba(0,200,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Check size={12} color="#00C87A" strokeWidth={3} />
            </div>
            <span style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.55 }}>{t}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 16 }}>
        Podés cambiar estas opciones en Menú → Consentimiento en cualquier momento.
      </p>
      <button onClick={() => nav('/app/vault', { replace: true })} style={btn}>¡Entendido, empezar!</button>
      <button onClick={() => nav('/app/vault', { replace: true })} style={skip}>Configurar más tarde</button>
    </div>
  );
}
