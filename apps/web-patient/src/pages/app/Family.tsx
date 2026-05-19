import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ChevronRight, X, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { useTheme, themeColors } from '../../lib/theme';
import { Spinner } from '../../components/Spinner';

type Profile = {
  id: string;
  display_name: string;
  birth_year: number | null;
  relationship: string | null;
  owner_user_id: string | null;
};

const RELATIONSHIPS = [
  'Pareja', 'Hijo/a', 'Madre', 'Padre',
  'Hermano/a', 'Abuelo/a', 'Otro',
];

const RELATION_EMOJI: Record<string, string> = {
  'Pareja':    '💑',
  'Hijo/a':    '👶',
  'Madre':     '👩',
  'Padre':     '👨',
  'Hermano/a': '🧑',
  'Abuelo/a':  '👴',
  'Otro':      '🧑‍🤝‍🧑',
};

export default function Family() {
  const nav = useNavigate();
  const { user } = useSession();
  const { isDark } = useTheme();
  const c = themeColors(isDark);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProfiles();
  }, [user?.id]);

  async function loadProfiles() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,birth_year,relationship,owner_user_id')
      .or(`user_id.eq.${user.id},owner_user_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  }

  const primaryProfile = profiles.find(p => p.owner_user_id === null);
  const familyProfiles = profiles.filter(p => p.owner_user_id !== null);

  function viewVault(profileId: string) {
    nav(`/app/vault?p=${profileId}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 16px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text }}>Familia</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4B6EF5', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
        >
          <Plus size={16} strokeWidth={2.5} /> Agregar
        </button>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* Mi perfil */}
            {primaryProfile && (
              <section>
                <p style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Mi perfil
                </p>
                <ProfileCard
                  profile={primaryProfile}
                  isOwner
                  onViewVault={() => viewVault(primaryProfile.id)}
                />
              </section>
            )}

            {/* Familiares */}
            <section>
              <p style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                {familyProfiles.length > 0 ? 'Familia' : 'Familiares'}
              </p>

              {familyProfiles.length === 0 ? (
                <EmptyFamily onAdd={() => setShowModal(true)} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {familyProfiles.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      isOwner={false}
                      onViewVault={() => viewVault(p.id)}
                      onEdit={() => setEditProfile(p)}
                    />
                  ))}
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', border: `1.5px dashed ${c.border}`, borderRadius: 14, background: 'transparent', color: c.textSub, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Plus size={16} /> Agregar otro familiar
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showModal && (
        <AddFamilyModal
          userId={user!.id}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); loadProfiles(); }}
        />
      )}

      {editProfile && (
        <EditFamilyModal
          profile={editProfile}
          onClose={() => setEditProfile(null)}
          onSaved={() => { setEditProfile(null); loadProfiles(); }}
        />
      )}
    </div>
  );
}

function ProfileCard({ profile, isOwner, onViewVault, onEdit }: {
  profile: Profile;
  isOwner: boolean;
  onViewVault: () => void;
  onEdit?: () => void;
}) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);

  const age = profile.birth_year
    ? new Date().getFullYear() - profile.birth_year
    : null;

  const emoji = isOwner
    ? '👤'
    : RELATION_EMOJI[profile.relationship ?? ''] ?? '🧑‍🤝‍🧑';

  return (
    <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.borderLight}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Avatar */}
      <div style={{ width: 44, height: 44, borderRadius: 14, background: isOwner ? 'linear-gradient(135deg,#00C87A,#4B6EF5)' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 2 }}>
          {profile.display_name}
          {isOwner && <span style={{ marginLeft: 6, fontSize: 11, background: '#F0FDF4', color: '#00A663', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>Yo</span>}
        </p>
        <p style={{ fontSize: 12, color: c.textSub }}>
          {[profile.relationship, age ? `${age} años` : null].filter(Boolean).join(' · ') || 'Sin información adicional'}
        </p>
      </div>

      {/* Edit (family only) */}
      {onEdit && (
        <button
          onClick={onEdit}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${c.border}`, borderRadius: 10, width: 32, height: 32, cursor: 'pointer', flexShrink: 0, color: c.textSub }}
          aria-label="Editar perfil"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* CTA */}
      <button
        onClick={onViewVault}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#4B6EF5', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 4px', flexShrink: 0 }}
      >
        Ver vault <ChevronRight size={14} />
      </button>
    </div>
  );
}

function EmptyFamily({ onAdd }: { onAdd: () => void }) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  return (
    <div style={{ background: c.cardAlt, borderRadius: 16, border: `1.5px dashed ${c.border}`, padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: isDark ? '#1E293B' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Users size={26} color="#4B6EF5" />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>Gestioná la salud familiar</p>
        <p style={{ fontSize: 13, color: c.textSub, lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>
          Agregá familiares para administrar su historial médico desde tu cuenta.
        </p>
      </div>
      <button
        onClick={onAdd}
        style={{ background: '#4B6EF5', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
      >
        Agregar familiar
      </button>
    </div>
  );
}

function AddFamilyModal({ userId, onClose, onAdded }: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const [name, setName]           = useState('');
  const [relationship, setRel]    = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [email, setEmail]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function save() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!relationship)  { setError('Seleccioná el parentesco.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('profiles').insert({
      owner_user_id: userId,
      display_name:  name.trim(),
      relationship,
      birth_year:    birthYear ? parseInt(birthYear, 10) : null,
      conditions:    [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email:         email.trim() || null,
    } as any);

    setSaving(false);
    if (err) { setError('No pudimos guardar el perfil. Intentá de nuevo.'); return; }
    onAdded();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1.5px solid ${c.border}`,
    borderRadius: 12, fontSize: 15, color: c.text, background: c.cardAlt,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: c.card, borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        zIndex: 51, display: 'flex', flexDirection: 'column', gap: 16,
        maxHeight: '80dvh', overflowY: 'auto',
      }}>
        {/* Handle + header */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: c.border, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>Agregar familiar</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color={c.textMuted} />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Nombre
          </label>
          <input
            type="text"
            placeholder="Ej: María García"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Parentesco */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Parentesco
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {RELATIONSHIPS.map(r => (
              <button
                key={r}
                onClick={() => setRel(r)}
                style={{
                  padding: '8px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: relationship === r ? '#4B6EF5' : c.cardAlt,
                  color: relationship === r ? '#fff' : c.textSub,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Año de nacimiento */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Año de nacimiento <span style={{ color: c.textMuted, fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            type="number"
            placeholder="Ej: 1985"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            min={1900}
            max={new Date().getFullYear()}
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Email <span style={{ color: c.textMuted, fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            type="email"
            placeholder="Ej: maria@gmail.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', padding: '10px 14px', borderRadius: 10 }}>
            {error}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: saving ? '#94A3B8' : '#4B6EF5', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52 }}
        >
          {saving ? <><Spinner /> Guardando…</> : 'Guardar familiar'}
        </button>
      </div>
    </>
  );
}

function EditFamilyModal({ profile, onClose, onSaved }: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const [name, setName]           = useState(profile.display_name);
  const [relationship, setRel]    = useState(profile.relationship ?? '');
  const [birthYear, setBirthYear] = useState(profile.birth_year ? String(profile.birth_year) : '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [email, setEmail]         = useState((profile as any).email ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function save() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!relationship) { setError('Seleccioná el parentesco.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').update({
      display_name: name.trim(),
      relationship,
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email: email.trim() || null,
    } as any).eq('id', profile.id);
    setSaving(false);
    if (err) { setError('No pudimos guardar los cambios. Intentá de nuevo.'); return; }
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1.5px solid ${c.border}`,
    borderRadius: 12, fontSize: 15, color: c.text, background: c.cardAlt,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 51,
        background: c.card, borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 16,
        maxHeight: '80dvh', overflowY: 'auto',
      }}>
        <div>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: c.border, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>Editar {profile.display_name}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color={c.textMuted} />
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Nombre</label>
          <input type="text" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Parentesco</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {RELATIONSHIPS.map(r => (
              <button
                key={r}
                onClick={() => setRel(r)}
                style={{
                  padding: '8px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: relationship === r ? '#4B6EF5' : c.cardAlt,
                  color: relationship === r ? '#fff' : c.textSub,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Año de nacimiento <span style={{ color: c.textMuted, fontWeight: 400 }}>(opcional)</span>
          </label>
          <input type="number" placeholder="Ej: 1985" value={birthYear} onChange={e => setBirthYear(e.target.value)} min={1900} max={new Date().getFullYear()} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Email <span style={{ color: c.textMuted, fontWeight: 400 }}>(opcional)</span>
          </label>
          <input type="email" placeholder="Ej: maria@gmail.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>

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
