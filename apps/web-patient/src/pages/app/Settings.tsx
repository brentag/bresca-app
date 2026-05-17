import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trash2, Moon, Sun, Pencil, Plus, X, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteAccount } from '../../lib/api';
import { useTheme, themeColors } from '../../lib/theme';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { Spinner } from '../../components/Spinner';

const GPT_CTA_KEY = 'bresca_show_gpt_cta';

const RELATIONSHIPS = ['Pareja', 'Hijo/a', 'Madre', 'Padre', 'Hermano/a', 'Abuelo/a', 'Otro'];

type FamilyProfile = {
  id: string;
  display_name: string;
  birth_year: number | null;
  relationship: string | null;
};

type EditTarget = { id: string; display_name: string; birth_year: number | null; relationship: string | null; isOwn: boolean };

export default function Settings() {
  const nav = useNavigate();
  const { isDark, toggle } = useTheme();
  const t = themeColors(isDark);
  const { user } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyProfile | null>(null);

  const [gptCta, setGptCta] = useState(
    () => localStorage.getItem(GPT_CTA_KEY) !== 'false',
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id,display_name,birth_year,relationship')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setFamilyProfiles((data ?? []) as FamilyProfile[]); setFamilyLoading(false); });
  }, [user?.id]);

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

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: value ? '#00C87A' : t.border,
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, width: 22, height: 22, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
          left: value ? 23 : 3,
        }} />
      </button>
    );
  }

  function openEditOwn() {
    if (!profile) return;
    setEditTarget({ id: profile.id, display_name: profile.display_name, birth_year: profile.birth_year ?? null, relationship: null, isOwn: true });
  }

  function openEditFamily(p: FamilyProfile) {
    setEditTarget({ id: p.id, display_name: p.display_name, birth_year: p.birth_year, relationship: p.relationship, isOwn: false });
  }

  async function handleDeleteFamily() {
    if (!deleteTarget) return;
    await supabase.from('profiles').delete().eq('id', deleteTarget.id);
    setFamilyProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const age = (year: number | null) => year ? `${new Date().getFullYear() - year} años` : null;

  return (
    <div style={{ minHeight: '100dvh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: t.card, borderBottom: `1px solid ${t.border}` }}>
        <button
          onClick={() => nav(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: t.textSub, fontSize: 15, cursor: 'pointer', minHeight: 44, padding: 0 }}
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Configuración</span>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mi perfil */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Mi perfil
        </p>
        <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          {profileLoading ? (
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{profile.display_name}</p>
                <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>
                  {age(profile.birth_year) ?? 'Año de nacimiento no cargado'}
                </p>
              </div>
              <button
                onClick={openEditOwn}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${t.border}`, borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 600, color: t.textSub, cursor: 'pointer' }}
              >
                <Pencil size={13} /> Editar
              </button>
            </div>
          ) : null}
        </div>

        {/* Perfiles familiares */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Familiares
          </p>
        </div>
        <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          {familyLoading ? (
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : familyProfiles.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: t.textSub, margin: 0 }}>No hay familiares dados de alta.</p>
              <p style={{ fontSize: 12, color: t.textMuted, margin: '4px 0 0' }}>Podés agregarlos desde la sección Familia.</p>
            </div>
          ) : (
            familyProfiles.map((fp, i) => (
              <div
                key={fp.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < familyProfiles.length - 1 ? `1px solid ${t.borderLight}` : 'none' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{fp.display_name}</p>
                  <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>
                    {[fp.relationship, age(fp.birth_year)].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </p>
                </div>
                <button
                  onClick={() => openEditFamily(fp)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: t.textSub, cursor: 'pointer', flexShrink: 0 }}
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => setDeleteTarget(fp)}
                  style={{ background: 'none', border: 'none', padding: '6px 4px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}
                  aria-label="Eliminar perfil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Apariencia */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Apariencia
        </p>
        <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? '#1E293B' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isDark ? <Moon size={18} color="#94A3B8" /> : <Sun size={18} color="#F59E0B" />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Modo oscuro</p>
              <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>
                {isDark ? 'Activado' : 'Desactivado'}
              </p>
            </div>
            <Toggle value={isDark} onChange={toggle} />
          </div>
        </div>

        {/* Asistente */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Asistente
        </p>
        <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExternalLink size={18} color="#4B6EF5" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Sugerir GPT Salud</p>
              <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>
                Mostrar opción de continuar en ChatGPT al final de cada respuesta
              </p>
            </div>
            <Toggle value={gptCta} onChange={toggleGptCta} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, margin: 0 }}>
          Cuando activás esta opción, el asistente te ofrece abrir ChatGPT con el contexto de tu consulta y tus estudios (sin datos personales). Bresca no tiene relación con OpenAI.
        </p>

        {/* Legal */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, marginTop: 8 }}>
          Legal
        </p>
        <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <a
            href="/privacidad"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', textDecoration: 'none' }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Política de privacidad</p>
              <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>Ley 25.326 · Datos, derechos y contacto</p>
            </div>
            <ExternalLink size={16} color={t.textMuted} />
          </a>
        </div>

        {/* Zona de peligro */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, marginTop: 8 }}>
          Zona de peligro
        </p>
        <div style={{ background: t.card, borderRadius: 16, border: '1px solid #FECACA', overflow: 'hidden' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={18} color="#EF4444" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#EF4444', margin: 0 }}>Eliminar mi cuenta</p>
              <p style={{ fontSize: 12, color: t.textMuted, margin: '2px 0 0' }}>Borra todos tus datos permanentemente</p>
            </div>
          </button>
        </div>
      </div>

      {/* Edit profile sheet */}
      {editTarget && (
        <EditProfileSheet
          target={editTarget}
          isDark={isDark}
          t={t}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setEditTarget(null);
            if (updated.isOwn) {
              // useProfile will refresh on next mount; force UI re-render via profile reload
              window.location.reload();
            } else {
              setFamilyProfiles(prev => prev.map(p => p.id === updated.id ? { ...p, display_name: updated.display_name, birth_year: updated.birth_year, relationship: updated.relationship } : p));
            }
          }}
        />
      )}

      {/* Delete family profile confirm */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{ background: t.card, width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8 }}>¿Eliminar a {deleteTarget.display_name}?</h2>
            <p style={{ fontSize: 14, color: t.textSub, lineHeight: 1.6, marginBottom: 20 }}>
              Se eliminará el perfil y todos sus estudios. Esta acción es irreversible.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleDeleteFamily}
                style={{ padding: '14px', borderRadius: 14, background: '#EF4444', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Sí, eliminar perfil
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '14px', borderRadius: 14, background: t.cardAlt, color: t.textSub, border: 'none', fontSize: 15, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            style={{ background: t.card, width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8 }}>¿Eliminar tu cuenta?</h2>
            <p style={{ fontSize: 14, color: t.textSub, lineHeight: 1.6, marginBottom: 20 }}>
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
                style={{ padding: '14px', borderRadius: 14, background: deleting ? t.border : '#EF4444', color: deleting ? t.textMuted : '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{ padding: '14px', borderRadius: 14, background: t.cardAlt, color: t.textSub, border: 'none', fontSize: 15, cursor: 'pointer' }}
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

function EditProfileSheet({
  target, isDark, t, onClose, onSaved,
}: {
  target: EditTarget;
  isDark: boolean;
  t: ReturnType<typeof themeColors>;
  onClose: () => void;
  onSaved: (updated: EditTarget) => void;
}) {
  const [name, setName]         = useState(target.display_name);
  const [birthYear, setBirthYear] = useState(target.birth_year ? String(target.birth_year) : '');
  const [relationship, setRel]  = useState(target.relationship ?? '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1.5px solid ${t.border}`,
    borderRadius: 12, fontSize: 15, color: t.text, background: t.cardAlt,
    outline: 'none', boxSizing: 'border-box',
  };

  async function save() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!target.isOwn && !relationship) { setError('Seleccioná el parentesco.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('profiles').update({
      display_name: name.trim(),
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      ...(target.isOwn ? {} : { relationship }),
    }).eq('id', target.id);
    setSaving(false);
    if (err) { setError('No pudimos guardar los cambios. Intentá de nuevo.'); return; }
    onSaved({ ...target, display_name: name.trim(), birth_year: birthYear ? parseInt(birthYear, 10) : null, relationship: target.isOwn ? null : relationship });
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, zIndex: 201,
          background: t.card, borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', gap: 16,
          maxHeight: '80dvh', overflowY: 'auto',
        }}
      >
        {/* Handle + header */}
        <div>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>
              {target.isOwn ? 'Editar mi perfil' : `Editar ${target.display_name}`}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color={t.textMuted} />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Nombre
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" style={inputStyle} />
        </div>

        {/* Año de nacimiento */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Año de nacimiento <span style={{ color: t.textMuted, fontWeight: 400 }}>(opcional)</span>
          </label>
          <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="Ej: 1985" min={1900} max={new Date().getFullYear()} style={inputStyle} />
        </div>

        {/* Parentesco — solo para familiares */}
        {!target.isOwn && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Parentesco
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {RELATIONSHIPS.map(r => (
                <button
                  key={r}
                  onClick={() => setRel(r)}
                  style={{
                    padding: '8px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: relationship === r ? '#4B6EF5' : t.cardAlt,
                    color: relationship === r ? '#fff' : t.textSub,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', padding: '10px 14px', borderRadius: 10, margin: 0 }}>{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: saving ? '#94A3B8' : '#4B6EF5', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52 }}
        >
          {saving ? <><Spinner /> Guardando…</> : 'Guardar cambios'}
        </button>
      </div>
    </>
  );
}
