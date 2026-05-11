import { useEffect, useState } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme, themeColors } from '../lib/theme';

const CONSENT_LS_KEY = 'bresca_ai_copilot_consent';
const CONSENT_VERSION = 'ai_copilot_v1';

interface Props {
  profileId: string;
  onBack: () => void;
  children: React.ReactNode;
}

export default function CopilotConsentGate({ profileId, onBack, children }: Props) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const [status, setStatus] = useState<'loading' | 'gate' | 'accepted'>('loading');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem(CONSENT_LS_KEY) === CONSENT_VERSION) {
      setStatus('accepted');
      return;
    }
    supabase
      .from('user_consent_state')
      .select('has_accepted_ai_copilot')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.has_accepted_ai_copilot) {
          localStorage.setItem(CONSENT_LS_KEY, CONSENT_VERSION);
          setStatus('accepted');
        } else {
          setStatus('gate');
        }
      });
  }, []);

  async function accept() {
    setAccepting(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('record_consent', {
      p_profile_id: profileId,
      p_layer:      'ai_copilot',
      p_action:     'grant',
      p_user_agent: navigator.userAgent,
    });
    if (rpcError) {
      setError('No pudimos registrar tu consentimiento. Intentá de nuevo.');
      setAccepting(false);
      return;
    }
    localStorage.setItem(CONSENT_LS_KEY, CONSENT_VERSION);
    setStatus('accepted');
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: c.bg }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `3px solid ${c.border}`, borderTopColor: '#00C87A',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (status === 'accepted') return <>{children}</>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: c.bg }}>

      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, background: c.card, borderBottom: `1px solid ${c.border}` }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', lineHeight: 0 }}
        >
          <ArrowLeft size={20} color={c.textSub} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: c.text, margin: 0 }}>Asistente IA</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={36} color="#fff" />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: c.text, marginBottom: 8 }}>Antes de continuar</h2>
          <p style={{ fontSize: 14, color: c.textSub, lineHeight: 1.6, margin: 0 }}>
            Esta herramienta utiliza inteligencia artificial para analizar información relacionada con tu salud.
          </p>
        </div>

        <div style={{
          background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB',
          border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : '#FDE68A'}`,
          borderRadius: 16,
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', margin: 0 }}>
            Aviso importante
          </p>
          <p style={{ fontSize: 13, color: isDark ? '#FCD34D' : '#78350F', lineHeight: 1.7, margin: 0 }}>
            Bresca LLC no promueve ni recomienda el análisis de datos médicos personales por parte de modelos de inteligencia artificial como alternativa al criterio médico profesional.
          </p>
          <p style={{ fontSize: 13, color: isDark ? '#FCD34D' : '#78350F', lineHeight: 1.7, margin: 0 }}>
            Las respuestas generadas por este asistente son orientativas y{' '}
            <strong>no constituyen diagnóstico, consejo ni indicación médica</strong>.
            Cualquier decisión que tomes en base a esta herramienta es de tu{' '}
            <strong>exclusiva responsabilidad</strong>.
          </p>
          <p style={{ fontSize: 13, color: isDark ? '#FCD34D' : '#78350F', lineHeight: 1.7, margin: 0 }}>
            Tus datos son procesados conforme a nuestra Política de Privacidad y no son compartidos con terceros para entrenar modelos de IA.
          </p>
        </div>

        <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
          Al aceptar, confirmás haber leído y comprendido estos términos.<br />
          Este consentimiento queda registrado con fecha, dispositivo y versión ({CONSENT_VERSION}).
        </p>

        {error && (
          <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', margin: 0 }}>{error}</p>
        )}
      </div>

      <div style={{
        padding: '16px 24px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        background: c.card,
        borderTop: `1px solid ${c.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <button
          onClick={accept}
          disabled={accepting}
          style={{
            padding: '15px', borderRadius: 14,
            background: accepting ? c.border : '#00C87A',
            color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700,
            cursor: accepting ? 'not-allowed' : 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {accepting ? 'Registrando…' : 'Entiendo y acepto'}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '14px', borderRadius: 14,
            background: c.cardAlt, color: c.textSub,
            border: 'none', fontSize: 15,
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Volver
        </button>
      </div>
    </div>
  );
}
