import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../lib/notifications';
import { useTheme, themeColors } from '../../lib/theme';

const TYPE_ICON: Record<string, string> = {
  study_processed:      '🗂',
  ocr_low_quality:      '⚠',
  invitation_accepted:  '👤',
  system:               '📣',
  prescription_expiring:'💊',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Ahora';
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hs`;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function Notifications() {
  const nav = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { isDark } = useTheme();
  const t = themeColors(isDark);

  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: t.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: t.card, borderBottom: `1px solid ${t.border}` }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: t.textSub, fontSize: 15, cursor: 'pointer', minHeight: 44, padding: 0 }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Notificaciones</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '16px 20px' }}>
        {notifications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: t.card, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={24} color={t.textMuted} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Sin notificaciones</p>
            <p style={{ fontSize: 13, color: t.textSub, margin: 0, textAlign: 'center', maxWidth: 220 }}>
              Cuando Bresca tenga novedades sobre tus estudios, te avisamos acá.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                  background: n.read ? t.card : (isDark ? '#162032' : '#F0FDF4'),
                  borderRadius: i === 0 ? '14px 14px 4px 4px' : i === notifications.length - 1 ? '4px 4px 14px 14px' : 4,
                  border: `1px solid ${n.read ? t.border : (isDark ? '#1E3A2F' : '#BBF7D0')}`,
                  marginBottom: 1,
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: n.read ? t.iconBg : (isDark ? '#1E3A2F' : '#DCFCE7'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>
                  {TYPE_ICON[n.type] ?? '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: t.text, margin: 0 }}>{n.title}</p>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C87A', flexShrink: 0 }} />}
                  </div>
                  {n.body && <p style={{ fontSize: 13, color: t.textSub, margin: 0, lineHeight: 1.45 }}>{n.body}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>{timeAgo(n.created_at)}</p>
                    {n.type === 'prescription_expiring' && !!n.metadata?.study_id && (
                      <button
                        onClick={() => nav(`/app/vault/${String(n.metadata!.study_id)}`)}
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: '#10B981', cursor: 'pointer' }}
                      >
                        Ver receta →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 16 }}>
              <CheckCheck size={14} color={t.textMuted} />
              <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>Todo al día</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
