import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { FullPageSpinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

function useStudyFiles(study: Study | null) {
  const [signedUrls, setSignedUrls] = useState<{ path: string; url: string; isPdf: boolean }[]>([]);

  useEffect(() => {
    if (!study) return;
    // Obtener paths: priorizar storage_paths (multi), fallback a storage_path
    const paths: string[] = ((study as unknown as { storage_paths?: string[] }).storage_paths?.length
      ? (study as unknown as { storage_paths: string[] }).storage_paths
      : study.storage_path ? [study.storage_path] : []);
    if (!paths.length) return;

    supabase.storage.from('studies').createSignedUrls(paths, 3600).then(({ data }) => {
      if (!data) return;
      setSignedUrls(
        data
          .filter(d => d.signedUrl && d.path)
          .map(d => ({
            path: d.path!,
            url: d.signedUrl!,
            isPdf: d.path!.toLowerCase().endsWith('.pdf'),
          })),
      );
    });
  }, [study?.id]);

  return signedUrls;
}

export default function StudyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('studies').select('*').eq('id', id).single()
      .then(({ data }) => { setStudy(data); setLoading(false); });
  }, [id]);

  const files = useStudyFiles(study);

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

        {/* Archivos del estudio */}
        {files.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 10 }}>
              {files.length === 1 ? 'ARCHIVO' : `ARCHIVOS (${files.length} páginas)`}
            </p>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
              {files.map((f, i) => (
                f.isPdf ? (
                  <a
                    key={f.path}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flexShrink: 0, width: 90, height: 110, borderRadius: 12, background: '#F1F5F9', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: '#64748B' }}
                  >
                    <FileText size={28} color="#4B6EF5" />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Pág. {i + 1}</span>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>Abrir PDF</span>
                  </a>
                ) : (
                  <button
                    key={f.path}
                    onClick={() => setLightboxUrl(f.url)}
                    style={{ flexShrink: 0, width: 90, height: 110, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #E2E8F0', padding: 0, cursor: 'pointer', position: 'relative' }}
                  >
                    <img src={f.url} alt={`Página ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {files.length > 1 && (
                      <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#fff', fontWeight: 600 }}>
                        {i + 1}
                      </span>
                    )}
                  </button>
                )
              ))}
            </div>
          </>
        )}

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

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={20} color="#fff" />
          </button>
          <img
            src={lightboxUrl}
            alt="Estudio"
            style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 8, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
