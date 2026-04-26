import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

export default function Verify() {
  const nav = useNavigate();
  const { state } = useLocation();
  const email = (state as { email?: string })?.email ?? '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function verify() {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setLoading(false);
    if (err) { setError('Código incorrecto o vencido. Intentá de nuevo.'); return; }
    const { data: profile } = await supabase.from('profiles').select('id').maybeSingle();
    nav(profile ? '/app/vault' : '/onboarding/name', { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px', background: '#fff' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Revisá tu email</h1>
      <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32 }}>
        Enviamos un código a <strong>{email}</strong>.
      </p>

      <label style={labelStyle}>CÓDIGO DE 6 DÍGITOS</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verify()}
        placeholder="000000"
        style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: 22 }}
        autoFocus
      />
      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <button
        onClick={verify}
        disabled={loading || otp.length !== 6}
        style={{ ...btnStyle, marginTop: 24, opacity: loading || otp.length !== 6 ? 0.5 : 1 }}
      >
        {loading ? <Spinner /> : 'Verificar →'}
      </button>
      <button
        onClick={() => nav('/auth/email')}
        style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}
      >
        ← Cambiar email
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52 };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' };
