import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link, Send, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useTheme, themeColors } from '../../lib/theme';

const MAX_INVITES = 3;
const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://bresca-app-api.vercel.app';

type Invite = {
  id: string;
  email: string | null;
  token: string;
  status: 'pending' | 'registered';
  created_at: string;
};

export default function InvitationCenter() {
  const nav = useNavigate();
  const { profile } = useProfile();
  const { isDark } = useTheme();
  const t = themeColors(isDark);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('referral_invitations')
      .select('id,email,token,status,created_at')
      .eq('inviter_id', profile.id)
      .order('created_at', { ascending: false }) as { data: Invite[] | null };
    setInvites(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.id]);

  async function createInvite() {
    if (!profile) return;
    setCreating(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('referral_invitations')
      .insert({ inviter_id: profile.id, email: email.trim() || null })
      .select('id,email,token,status,created_at')
      .single() as { data: Invite | null; error: unknown };
    setCreating(false);
    if (!error && data) {
      setInvites(prev => [data, ...prev]);
      setEmail('');
      setShowModal(false);
    }
  }

  function inviteLink(token: string) {
    return `${APP_URL}/welcome?ref=${token}`;
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(inviteLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareWhatsApp(token: string, invEmail: string | null) {
    const link = inviteLink(token);
    const text = invEmail
      ? `Hola! Te invito a Bresca, la app para guardar y compartir tus estudios médicos: ${link}`
      : `Te invito a Bresca, la app para guardar y compartir tus estudios médicos: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const remaining = MAX_INVITES - invites.length;

  return (
    <div style={{ minHeight: '100dvh', background: t.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: t.card, borderBottom: `1px solid ${t.border}` }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: t.textSub, fontSize: 15, cursor: 'pointer', minHeight: 44, padding: 0 }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Centro de invitaciones</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Hero card */}
        <div style={{ background: 'linear-gradient(135deg, #0F5034, #00C87A22)', border: '1px solid #00C87A33', borderRadius: 20, padding: '20px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#00C87A', margin: '0 0 4px', lineHeight: 1.2 }}>
            {remaining > 0 ? `${remaining} invitación${remaining !== 1 ? 'es' : ''} disponible${remaining !== 1 ? 's' : ''}` : 'Usaste todas tus invitaciones'}
          </p>
          <p style={{ fontSize: 13, color: t.textSub, margin: 0, lineHeight: 1.5 }}>
            Cada usuario puede invitar hasta {MAX_INVITES} personas. Cuando se registren, te avisamos.
          </p>
          {remaining > 0 && (
            <button
              onClick={() => setShowModal(true)}
              style={{ marginTop: 14, padding: '10px 20px', borderRadius: 12, background: '#00C87A', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Invitar ahora
            </button>
          )}
        </div>

        {/* Slots */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
          Tus invitaciones ({invites.length}/{MAX_INVITES})
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!loading && invites.map(inv => (
            <div key={inv.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: inv.status === 'registered' ? '#DCFCE7' : t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {inv.status === 'registered'
                    ? <Check size={18} color="#00C87A" />
                    : <Clock size={18} color={t.textMuted} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: 0 }}>
                    {inv.email ?? 'Link sin email'}
                  </p>
                  <p style={{ fontSize: 12, margin: 0, color: inv.status === 'registered' ? '#00C87A' : t.textMuted }}>
                    {inv.status === 'registered' ? 'Registrado' : 'Pendiente'}
                  </p>
                </div>
              </div>
              {inv.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => copyLink(inv.token)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: t.iconBg, border: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {copied === inv.token ? <><Check size={14} color="#00C87A" /> Copiado</> : <><Link size={14} /> Copiar link</>}
                  </button>
                  <button
                    onClick={() => shareWhatsApp(inv.token, inv.email)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: '#DCFCE7', border: 'none', color: '#15803D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Send size={14} /> WhatsApp
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Slots vacíos */}
          {!loading && Array.from({ length: remaining }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={remaining > 0 ? () => setShowModal(true) : undefined}
              style={{ background: t.cardAlt, border: `1px dashed ${t.border}`, borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <p style={{ fontSize: 14, color: t.textMuted, margin: 0 }}>+ Agregar invitación</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal nueva invitación */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !creating && setShowModal(false)}
        >
          <div
            style={{ background: t.card, width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 6 }}>Nueva invitación</h2>
            <p style={{ fontSize: 13, color: t.textSub, marginBottom: 20, lineHeight: 1.5 }}>
              Ingresá el email si querés personalizar el link, o dejalo vacío para generar un link genérico.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSub, marginBottom: 6 }}>
              Email del invitado (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="amigo@email.com"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 15, marginBottom: 16, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: t.cardAlt, color: t.textSub, border: 'none', fontSize: 15, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={createInvite}
                disabled={creating}
                style={{ flex: 2, padding: '13px', borderRadius: 12, background: creating ? t.border : '#00C87A', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Generando…' : 'Generar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
