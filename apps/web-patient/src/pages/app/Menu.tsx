import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Settings, LogOut, ChevronRight, Lock, Bell, Users2, MessageSquare, LifeBuoy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { useNotifications } from '../../lib/notifications';
import { useTheme, themeColors } from '../../lib/theme';
import { saveFeedback } from '../../lib/saveFeedback';
import FakeDoorModal from '../../components/FakeDoorModal';

export default function Menu() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { isDark } = useTheme();
  const t = themeColors(isDark);

  const [showFakeDoor, setShowFakeDoor] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    nav('/welcome', { replace: true });
  }

  async function handleReportePro() {
    if (user) await saveFeedback(user.id, 'fake_door_click', undefined, undefined, { feature: 'reporte_pro' });
    setShowFakeDoor(true);
  }

  async function submitFeedback() {
    if (!feedbackText.trim() || !user) return;
    setSendingFeedback(true);
    await saveFeedback(user.id, 'general_feedback' as never, undefined, feedbackText.trim());
    setSendingFeedback(false);
    setFeedbackSent(true);
    setTimeout(() => { setFeedbackSent(false); setFeedbackText(''); setShowFeedback(false); }, 1800);
  }

  function openSupport() {
    const msg = encodeURIComponent('Hola Bresca, necesito ayuda con la app.');
    window.open(`https://wa.me/5491100000000?text=${msg}`, '_blank');
  }

  const items = [
    {
      icon: <Bell size={20} color={unreadCount > 0 ? '#EF4444' : t.textSub} />,
      label: 'Notificaciones',
      sub: unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día',
      badge: unreadCount > 0 ? unreadCount : null,
      iconBg: unreadCount > 0 ? '#FEF2F2' : t.iconBg,
      action: () => nav('/app/notifications'),
    },
    {
      icon: <Users2 size={20} color={t.textSub} />,
      label: 'Centro de invitaciones',
      sub: 'Invitá hasta 3 personas',
      badge: null,
      iconBg: t.iconBg,
      action: () => nav('/app/invitations'),
    },
    {
      icon: <User size={20} color={t.textSub} />,
      label: 'Mi perfil',
      sub: profile?.display_name ?? '',
      badge: null,
      iconBg: t.iconBg,
      action: () => {},
    },
    {
      icon: <Shield size={20} color={t.textSub} />,
      label: 'Centro de privacidad',
      sub: 'Gestioná tus permisos',
      badge: null,
      iconBg: t.iconBg,
      action: () => nav('/app/consent'),
    },
    {
      icon: <Settings size={20} color={t.textSub} />,
      label: 'Configuración',
      sub: 'Estética y preferencias',
      badge: null,
      iconBg: t.iconBg,
      action: () => nav('/app/settings'),
    },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: t.bg, padding: '20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 4 }}>Menú</h1>
      {user?.email && <p style={{ fontSize: 14, color: t.textSub, marginBottom: 24 }}>{user.email}</p>}

      {/* Reporte Pro — Fake Door */}
      <button
        onClick={handleReportePro}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px', background: isDark
            ? 'linear-gradient(135deg, #0F2D1E, #1E3A2F)'
            : 'linear-gradient(135deg, #EEF2FF, #F0FDF4)',
          border: `1px solid ${isDark ? 'rgba(0,200,122,0.2)' : 'rgba(75,110,245,0.2)'}`,
          borderRadius: 16, cursor: 'pointer', textAlign: 'left', marginBottom: 12,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={20} color="#4B6EF5" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Ver Reporte Pro</p>
          <p style={{ fontSize: 12, color: t.textSub, margin: '2px 0 0' }}>Tendencias y análisis avanzados</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6EF5', background: 'rgba(75,110,245,0.1)', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.06em' }}>
          PRÓXIMO
        </span>
      </button>

      {/* Items principales */}
      <div style={{ background: t.card, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.border}`, marginBottom: 12 }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', borderBottom: i < items.length - 1 ? `1px solid ${t.borderLight}` : 'none', cursor: 'pointer', textAlign: 'left', minHeight: 62 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{item.label}</p>
              {item.sub && <p style={{ fontSize: 12, color: t.textMuted, margin: '2px 0 0' }}>{item.sub}</p>}
            </div>
            {item.badge ? (
              <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                {item.badge}
              </span>
            ) : (
              <ChevronRight size={16} color={t.textMuted} />
            )}
          </button>
        ))}
      </div>

      {/* Feedback + Soporte */}
      <div style={{ background: t.card, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.border}`, marginBottom: 24 }}>
        <button
          onClick={() => setShowFeedback(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', borderBottom: `1px solid ${t.borderLight}`, cursor: 'pointer', textAlign: 'left', minHeight: 62 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color={t.textSub} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Dejanos un comentario</p>
            <p style={{ fontSize: 12, color: t.textMuted, margin: '2px 0 0' }}>Tu opinión mejora Bresca</p>
          </div>
          <ChevronRight size={16} color={t.textMuted} />
        </button>
        <button
          onClick={openSupport}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 62 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={20} color="#15803D" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Atención al cliente</p>
            <p style={{ fontSize: 12, color: t.textMuted, margin: '2px 0 0' }}>Escribinos por WhatsApp</p>
          </div>
          <ChevronRight size={16} color={t.textMuted} />
        </button>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={logout}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, cursor: 'pointer', minHeight: 62 }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={20} color="#EF4444" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}>Cerrar sesión</span>
      </button>

      {showFakeDoor && <FakeDoorModal onClose={() => setShowFakeDoor(false)} />}

      {/* Feedback bottom sheet */}
      {showFeedback && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !sendingFeedback && setShowFeedback(false)}
        >
          <div
            style={{ background: t.card, width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 6 }}>Tu opinión importa</h2>
            <p style={{ fontSize: 13, color: t.textSub, marginBottom: 16, lineHeight: 1.5 }}>
              ¿Algo que mejorar? ¿Una feature que extrañás? Contanos.
            </p>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#00C87A' }}>Gracias por tu comentario</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Escribí tu comentario..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 15, resize: 'none', outline: 'none', marginBottom: 14, fontFamily: 'inherit' }}
                />
                <button
                  onClick={submitFeedback}
                  disabled={sendingFeedback || !feedbackText.trim()}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: feedbackText.trim() ? '#00C87A' : t.border, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: feedbackText.trim() ? 'pointer' : 'not-allowed' }}
                >
                  {sendingFeedback ? 'Enviando…' : 'Enviar comentario'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
