import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, QrCode, FileText, X, RefreshCw, Printer, MoreHorizontal, MoveRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { useTheme, themeColors } from '../../lib/theme';
import { FullPageSpinner } from '../../components/Spinner';
import { exportStudyPDF } from '../../lib/export-pdf';
import { moveStudy } from '../../lib/api';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];
type SiblingStudy = Pick<Study, 'id' | 'study_type' | 'study_date' | 'category'>;

// Navega entre TODOS los estudios del perfil, ordenados por study_date desc.
// Retorna prev, next y posición N/M en la línea de tiempo completa.
function useSiblings(study: Study | null) {
  const [result, setResult] = useState<{
    prev: SiblingStudy | null;
    next: SiblingStudy | null;
    position: number;
    total: number;
  }>({ prev: null, next: null, position: 0, total: 0 });

  useEffect(() => {
    if (!study) return;
    supabase
      .from('studies')
      .select('id, study_type, study_date, category')
      .eq('profile_id', study.profile_id)
      .eq('confirmed', true)
      .order('study_date', { ascending: false })
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const idx = data.findIndex(s => s.id === study.id);
        if (idx === -1) return;
        setResult({
          prev: idx > 0           ? data[idx - 1] as SiblingStudy : null,
          next: idx < data.length - 1 ? data[idx + 1] as SiblingStudy : null,
          position: idx + 1,
          total: data.length,
        });
      });
  }, [study?.id]);

  return result;
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

type ProfileOption = { id: string; display_name: string | null };

export default function StudyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  const [moveProfiles, setMoveProfiles] = useState<ProfileOption[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveToast, setMoveToast] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('studies').select('*').eq('id', id).single()
      .then(({ data }) => { setStudy(data); setLoading(false); });
  }, [id]);

  const files = useStudyFiles(study);
  const { prev, next, position, total } = useSiblings(study);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (delta > 60 && next) nav(`/app/vault/${next.id}`);
    else if (delta < -60 && prev) nav(`/app/vault/${prev.id}`);
    setTouchStartX(null);
  }

  async function openMoveSheet() {
    setShowMoveSheet(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .or(`user_id.eq.${user.id},owner_user_id.eq.${user.id}`)
      .order('created_at');
    setMoveProfiles(data ?? []);
  }

  async function handleMove(targetId: string) {
    if (!study || moveLoading) return;
    setMoveLoading(true);
    try {
      const { moved_to } = await moveStudy(study.id, targetId);
      setShowMoveSheet(false);
      setMoveToast(`Estudio movido a ${moved_to ?? 'otro vault'}`);
      setTimeout(() => { setMoveToast(''); nav(-1); }, 1800);
    } catch {
      setMoveToast('No se pudo mover el estudio. Intentá de nuevo.');
      setTimeout(() => setMoveToast(''), 3000);
    }
    setMoveLoading(false);
  }

  if (loading) return <FullPageSpinner />;
  if (!study) return <div style={{ padding: 24, color: t.textSub, background: t.bg, minHeight: '100dvh' }}>Estudio no encontrado.</div>;

  const color = categoryColor(study.category);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrScore: number | null | undefined = (study as any).ocr_score;
  const needsReview = ocrScore != null && ocrScore < 80;

  return (
    <div
      style={{ minHeight: '100dvh', background: t.bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
          <button
            onClick={openMoveSheet}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', minHeight: 44, padding: '0 4px' }}
            title="Más opciones"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Navegación entre todos los estudios del perfil */}
        {total > 1 && (
          <div style={{
            display: 'flex', alignItems: 'stretch', marginBottom: 14,
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden',
          }}>
            {/* ← Más reciente */}
            <button
              onClick={() => prev && nav(`/app/vault/${prev.id}`)}
              disabled={!prev}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 12px',
                background: 'none', border: 'none',
                borderLeft: `3px solid ${prev ? categoryColor(prev.category) : 'transparent'}`,
                cursor: prev ? 'pointer' : 'default',
                opacity: prev ? 1 : 0.3,
                minHeight: 52, textAlign: 'left',
                transition: 'opacity 150ms',
              }}
            >
              <ChevronLeft size={16} color={prev ? categoryColor(prev.category) : t.textMuted} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: prev ? categoryColor(prev.category) : t.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Más reciente
                </span>
                {prev ? (
                  <>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prev.study_type}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: t.textSub }}>
                      {formatStudyDate(prev.study_date)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: t.textMuted }}>Primero</span>
                )}
              </div>
            </button>

            {/* Indicador de posición central */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: '6px 10px', borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1 }}>{position}</span>
              <div style={{ width: 1, height: 8, background: t.border, margin: '3px 0' }} />
              <span style={{ fontSize: 11, color: t.textMuted, lineHeight: 1 }}>{total}</span>
            </div>

            {/* Más antiguo → */}
            <button
              onClick={() => next && nav(`/app/vault/${next.id}`)}
              disabled={!next}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
                padding: '10px 12px',
                background: 'none', border: 'none',
                borderRight: `3px solid ${next ? categoryColor(next.category) : 'transparent'}`,
                cursor: next ? 'pointer' : 'default',
                opacity: next ? 1 : 0.3,
                minHeight: 52, textAlign: 'right',
                transition: 'opacity 150ms',
              }}
            >
              <div style={{ minWidth: 0, overflow: 'hidden', textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: next ? categoryColor(next.category) : t.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Más antiguo
                </span>
                {next ? (
                  <>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {next.study_type}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: t.textSub }}>
                      {formatStudyDate(next.study_date)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: t.textMuted }}>Último</span>
                )}
              </div>
              <ChevronRight size={16} color={next ? categoryColor(next.category) : t.textMuted} style={{ flexShrink: 0 }} />
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

            {study.category === 'receta' && (
              <RecetaValidityBadge
                fields={study.extracted_fields as Record<string, string>}
                isDark={isDark}
              />
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

      {/* Move sheet */}
      {showMoveSheet && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !moveLoading && setShowMoveSheet(false)}
        >
          <div
            style={{ background: t.card, width: '100%', borderRadius: '20px 20px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>Mover a…</h2>
              <button onClick={() => setShowMoveSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 4 }}>
                <X size={20} color={t.textMuted} />
              </button>
            </div>

            {moveProfiles.length === 0 ? (
              <p style={{ fontSize: 14, color: t.textSub, textAlign: 'center', padding: '20px 0' }}>Cargando perfiles…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {moveProfiles.map((p) => {
                  const isCurrent = p.id === study.profile_id;
                  return (
                    <button
                      key={p.id}
                      disabled={isCurrent || moveLoading}
                      onClick={() => !isCurrent && handleMove(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: 12,
                        background: isCurrent ? (isDark ? 'rgba(0,200,122,0.1)' : '#F0FDF4') : t.bg,
                        border: `1.5px solid ${isCurrent ? '#00C87A' : t.border}`,
                        cursor: isCurrent ? 'default' : 'pointer',
                        opacity: moveLoading && !isCurrent ? 0.5 : 1,
                        transition: 'opacity 150ms',
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 600, color: isCurrent ? '#00C87A' : t.text }}>
                        {p.display_name ?? 'Sin nombre'}
                      </span>
                      {isCurrent ? (
                        <span style={{ fontSize: 11, color: '#00C87A', fontWeight: 600 }}>Vault actual</span>
                      ) : (
                        <MoveRight size={16} color={t.textMuted} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {moveToast && (
        <div style={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {moveToast}
        </div>
      )}
    </div>
  );
}

function parseValidDate(val: string): Date | null {
  // Accepts YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + 'T00:00:00');
  const parts = val.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00`);
  }
  return null;
}

function RecetaValidityBadge({ fields, isDark }: { fields: Record<string, string>; isDark: boolean }) {
  const raw = fields['Válida hasta'] ?? fields['Valida hasta'] ?? fields['valid_until'];
  if (!raw) return null;
  const date = parseValidDate(raw);
  if (!date || isNaN(date.getTime())) return null;

  const today = new Date(); today.setHours(0,0,0,0);
  const daysLeft = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const expired = daysLeft < 0;
  const soonExpiring = !expired && daysLeft <= 7;

  const bg    = expired ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
              : soonExpiring ? (isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB')
              : (isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4');
  const border = expired ? '#EF4444' : soonExpiring ? '#F59E0B' : '#22C55E';
  const color  = expired ? (isDark ? '#FCA5A5' : '#DC2626')
               : soonExpiring ? (isDark ? '#FCD34D' : '#B45309')
               : (isDark ? '#86EFAC' : '#166534');
  const label  = expired ? `Vencida hace ${Math.abs(daysLeft)} días`
               : soonExpiring ? `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
               : `Válida hasta ${date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return (
    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: bg, border: `1px solid ${border}30` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: border, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
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
