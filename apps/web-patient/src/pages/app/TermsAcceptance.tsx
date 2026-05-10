import { useEffect, useState } from 'react';
import { Shield, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';

interface LegalDoc {
  id: string;
  type: string;
  version: string;
  content_url: string;
}

interface Props {
  onAccepted: () => void;
}

export default function TermsAcceptance({ onAccepted }: Props) {
  const { profile, loading: profileLoading } = useProfile();
  const [tcDoc, setTcDoc] = useState<LegalDoc | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<LegalDoc | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('legal_documents')
      .select('id, type, version, content_url')
      .eq('is_active', true)
      .in('type', ['tc', 'privacy'])
      .then(({ data }) => {
        if (!data) return;
        setTcDoc(data.find(d => d.type === 'tc') ?? null);
        setPrivacyDoc(data.find(d => d.type === 'privacy') ?? null);
      });
  }, []);

  async function handleAccept() {
    if (!profile || !checked || saving) return;

    setSaving(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('record_consent', {
      p_profile_id:  profile.id,
      p_layer:       'tc',
      p_action:      'grant',
      p_document_id: tcDoc?.id ?? undefined,
      p_user_agent:  navigator.userAgent,
    });

    if (rpcError) {
      console.error('[TermsAcceptance] record_consent failed:', rpcError);
      setError(`No pudimos registrar tu aceptación: ${rpcError.message}`);
      setSaving(false);
      return;
    }

    onAccepted();
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: '#F7F9FC', padding: 'env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)',
    }}>

      {/* Header */}
      <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)',
          border: '1px solid rgba(0,200,122,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={28} color="#00C87A" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
          Antes de continuar
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
          Necesitamos que leas y aceptes nuestros términos para usar Bresca.
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

        {/* Key points */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 16, padding: '16px', marginBottom: 16,
        }}>
          <p style={sectionLabel}>Lo que necesitás saber</p>
          {POINTS.map(point => (
            <div key={point.title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'rgba(0,200,122,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 16 }}>{point.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{point.title}</p>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>{point.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Document links */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 16, overflow: 'hidden', marginBottom: 20,
        }}>
          {tcDoc && (
            <a
              href={tcDoc.content_url}
              target="_blank"
              rel="noopener noreferrer"
              style={docLink}
            >
              <FileText size={18} color="#4B6EF5" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
                Términos y Condiciones <span style={{ color: '#94A3B8', fontWeight: 400 }}>v{tcDoc.version}</span>
              </span>
              <ExternalLink size={14} color="#94A3B8" />
            </a>
          )}
          {privacyDoc && (
            <a
              href={privacyDoc.content_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...docLink, borderTop: '1px solid #F1F5F9' }}
            >
              <FileText size={18} color="#4B6EF5" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
                Política de Privacidad <span style={{ color: '#94A3B8', fontWeight: 400 }}>v{privacyDoc.version}</span>
              </span>
              <ExternalLink size={14} color="#94A3B8" />
            </a>
          )}
        </div>

        {/* Checkbox */}
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 8 }}>
          <div
            onClick={() => setChecked(c => !c)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${checked ? '#00C87A' : '#CBD5E1'}`,
              background: checked ? '#00C87A' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
          >
            {checked && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            Leí y acepto los{' '}
            <span style={{ color: '#4B6EF5', fontWeight: 500 }}>Términos y Condiciones</span>
            {' '}y la{' '}
            <span style={{ color: '#4B6EF5', fontWeight: 500 }}>Política de Privacidad</span>
            {' '}de Bresca.
          </span>
        </label>

      </div>

      {/* Footer CTA */}
      <div style={{ padding: '12px 20px 20px', background: '#fff', borderTop: '1px solid #F1F5F9' }}>
        {error && (
          <div style={{
            background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 10,
            padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#DC2626',
          }}>
            {error}
          </div>
        )}
        <button
          onClick={handleAccept}
          disabled={!checked || saving || !profile || profileLoading}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: (checked && !!profile && !saving && !profileLoading) ? '#00C87A' : '#E2E8F0',
            color: (checked && !!profile && !saving && !profileLoading) ? '#fff' : '#94A3B8',
            fontSize: 16, fontWeight: 700,
            cursor: (checked && !!profile && !saving && !profileLoading) ? 'pointer' : 'default',
            transition: 'all 200ms ease',
          }}
        >
          {profileLoading ? 'Cargando…' : saving ? 'Guardando…' : 'Continuar'}
        </button>
        <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 10 }}>
          Bresca cumple con la Ley 25.326 de Protección de Datos Personales (Argentina)
        </p>
      </div>

    </div>
  );
}

const POINTS = [
  {
    icon: '🔒',
    title: 'Tus datos son tuyos',
    desc: 'Solo vos podés ver tu historial médico. Nadie accede sin tu permiso explícito.',
  },
  {
    icon: '🔬',
    title: 'Investigación siempre anónima',
    desc: 'Si elegís participar, tus datos se comparten sin nombre ni información identificable.',
  },
  {
    icon: '↩️',
    title: 'Podés revocar en cualquier momento',
    desc: 'Cambiá tus preferencias de privacidad desde el Centro de consentimiento.',
  },
  {
    icon: '🗑️',
    title: 'Derecho al olvido',
    desc: 'Podés eliminar tu cuenta y todos tus datos personales cuando quieras.',
  },
];

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#94A3B8',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  marginBottom: 14,
};

const docLink: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 16px', textDecoration: 'none',
};
