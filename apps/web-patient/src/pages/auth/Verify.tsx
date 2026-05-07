import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Spinner, FullPageSpinner } from '../../components/Spinner';

async function redirectAfterLogin(
  nav: ReturnType<typeof useNavigate>,
  mode: 'login' | 'register',
  setError: (msg: string) => void,
) {
  // Flush explícito de la sesión: garantiza que el cliente Supabase tiene los headers
  // de auth listos antes de hacer la query (crítico cuando se llega por magic link)
  await supabase.auth.getSession();

  const { data } = await supabase.from('profiles').select('id').limit(1);
  const hasProfile = (data?.length ?? 0) > 0;

  if (hasProfile) {
    nav('/app/home', { replace: true });
    return;
  }

  nav('/onboarding/name', { replace: true });
  setError('');
}

export default function Verify() {
  const nav = useNavigate();
  const { state } = useLocation();
  const email = (state as { email?: string; mode?: string })?.email ?? '';
  // Leer mode desde query params (fallback cuando el magic link abre en browser fresco)
  const searchParams = new URLSearchParams(window.location.search);
  const modeFromUrl = searchParams.get('mode') as 'login' | 'register' | null;
  const mode: 'login' | 'register' = (state as { mode?: 'login' | 'register' })?.mode ?? modeFromUrl ?? 'login';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // true mientras esperamos que Supabase procese el hash del magic link
  const [checkingLink, setCheckingLink] = useState(() => window.location.hash.includes('access_token'));

  useEffect(() => {
    if (!checkingLink) return;
    // Supabase detecta automáticamente el token en el hash — esperamos el evento
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirectAfterLogin(nav, mode, setError);
      }
    });
    // Fallback: si ya hay sesión activa al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { redirectAfterLogin(nav, mode, setError); }
      else { setCheckingLink(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function verify() {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setLoading(false);
    if (err) { setError('Código incorrecto o vencido. Intentá de nuevo.'); return; }
    await redirectAfterLogin(nav, mode, setError);
  }

  if (checkingLink) return <FullPageSpinner />;

  const heading = mode === 'register' ? 'Verificá tu email' : 'Revisá tu email';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px', background: '#fff' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{heading}</h1>
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
