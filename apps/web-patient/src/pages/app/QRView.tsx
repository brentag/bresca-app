import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FullPageSpinner } from '../../components/Spinner';
import { formatStudyDate } from '../../lib/vault';

type StudySafe = {
  id: string;
  study_type: string;
  category: string;
  study_date: string;
  lab_name: string | null;
  extracted_fields: Record<string, string>;
};

export default function QRView() {
  const { token } = useParams<{ token: string }>();
  const [studies, setStudies] = useState<StudySafe[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/qr/${token}`)
      .then(r => { if (!r.ok) throw new Error('invalid'); return r.json(); })
      .then(d => { setStudies(d.studies ?? []); setExpiresAt(d.expires_at); setLoading(false); })
      .catch(() => { setError('Este QR es inválido o ya venció.'); setLoading(false); });
  }, [token]);

  if (loading) return <FullPageSpinner />;

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 48, marginBottom: 16 }}>⏱</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>QR vencido o inválido</h2>
      <p style={{ fontSize: 14, color: '#64748B' }}>El paciente puede generar un nuevo código QR desde la app Bresca.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', padding: '24px 20px', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <img src="/icons/icon-192.png" alt="Bresca" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Historial médico compartido</h1>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>Válido hasta: {new Date(expiresAt).toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {studies.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{s.study_type}</h2>
              <p style={{ fontSize: 13, color: '#64748B' }}>{formatStudyDate(s.study_date)}{s.lab_name ? ` · ${s.lab_name}` : ''}</p>
            </div>
            {Object.entries(s.extracted_fields ?? {}).map(([k, v]) => (
              <div key={k} style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 24 }}>
        Compartido vía Bresca — acceso de solo lectura, controlado por el paciente.
      </p>
    </div>
  );
}
