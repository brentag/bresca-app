import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { useIsDesktop } from '../../lib/responsive';

export default function Email() {
  const nav = useNavigate();
  const { state } = useLocation();
  const mode: 'login' | 'register' = (state as { mode?: 'login' | 'register' })?.mode ?? 'login';
  const isDesktop = useIsDesktop();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!email.includes('@')) { setError('Ingresá un email válido.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/verify?mode=${mode}`,
      },
    });
    setLoading(false);
    if (err) { setError('No pudimos enviar el código. Intentá de nuevo.'); return; }
    nav('/auth/verify', { state: { email, mode } });
  }

  const heading = mode === 'register' ? 'Creá tu cuenta' : 'Accedé a tu cuenta';
  const subtext = mode === 'register'
    ? 'Ingresá tu email para crear tu cuenta en Bresca.'
    : 'Ingresá tu email y te mandamos un código para entrar.';

  const formContent = (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: isDesktop ? '#0F172A' : '#0F172A', marginBottom: 8 }}>{heading}</h1>
      <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32 }}>{subtext}</p>

      <label style={labelStyle}>EMAIL</label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="tu@email.com"
        style={inputStyle}
        autoFocus
      />
      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <button
        onClick={send}
        disabled={loading || !email}
        style={{ ...btnStyle, marginTop: 24, opacity: loading || !email ? 0.5 : 1 }}
      >
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
      <button
        onClick={() => nav('/welcome')}
        style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}
      >
        ← Volver
      </button>
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', background: '#F8FAFC' }}>
        {/* Panel izquierdo — marca */}
        <div style={{
          width: 420, flexShrink: 0,
          background: 'linear-gradient(145deg, #00C87A 0%, #4B6EF5 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 48,
        }}>
          <img src="/logo-horizontal-negative.png" alt="Bresca" style={{ width: 160, marginBottom: 28 }} />
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.7, textAlign: 'center', maxWidth: 280 }}>
            Guardá y organizá todos tus estudios médicos en un solo lugar, con total privacidad.
          </p>
        </div>
        {/* Panel derecho — formulario */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px' }}>
          <div style={{ maxWidth: 400 }}>
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px', background: '#fff' }}>
      {formContent}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52 };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' };
