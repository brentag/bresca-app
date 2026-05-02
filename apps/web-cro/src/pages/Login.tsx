import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setLoading(false);
    if (error) { setError('Código inválido. Verificá o solicitá uno nuevo.'); return; }
    // session change triggers App re-render
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoMark} />
          <span style={s.logoText}>bresca</span>
          <span style={s.logoBadge}>CRO</span>
        </div>

        <h1 style={s.title}>{step === 'email' ? 'Acceso CRO' : 'Verificá tu email'}</h1>
        <p style={s.subtitle}>
          {step === 'email'
            ? 'Ingresá con tu email autorizado para acceder al panel de investigación.'
            : `Ingresá el código de 6 dígitos enviado a ${email}`}
        </p>

        {step === 'email' ? (
          <form onSubmit={sendOtp} style={s.form}>
            <input
              style={s.input}
              type="email"
              placeholder="investigador@cro.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <p style={s.error}>{error}</p>}
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Enviando…' : 'Continuar →'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} style={s.form}>
            <input
              style={{ ...s.input, fontSize: 24, letterSpacing: 12, textAlign: 'center' }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
            {error && <p style={s.error}>{error}</p>}
            <button style={s.btn} type="submit" disabled={loading || otp.length !== 6}>
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
            <button type="button" style={s.linkBtn} onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
              ← Cambiar email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC' },
  card: { background: '#fff', borderRadius: 20, padding: '40px 48px', width: 400, boxShadow: '0 4px 24px rgba(0,0,0,.08)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 },
  logoMark: { width: 32, height: 32, borderRadius: 9, background: '#00C87A' },
  logoText: { fontSize: 20, fontWeight: 700, color: '#0F172A' },
  logoBadge: { fontSize: 11, fontWeight: 700, background: '#E8FBF3', color: '#00A663', padding: '2px 8px', borderRadius: 6 },
  title: { fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' },
  subtitle: { fontSize: 14, color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 15, outline: 'none', color: '#0F172A' },
  btn: { padding: '13px', borderRadius: 10, background: '#00C87A', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: 0 },
  error: { color: '#EF4444', fontSize: 13, margin: 0 },
};
