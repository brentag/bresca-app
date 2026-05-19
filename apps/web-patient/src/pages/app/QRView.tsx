import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FullPageSpinner } from '../../components/Spinner';
import { formatStudyDate } from '../../lib/vault';
import { PublicDicomViewer } from '../../components/PublicDicomViewer';

type SharedFile = { path: string; url: string; mime: string };

type StudySafe = {
  id: string;
  study_type: string;
  category: string;
  study_date: string;
  lab_name: string | null;
  extracted_fields: Record<string, string>;
  files: SharedFile[];
};

type ApiResponse = {
  owner_name: string | null;
  studies: StudySafe[];
  expires_at: string;
};

export default function QRView() {
  const { token } = useParams<{ token: string }>();
  const [owner, setOwner] = useState<string | null>(null);
  const [studies, setStudies] = useState<StudySafe[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/qr/${token}`)
      .then(r => { if (!r.ok) throw new Error('invalid'); return r.json() as Promise<ApiResponse>; })
      .then(d => {
        setOwner(d.owner_name);
        setStudies(d.studies ?? []);
        setExpiresAt(d.expires_at);
        setLoading(false);
      })
      .catch(() => { setError('Este link es inválido o ya venció.'); setLoading(false); });
  }, [token]);

  if (loading) return <FullPageSpinner />;

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 48, marginBottom: 16 }}>⏱</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Link vencido o inválido</h2>
      <p style={{ fontSize: 14, color: '#64748B' }}>El paciente puede generar un nuevo enlace desde la app Bresca.</p>
    </div>
  );

  const greeting = owner
    ? `${owner} te compartió por Bresca`
    : 'Estudio compartido por Bresca';

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', padding: '24px 20px 40px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <img src="/icons/icon-192.png" alt="Bresca" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{greeting}</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
            Acceso válido hasta {new Date(expiresAt).toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {studies.map(s => (
          <StudyBlock key={s.id} study={s} />
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 32 }}>
        Acceso de solo lectura, controlado por el paciente. El enlace deja de funcionar al vencer.
      </p>
    </div>
  );
}

function StudyBlock({ study: s }: { study: StudySafe }) {
  const fields = Object.entries(s.extracted_fields ?? {});
  const dateLabel = formatStudyDate(s.study_date);

  const dicomUrls = s.files.filter(f => f.mime === 'application/dicom').map(f => f.url);
  const otherFiles = s.files.filter(f => f.mime !== 'application/dicom');

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Encabezado del estudio */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>{s.study_type}</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          {dateLabel}{s.lab_name ? ` · ${s.lab_name}` : ''}
        </p>
      </div>

      {/* Visor DICOM (series agrupada) */}
      {dicomUrls.length > 0 && (
        <div style={{ padding: 12 }}>
          <PublicDicomViewer urls={dicomUrls} />
        </div>
      )}

      {/* Archivos no-DICOM */}
      {otherFiles.length > 0 && (
        <div style={{ background: '#0F172A', padding: 0 }}>
          {otherFiles.map((f, idx) => (
            <FileViewer key={f.path} file={f} index={idx} total={otherFiles.length} />
          ))}
        </div>
      )}

      {/* Tabla de campos extraídos */}
      {fields.length > 0 && (
        <div style={{ padding: '6px 0' }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ padding: '10px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileViewer({ file, index, total }: { file: SharedFile; index: number; total: number }) {
  const isPdf   = file.mime === 'application/pdf';
  const isImage = file.mime.startsWith('image/');
  const label   = total > 1 ? `Página ${index + 1} de ${total}` : null;

  return (
    <div style={{ background: '#0F172A' }}>
      {label && (
        <p style={{ fontSize: 11, color: '#94A3B8', padding: '8px 18px', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      )}
      {isPdf && (
        <iframe
          src={file.url}
          title={`Estudio ${index + 1}`}
          style={{ width: '100%', height: 'min(75dvh, 720px)', border: 'none', display: 'block', background: '#fff' }}
        />
      )}
      {isImage && (
        <img
          src={file.url}
          alt={`Estudio ${index + 1}`}
          style={{ width: '100%', height: 'auto', display: 'block', background: '#fff' }}
        />
      )}
      {!isPdf && !isImage && (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', padding: '14px 18px', color: '#fff', textDecoration: 'none', fontSize: 14 }}
        >
          Descargar archivo →
        </a>
      )}
    </div>
  );
}
