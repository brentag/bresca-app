import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ArrowLeft, Copy, Check, Trash2, Share2 } from 'lucide-react';
import { generateQR, revokeQR } from '../../lib/api';
import { useProfile } from '../../lib/useProfile';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { useTheme, themeColors } from '../../lib/theme';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];
type ActiveQR = { token: string; study_ids: string[]; expires_at: string };

const TTL_OPTIONS = [
  { label: '24 hs', hours: 24 },
  { label: '48 hs', hours: 48 },
  { label: '72 hs', hours: 72 },
  { label: '7 días', hours: 168 },
];

export default function QRGenerate() {
  const nav = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const [studies, setStudies] = useState<Study[]>([]);
  const preSelected = (location.state as { study_ids?: string[] } | null)?.study_ids ?? [];
  const [selected, setSelected] = useState<string[]>(preSelected);
  const [ttl, setTtl] = useState(24);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeQRs, setActiveQRs] = useState<ActiveQR[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('studies')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('confirmed', true)
      .order('study_date', { ascending: false })
      .then(({ data }) => setStudies(data ?? []));

    supabase
      .from('qr_tokens')
      .select('token, study_ids, expires_at')
      .eq('profile_id', profile.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at' as never, { ascending: false })
      .then(({ data }) => setActiveQRs((data ?? []) as ActiveQR[]));
  }, [profile?.id]);

  function toggleStudy(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function generate() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const { token: t, expires_at } = await generateQR(selected, ttl);
      setToken(t);
      setActiveQRs(prev => [{ token: t, study_ids: [...selected], expires_at }, ...prev]);
    } catch { /* error ya visible en UI — generando se resetea */ }
    setLoading(false);
  }

  async function handleRevoke(t: string) {
    await revokeQR(t);
    setActiveQRs(prev => prev.filter(q => q.token !== t));
    if (token === t) setToken('');
  }

  const url = token ? `${window.location.origin}/qr/${token}` : '';

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const text = `Te comparto mis estudios médicos 🏥\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <div style={{ minHeight: '100dvh', background: t.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: t.card, borderBottom: `1px solid ${t.border}`, gap: 12 }}>
        <button
          onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: t.text }}>Compartir con QR</h1>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* QR generado */}
        {token && (
          <div style={{ background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,200,122,0.08)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: t.text }}>QR listo para mostrar</p>
            {/* QR siempre sobre fondo blanco para asegurar lectura del scanner */}
            <div style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <QRCode value={url} size={180} />
            </div>
            <div style={{ background: t.cardAlt, borderRadius: 10, padding: '10px 14px', border: `1px solid ${t.border}`, width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: t.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              <button
                onClick={copy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00C87A' : t.textSub, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Copiar link"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={shareWhatsApp}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46 }}
              >
                <Share2 size={16} />
                Compartir por WhatsApp
              </button>
            </div>
            <p style={{ fontSize: 12, color: t.textMuted, textAlign: 'center' }}>El médico abre este link — sin app ni login.</p>
            <button
              onClick={() => setToken('')}
              style={{ background: 'none', border: 'none', color: t.textSub, fontSize: 14, cursor: 'pointer', minHeight: 44 }}
            >
              Generar otro QR
            </button>
          </div>
        )}

        {/* Selector de estudios */}
        {!token && (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 12 }}>Seleccioná los estudios a compartir:</p>
              {studies.length === 0 ? (
                <div style={{ background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: t.textMuted, fontSize: 14 }}>No tenés estudios confirmados todavía.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {studies.map(s => {
                    const isSelected = selected.includes(s.id);
                    const color = categoryColor(s.category);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStudy(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                          border: `1.5px solid ${isSelected ? '#00C87A' : t.border}`,
                          background: isSelected ? 'rgba(0,200,122,0.08)' : t.card,
                          cursor: 'pointer', textAlign: 'left', minHeight: 54,
                          boxShadow: isSelected ? '0 0 0 3px rgba(0,200,122,0.10)' : 'none',
                          transition: 'border-color 120ms, box-shadow 120ms',
                        }}
                      >
                        <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: t.text, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.study_type}
                          </span>
                          <span style={{ fontSize: 12, color: t.textMuted }}>{formatStudyDate(s.study_date)}</span>
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? '#00C87A' : t.border}`,
                          background: isSelected ? '#00C87A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          transition: 'all 120ms',
                        }}>
                          {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TTL */}
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Duración del acceso:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {TTL_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    onClick={() => setTtl(opt.hours)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10, border: `1.5px solid ${ttl === opt.hours ? '#00C87A' : t.border}`,
                      background: ttl === opt.hours ? 'rgba(0,200,122,0.10)' : t.card,
                      color: ttl === opt.hours ? '#00C87A' : t.textSub,
                      fontWeight: ttl === opt.hours ? 600 : 400,
                      fontSize: 13, cursor: 'pointer', minHeight: 44, transition: 'all 120ms',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón generar */}
            <button
              onClick={generate}
              disabled={loading || selected.length === 0}
              style={{
                padding: '16px', borderRadius: 14, border: 'none',
                background: selected.length === 0 ? t.border : '#00C87A',
                color: selected.length === 0 ? t.textMuted : '#fff',
                fontSize: 16, fontWeight: 600,
                cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <><Spinner /> Generando…</> : `Generar QR${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          </>
        )}

        {/* QRs activos */}
        {activeQRs.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: t.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              QRs activos
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeQRs.map(qr => (
                <div
                  key={qr.token}
                  style={{ background: t.card, borderRadius: 12, border: `1.5px solid ${qr.token === token ? '#00C87A' : t.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 2 }}>
                      {qr.study_ids.length} estudio{qr.study_ids.length !== 1 ? 's' : ''}
                    </p>
                    <p style={{ fontSize: 12, color: t.textMuted }}>
                      Vence {new Date(qr.expires_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(qr.token)}
                    style={{ background: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, flexShrink: 0 }}
                    title="Revocar QR"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
