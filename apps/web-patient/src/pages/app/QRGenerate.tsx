import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { generateQR } from '../../lib/api';
import { useProfile } from '../../lib/useProfile';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function QRGenerate() {
  const nav = useNavigate();
  const { profile } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ttl, setTtl] = useState(24);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('studies').select('*').eq('profile_id', profile.id).eq('confirmed', true)
      .order('study_date', { ascending: false })
      .then(({ data }) => setStudies(data ?? []));
  }, [profile?.id]);

  function toggleStudy(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function generate() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const { token: t } = await generateQR(selected, ttl);
      setToken(t);
    } catch { /* fail silently — UI shows nothing */ }
    setLoading(false);
  }

  const url = token ? `${window.location.origin}/qr/${token}` : '';

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', gap: 12 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Generar QR</h1>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!token ? (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Seleccioná los estudios a compartir:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studies.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleStudy(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${selected.includes(s.id) ? '#00C87A' : '#E2E8F0'}`, background: selected.includes(s.id) ? 'rgba(0,200,122,0.06)' : '#fff', cursor: 'pointer', textAlign: 'left', minHeight: 54 }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.includes(s.id) ? '#00C87A' : '#CBD5E1'}`, background: selected.includes(s.id) ? '#00C87A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selected.includes(s.id) && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 14, color: '#0F172A' }}>{s.study_type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Duración del acceso:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[24, 48, 72].map(h => (
                  <button
                    key={h}
                    onClick={() => setTtl(h)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${ttl === h ? '#00C87A' : '#E2E8F0'}`, background: ttl === h ? 'rgba(0,200,122,0.08)' : '#fff', color: ttl === h ? '#00C87A' : '#64748B', fontWeight: ttl === h ? 600 : 400, cursor: 'pointer', minHeight: 44 }}
                  >
                    {h}hs
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={loading || selected.length === 0}
              style={{ padding: '16px', borderRadius: 14, border: 'none', background: selected.length === 0 ? '#E2E8F0' : '#00C87A', color: selected.length === 0 ? '#94A3B8' : '#fff', fontSize: 16, fontWeight: 600, cursor: selected.length === 0 ? 'not-allowed' : 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              {loading ? <><Spinner /> Generando…</> : 'Generar QR'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 20 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
              alt="QR Code"
              width={200}
              height={200}
              style={{ borderRadius: 16 }}
            />
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00C87A' : '#64748B', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>El médico puede abrir este link en su navegador — sin instalar nada.</p>
            <button onClick={() => setToken('')} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
              Generar otro QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
