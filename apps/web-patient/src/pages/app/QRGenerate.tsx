import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ArrowLeft, Copy, Check, Trash2 } from 'lucide-react';
import { generateQR, revokeQR } from '../../lib/api';
import { useProfile } from '../../lib/useProfile';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { categoryColor, formatStudyDate } from '../../lib/vault';
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
  const { profile } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
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

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', gap: 12 }}>
        <button
          onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Compartir con QR</h1>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* QR generado */}
        {token && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 4px 16px rgba(0,200,122,0.08)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>QR listo para mostrar</p>
            <div style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <QRCode value={url} size={180} />
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#64748B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              <button
                onClick={copy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00C87A' : '#64748B', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>El médico abre este link — sin app ni login.</p>
            <button
              onClick={() => setToken('')}
              style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}
            >
              Generar otro QR
            </button>
          </div>
        )}

        {/* Selector de estudios */}
        {!token && (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Seleccioná los estudios a compartir:</p>
              {studies.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: 14 }}>No tenés estudios confirmados todavía.</p>
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
                          border: `1.5px solid ${isSelected ? '#00C87A' : '#E2E8F0'}`,
                          background: isSelected ? 'rgba(0,200,122,0.05)' : '#fff',
                          cursor: 'pointer', textAlign: 'left', minHeight: 54,
                          boxShadow: isSelected ? '0 0 0 3px rgba(0,200,122,0.10)' : 'none',
                          transition: 'border-color 120ms, box-shadow 120ms',
                        }}
                      >
                        <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.study_type}
                          </span>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatStudyDate(s.study_date)}</span>
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? '#00C87A' : '#CBD5E1'}`,
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
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Duración del acceso:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {TTL_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    onClick={() => setTtl(opt.hours)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10, border: `1.5px solid ${ttl === opt.hours ? '#00C87A' : '#E2E8F0'}`,
                      background: ttl === opt.hours ? 'rgba(0,200,122,0.08)' : '#fff',
                      color: ttl === opt.hours ? '#00C87A' : '#64748B',
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
                background: selected.length === 0 ? '#E2E8F0' : '#00C87A',
                color: selected.length === 0 ? '#94A3B8' : '#fff',
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
            <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              QRs activos
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeQRs.map(qr => (
                <div
                  key={qr.token}
                  style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${qr.token === token ? '#00C87A' : '#E2E8F0'}`, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                      {qr.study_ids.length} estudio{qr.study_ids.length !== 1 ? 's' : ''}
                    </p>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>
                      Vence {new Date(qr.expires_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(qr.token)}
                    style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, flexShrink: 0 }}
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
