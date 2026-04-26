import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { FullPageSpinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function StudyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('studies').select('*').eq('id', id).single()
      .then(({ data }) => { setStudy(data); setLoading(false); });
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (!study) return <div style={{ padding: 24, color: '#64748B' }}>Estudio no encontrado.</div>;

  const color = categoryColor(study.category);

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
          <ArrowLeft size={18} /> Vault
        </button>
        <button
          onClick={() => nav('/app/vault/qr', { state: { study_id: study.id } })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#00C87A', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
        >
          <QrCode size={18} /> Compartir QR
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: 16 }}>
          <div style={{ height: 4, background: color }} />
          <div style={{ padding: '16px 20px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{study.study_type}</h1>
            <p style={{ fontSize: 14, color: '#64748B' }}>{formatStudyDate(study.study_date)}</p>
            {study.lab_name && <p style={{ fontSize: 13, color: '#94A3B8' }}>{study.lab_name}</p>}
          </div>
        </div>

        {Object.entries((study.extracted_fields as Record<string, string>) ?? {}).length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 10 }}>RESULTADOS</p>
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              {Object.entries(study.extracted_fields as Record<string, string>).map(([key, val], i, arr) => (
                <div key={key} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{key}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{val}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
