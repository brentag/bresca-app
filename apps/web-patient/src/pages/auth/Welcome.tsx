import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Welcome() {
  const nav = useNavigate();
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', background: '#fff' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#00C87A,#00B8D4,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,200,122,0.3)' }}>
        <Heart size={36} color="#fff" fill="#fff" />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: 12 }}>
        Tu historial médico,<br />siempre con vos.
      </h1>
      <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.65, maxWidth: 280, marginBottom: 40 }}>
        Bresca guarda, organiza y te ayuda a entender todos tus estudios médicos — sin importar dónde los hiciste.
      </p>
      <button onClick={() => nav('/auth/email')} style={btnStyle}>
        Comenzar →
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: '100%', maxWidth: 320, padding: '16px', borderRadius: 100, border: 'none',
  background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', color: '#fff',
  fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif",
  cursor: 'pointer', minHeight: 52,
};
