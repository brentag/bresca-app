import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, QrCode, FileText, X, RefreshCw, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { useTheme, themeColors } from '../../lib/theme';
import { FullPageSpinner } from '../../components/Spinner';
import { exportStudyPDF } from '../../lib/export-pdf';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];
type SiblingStudy = Pick<Study, 'id' | 'study_type' | 'study_date'>;

// Navega entre estudios de la misma categoría, ordenados por study_date desc.
// Retorna { prev, next } basado en la posición del estudio actual.
function useSiblings(study: Study | null) {
  const [siblings, setSiblings] = useState<{ prev: SiblingStudy | null; next: SiblingStudy | null }>({ prev: null, next: null });

  useEffect(() => {
    if (!study) return;
    supabase
      .from('studies')
      .select('id, study_type, study_date')
      .eq('profile_id', study.profile_id)
      .eq('category', study.category)
      .eq('confirmed', true)
      .order('study_date', { ascending: false })
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const idx = data.findIndex(s => s.id === study.id);
        if (idx === -1) return;
        // prev = más reciente (índice menor), next = más viejo (índice mayor)
        setSiblings({
          prev: idx > 0 ? data[idx - 1] as SiblingStudy : null,
          next: idx < data.length - 1 ? data[idx + 1] as SiblingStudy : null,
        });
      });
  }, [study?.id]);

  return siblings;
}

function useStudyFiles(study: Study | null) {
  const [signedUrls, setSignedUrls] = useState<{ path: string; url: string; isPdf: boolean }[]>([]);

  useEffect(() => {
    if (!study) return;
    // Obtener paths: priorizar storage_paths (multi), fallback a storage_path
    const paths: string[] = study.storage_paths?.length
      ? study.storage_paths
      : study.storage_path ? [study.storage_path] : [];
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
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('studies').select('*').eq('id', id).single()
      .then(({ data }) => { setStudy(data); setLoading(false); });
  }, [id]);

  const files = useStudyFiles(study);
  const { prev, next } = useSiblings(study);

  if (loading) return <FullPageSpinner />;
  if (!study) return <div style={{ padding: 24, color: t.textSub, background: t.bg, minHeight: '100dvh' }}>Estudio no encontrado.</div>;

  const color = categoryColor(study.category);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrScore: number | null | undefined = (study as any).ocr_score;
  const needsReview = ocrScore != null && ocrScore < 80;

  return (
    <div style={{ minHeight: '100dvh', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: t.card, borderBottom: `1px solid ${t.border}` }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: t.textSub, fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
          <ArrowLeft size={18} /> Vault
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => exportStudyPDF(study)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer', minHeight: 44, padding: '0 8px' }}
            title="Exportar para médico"
          >
            <Printer size={17} /> Para médico
          </button>
          <button
            onClick={() => nav('/app/vault/qr', { state: { study_id: study.id } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#00C87A', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
          >
            <QrCode size={18} /> Compartir QR
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Navegación entre estudios de la misma categoría */}
        {(prev || next) && (
          <div style={{
            display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 14,
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Botón anterior (más reciente) */}
            <button
              onClick={() => prev && nav(`/app/vault/${prev.id}`)}
              disabled={!prev}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 12px',
                background: 'none', border: 'none',
                borderLeft: `3px solid ${prev ? color : 'transparent'}`,
                cursor: prev ? 'pointer' : 'default',
                opacity: prev ? 1 : 0.35,
                minHeight: 52, textAlign: 'left',
                transition: 'opacity 150ms',
              }}
              title={prev ? `${prev.study_type} — ${formatStudyDate(prev.study_date)}` : undefined}
            >
              <ChevronLeft size={16} color={prev ? color : t.textMuted} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: prev ? color : t.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>Más reciente</span>
                {prev && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prev.study_type}
                  </span>
                )}
                <span style={{ display: 'block', fontSize: 11, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {prev ? formatStudyDate(prev.study_date) : '—'}
                </span>
              </div>
            </button>

            {/* Separador central */}
            <div style={{ width: 1, background: t.border, alignSelf: 'stretch', flexShrink: 0 }} />

            {/* Botón siguiente (más antiguo) */}
            <button
              onClick={() => next && nav(`/app/vault/${next.id}`)}
              disabled={!next}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
                padding: '10px 12px',
                background: 'none', border: 'none',
                borderRight: `3px solid ${next ? color : 'transparent'}`,
                cursor: next ? 'pointer' : 'default',
                opacity: next ? 1 : 0.35,
                minHeight: 52, textAlign: 'right',
                transition: 'opacity 150ms',
              }}
              title={next ? `${next.study_type} — ${formatStudyDate(next.study_date)}` : undefined}
            >
              <div style={{ minWidth: 0, overflow: 'hidden', textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: next ? color : t.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2, textAlign: 'right' }}>Más antiguo</span>
                {next && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {next.study_type}
                  </span>
                )}
                <span style={{ display: 'block', fontSize: 11, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {next ? formatStudyDate(next.study_date) : '—'}
                </span>
              </div>
              <ChevronRight size={16} color={next ? color : t.textMuted} style={{ flexShrink: 0 }} />
            </button>
          </div>
        )}

        <div style={{ background: t.card, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.border}`, marginBottom: 16 }}>
          <div style={{ height: 4, background: color }} />
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, margin: 0 }}>{study.study_type}</h1>
              {ocrScore != null && <OcrScoreBadge score={ocrScore} />}
            </div>
            <p style={{ fontSize: 14, color: t.textSub, marginTop: 4 }}>{formatStudyDate(study.study_date)}</p>
            {study.lab_name && <p style={{ fontSize: 13, color: t.textMuted }}>{study.lab_name}</p>}

            {needsReview && (
              <div style={{ background: isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED', border: `1px solid ${isDark ? 'rgba(249,115,22,0.4)' : '#FED7AA'}`, borderRadius: 10, padding: '10px 14px', marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FDBA74' : '#92400E', margin: '0 0 2px' }}>Calidad de lectura baja</p>
                  <p style={{ fontSize: 12, color: isDark ? '#FED7AA' : '#B45309', margin: 0, lineHeight: 1.5 }}>
                    El análisis automático tuvo dificultades con este documento. Verificá los valores o resubí con mejor calidad.
                  </p>
                </div>
                <button
                  onClick={() => nav('/app/vault/upload')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#F97316', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  <RefreshCw size={11} /> Resubir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Archivos del estudio */}
        {files.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', marginBottom: 10 }}>
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
                    style={{ flexShrink: 0, width: 90, height: 110, borderRadius: 12, background: t.cardAlt, border: `1.5px solid ${t.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: t.textSub }}
                  >
                    <FileText size={28} color="#4B6EF5" />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Pág. {i + 1}</span>
                    <span style={{ fontSize: 9, color: t.textMuted }}>Abrir PDF</span>
                  </a>
                ) : (
                  <button
                    key={f.path}
                    onClick={() => setLightboxUrl(f.url)}
                    style={{ flexShrink: 0, width: 90, height: 110, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${t.border}`, padding: 0, cursor: 'pointer', position: 'relative' }}
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
            <p style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', marginBottom: 10 }}>RESULTADOS</p>
            <div style={{ background: isDark ? 'rgba(249,115,22,0.12)' : '#FFF7ED', border: `1px solid ${isDark ? 'rgba(249,115,22,0.35)' : '#FED7AA'}`, borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚕️</span>
              <p style={{ fontSize: 12, color: isDark ? '#FDBA74' : '#92400E', lineHeight: 1.55, margin: 0 }}>
                Este resumen es <strong>asistivo, no diagnóstico</strong>. Siempre verificá los valores con tu médico antes de tomar decisiones de salud.
              </p>
            </div>
            <div style={{ background: t.card, borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              {Object.entries(study.extracted_fields as Record<string, string>).map(([key, val], i, arr) => (
                <div key={key} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${t.borderLight}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: t.textSub }}>{key}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{val}</span>
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

function OcrScoreBadge({ score }: { score: number }) {
  const pct   = Math.round(score);
  const color = pct < 80 ? '#EF4444' : pct <= 95 ? '#F59E0B' : '#22C55E';
  const bg    = pct < 80 ? '#FEF2F2' : pct <= 95 ? '#FFFBEB' : '#F0FDF4';
  const label = pct < 80 ? 'Baja' : pct <= 95 ? 'Media' : 'Alta';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: bg, border: `1px solid ${color}30`, flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color }}>OCR {pct}% · {label}</span>
    </div>
  );
}
