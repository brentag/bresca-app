import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '../../lib/responsive';
import { generateQR } from '../../lib/api';
import { Upload, MessageCircle, QrCode, FolderOpen, FlaskConical, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { useTheme, themeColors } from '../../lib/theme';
import { useTrackNode } from '../../lib/useTrackNode';
import { useNotifications } from '../../lib/notifications';
import { StudyCard, StudyCardSkeleton } from '../../components/StudyCard';
import RetentionModal from '../../components/RetentionModal';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{initials}</span>
    </div>
  );
}

type HomeStats = { total: number; months: number; categories: number };

async function fetchStats(profileId: string): Promise<HomeStats> {
  const { data } = await supabase
    .from('studies')
    .select('study_date, category')
    .eq('profile_id', profileId)
    .eq('confirmed', true);

  if (!data || data.length === 0) return { total: 0, months: 0, categories: 0 };

  const oldest = data.reduce((min, s) => s.study_date < min ? s.study_date : min, data[0].study_date);
  const diffMs = Date.now() - new Date(oldest + 'T00:00:00').getTime();
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  const categories = new Set(data.map(s => s.category)).size;

  return { total: data.length, months, categories };
}

async function fetchRecentStudies(profileId: string): Promise<Study[]> {
  const { data } = await supabase
    .from('studies')
    .select('*')
    .eq('profile_id', profileId)
    .eq('confirmed', true)
    .order('study_date', { ascending: false })
    .limit(3);
  return data ?? [];
}

export default function Home() {
  useTrackNode('home');
  const nav = useNavigate();
  const { user } = useSession();
  const { profile, loading: profileLoading } = useProfile();
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [recent, setRecent] = useState<Study[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(true);
  const [showRetention, setShowRetention] = useState(false);
  const isDesktop = useIsDesktop();

  const statCardStyle: React.CSSProperties = {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 10,
  };

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchStats(profile.id), fetchRecentStudies(profile.id)]).then(([s, r]) => {
      setStats(s);
      setRecent(r);
      setDataLoading(false);
    });
  }, [profile?.id]);

  // Capa B: modal de retención a los 7 días (Sean Ellis Test)
  useEffect(() => {
    if (!user) return;
    const alreadyShown = localStorage.getItem('bresca_retention_v1');
    if (alreadyShown) return;
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (accountAge < sevenDays) return;
    const timer = setTimeout(() => setShowRetention(true), 2500);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const { unreadCount } = useNotifications();

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'vos';
  const firstName = displayName.split(' ')[0];

  const quickActions = [
    { icon: Upload,        label: 'Subir\nestudio',   color: '#00C87A', bg: 'rgba(0,200,122,0.1)',  action: () => nav('/app/vault/upload') },
    { icon: MessageCircle, label: 'Asistente',        color: '#4B6EF5', bg: 'rgba(75,110,245,0.1)', action: () => nav('/app/copilot') },
    { icon: QrCode,        label: 'Compartir\nQR',   color: '#00B8D4', bg: 'rgba(0,184,212,0.1)',  action: () => nav('/app/vault/qr') },
    { icon: FolderOpen,    label: 'Mis\nestudios',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', action: () => nav('/app/vault') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: t.bg, minHeight: '100%' }}>

      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{ background: t.card, padding: '16px 20px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>{greeting()},</p>
            {profileLoading
              ? <div className="skeleton" style={{ height: 22, width: 120, borderRadius: 6 }} />
              : <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{firstName} 👋</h1>
            }
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => nav('/app/notifications')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={22} color={t.textSub} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#00C87A' }} />
              )}
            </button>
            {!profileLoading && (
              <button
                onClick={() => nav('/app/menu')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <Avatar name={displayName} />
              </button>
            )}
          </div>
        </div>
      </div>

      {isDesktop ? (
        /* ── DESKTOP: 2 columnas ── */
        <div style={{ display: 'flex', gap: 28, padding: '24px 28px', flex: 1, alignItems: 'flex-start', overflowY: 'auto' }}>

          {/* Columna izquierda: stats + acciones + CRO */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {(dataLoading || profileLoading)
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={statCardStyle}>
                      <div className="skeleton" style={{ height: 22, width: 36, borderRadius: 4, marginBottom: 4 }} />
                      <div className="skeleton" style={{ height: 11, width: 50, borderRadius: 4 }} />
                    </div>
                  ))
                : [
                    { value: stats?.total ?? 0, label: 'estudios', color: '#00C87A' },
                    { value: stats?.months ?? 0, label: 'meses', color: '#4B6EF5' },
                    { value: stats?.categories ?? 0, label: 'tipos', color: '#00B8D4' },
                  ].map(({ value, label, color }) => (
                    <div key={label} style={statCardStyle}>
                      <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                      <span style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                    </div>
                  ))
              }
            </div>

            {/* Acciones rápidas — 2x2 en desktop left panel */}
            <div>
              <p style={{ ...sectionLabelStyle, marginBottom: 8 }}>Acciones rápidas</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {quickActions.map(({ icon: Icon, label, color, bg, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
                      padding: '14px 10px 12px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'center',
                      boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={color} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.text, lineHeight: 1.3, whiteSpace: 'pre-line' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CRO invite */}
            {showInvite && (
              <div
                onClick={() => nav('/app/menu')}
                style={{ background: isDark ? 'linear-gradient(135deg,rgba(75,110,245,0.10),rgba(0,200,122,0.10))' : 'linear-gradient(135deg,#EEF2FF,#F0FDF4)', border: '1px solid rgba(0,200,122,0.25)', borderRadius: 16, padding: '14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FlaskConical size={20} color="#4B6EF5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,200,122,0.12)', borderRadius: 6, padding: '2px 8px', marginBottom: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#86EFAC' : '#00A064', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Investigación clínica</span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 3 }}>Tu historial puede ayudar a la ciencia</p>
                  <p style={{ fontSize: 11, color: t.textSub, lineHeight: 1.5 }}>Participá de forma anónima y voluntaria.</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setShowInvite(false); }}
                  style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: t.textMuted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 4 }}
                  aria-label="Cerrar"
                >×</button>
              </div>
            )}
          </div>

          {/* Columna derecha: estudios recientes */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabelStyle}>Estudios recientes</p>
              <button
                onClick={() => nav('/app/vault')}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#00C87A', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', minHeight: 44, display: 'flex', alignItems: 'center' }}
              >
                Ver todos
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(dataLoading || profileLoading)
                ? Array.from({ length: 3 }).map((_, i) => <StudyCardSkeleton key={i} />)
                : recent.length === 0
                  ? <EmptyState onUpload={() => nav('/app/vault/upload')} t={t} />
                  : recent.map(s => (
                      <StudyCard
                        key={s.id}
                        study={s}
                        onClick={() => nav(`/app/vault/${s.id}`)}
                        onQR={() => nav('/app/vault/qr', { state: { study_ids: [s.id] } })}
                        onWhatsApp={async () => {
                          try {
                            const { token } = await generateQR([s.id], 24);
                            const url = `${window.location.origin}/qr/${token}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(`Te comparto mis estudios médicos 🏥\n${url}`)}`, '_blank', 'noopener');
                          } catch { /* silencioso */ }
                        }}
                      />
                    ))
              }
            </div>
          </div>
        </div>
      ) : (
        /* ── MOBILE: layout original ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 12px' }}>

          {/* ─── Stats strip ─────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {(dataLoading || profileLoading)
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={statCardStyle}>
                    <div className="skeleton" style={{ height: 22, width: 36, borderRadius: 4, marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 11, width: 50, borderRadius: 4 }} />
                  </div>
                ))
              : [
                  { value: stats?.total ?? 0, label: 'estudios', color: '#00C87A' },
                  { value: stats?.months ?? 0, label: 'meses historia', color: '#4B6EF5' },
                  { value: stats?.categories ?? 0, label: 'categorías', color: '#00B8D4' },
                ].map(({ value, label, color }) => (
                  <div key={label} style={statCardStyle}>
                    <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                    <span style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                  </div>
                ))
            }
          </div>

          {/* ─── Invitación a estudio (CRO) ──────────────────────── */}
          {showInvite && (
            <div
              onClick={() => nav('/app/menu')}
              style={{ marginBottom: 14, background: isDark ? 'linear-gradient(135deg,rgba(75,110,245,0.10),rgba(0,200,122,0.10))' : 'linear-gradient(135deg,#EEF2FF,#F0FDF4)', border: '1px solid rgba(0,200,122,0.25)', borderRadius: 16, padding: '14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FlaskConical size={20} color="#4B6EF5" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,200,122,0.12)', borderRadius: 6, padding: '2px 8px', marginBottom: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#86EFAC' : '#00A064', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Investigación clínica</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 3 }}>
                  Tu historial puede ayudar a la ciencia
                </p>
                <p style={{ fontSize: 11, color: t.textSub, lineHeight: 1.5 }}>
                  Las CROs (Contract Research Organizations) buscan pacientes para estudios clínicos. Podés participar de forma anónima y voluntaria.
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setShowInvite(false); }}
                style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: t.textMuted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 4 }}
                aria-label="Cerrar"
              >×</button>
            </div>
          )}

          {/* ─── Acciones rápidas ────────────────────────────────── */}
          <p style={sectionLabelStyle}>Acciones rápidas</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {quickActions.map(({ icon: Icon, label, color, bg, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
                  padding: '12px 6px 10px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'center',
                  boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.text, lineHeight: 1.3, whiteSpace: 'pre-line' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* ─── Estudios recientes ──────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={sectionLabelStyle}>Estudios recientes</p>
            <button
              onClick={() => nav('/app/vault')}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#00C87A', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', minHeight: 44, display: 'flex', alignItems: 'center' }}
            >
              Ver todos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(dataLoading || profileLoading)
              ? Array.from({ length: 3 }).map((_, i) => <StudyCardSkeleton key={i} />)
              : recent.length === 0
                ? <EmptyState onUpload={() => nav('/app/vault/upload')} t={t} />
                : recent.map(s => (
                    <StudyCard
                      key={s.id}
                      study={s}
                      onClick={() => nav(`/app/vault/${s.id}`)}
                      onQR={() => nav('/app/vault/qr', { state: { study_ids: [s.id] } })}
                      onWhatsApp={async () => {
                        try {
                          const { token } = await generateQR([s.id], 24);
                          const url = `${window.location.origin}/qr/${token}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(`Te comparto mis estudios médicos 🏥\n${url}`)}`, '_blank', 'noopener');
                        } catch { /* silencioso */ }
                      }}
                    />
                  ))
            }
          </div>

          {/* ─── Bresca footer tagline ───────────────────────────── */}
          <div style={{ marginTop: 24, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ height: 1, flex: 1, background: t.borderLight }} />
            <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bresca · Tu salud, tu control</span>
            <div style={{ height: 1, flex: 1, background: t.borderLight }} />
          </div>

        </div>
      )}

      {showRetention && user && (
        <RetentionModal
          userId={user.id}
          onDone={() => {
            setShowRetention(false);
            localStorage.setItem('bresca_retention_v1', 'shown');
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onUpload, t }: { onUpload: () => void; t: ReturnType<typeof themeColors> }) {
  return (
    <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
      <span style={{ fontSize: 36 }}>🗂</span>
      <p style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Todavía no tenés estudios</p>
      <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, maxWidth: 240 }}>Subí tu primer estudio médico y Bresca lo analiza automáticamente.</p>
      <button
        onClick={onUpload}
        style={{ marginTop: 6, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 100, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
      >
        Subir estudio →
      </button>
    </div>
  );
}
