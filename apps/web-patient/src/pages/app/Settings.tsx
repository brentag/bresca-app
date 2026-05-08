import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteAccount } from '../../lib/api';

const GPT_CTA_KEY = 'bresca_show_gpt_cta';

export default function Settings() {
  const nav = useNavigate();
  const [gptCta, setGptCta] = useState(
    () => localStorage.getItem(GPT_CTA_KEY) !== 'false',
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function toggleGptCta(enabled: boolean) {
    setGptCta(enabled);
    localStorage.setItem(GPT_CTA_KEY, enabled ? 'true' : 'false');
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      nav('/welcome', { replace: true });
    } catch {
      setDeleteError('No pudimos eliminar tu cuenta. Intentá de nuevo o contactá a soporte.');
      setDeleting(false);
    }
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

        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, marginTop: 8 }}>
          Legal
        </p>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <a
            href="/privacidad"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', textDecoration: 'none' }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0 }}>Política de privacidad</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Ley 25.326 · Datos, derechos y contacto</p>
            </div>
            <ExternalLink size={16} color="#94A3B8" />
          </a>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, marginTop: 8 }}>
          Zona de peligro
        </p>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FECACA', overflow: 'hidden' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={18} color="#EF4444" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#EF4444', margin: 0 }}>Eliminar mi cuenta</p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>Borra todos tus datos permanentemente</p>
            </div>
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>¿Eliminar tu cuenta?</h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus estudios, historial y datos personales.
              Los registros de consentimiento se anonimizarán según lo exige la ley.
            </p>
            {deleteError && (
              <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ padding: '14px', borderRadius: 14, background: deleting ? '#E2E8F0' : '#EF4444', color: deleting ? '#94A3B8' : '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{ padding: '14px', borderRadius: 14, background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: 15, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
