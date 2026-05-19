import { QrCode, Share2, ScanEye, Mail } from 'lucide-react';
import { categoryColor, formatStudyDate } from '../lib/vault';
import { useTheme, themeColors } from '../lib/theme';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

function isDicomStudy(study: Study): boolean {
  return (study.storage_paths as string[] | null)?.some(p => p.toLowerCase().endsWith('.dcm')) ?? false;
}

// OCR confidence → color del marco. Verde ≥95, amarillo 80-94.9, rojo <80.
function ocrFrameColor(score: number | null | undefined): string | null {
  if (score == null) return null;
  if (score < 80)   return '#EF4444';
  if (score <= 95)  return '#F59E0B';
  return '#22C55E';
}

export function StudyCard({
  study,
  onClick,
  onQR,
  onWhatsApp,
  onDicomView,
}: {
  study: Study;
  onClick: () => void;
  onQR: () => void;
  onWhatsApp: () => void;
  onDicomView?: () => void;
}) {
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const color   = categoryColor(study.category);
  const isDicom = isDicomStudy(study);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrScore: number | null | undefined = (study as any).ocr_score;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studySource: string | null = (study as any).source ?? null;
  const frameColor = ocrFrameColor(ocrScore);
  // Marco con color OCR cuando hay score; cae al border del tema si no hay.
  const borderColor = frameColor ?? t.border;
  const borderWidth = frameColor ? 2 : 1;

  const confirmedBg = study.confirmed
    ? (isDark ? 'rgba(34,197,94,0.15)' : '#DCFCE7')
    : (isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7');
  const confirmedFg = study.confirmed
    ? (isDark ? '#86EFAC' : '#16A34A')
    : (isDark ? '#FCD34D' : '#D97706');

  return (
    <div style={{ background: t.card, border: `${borderWidth}px solid ${borderColor}`, borderRadius: 14, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Fila principal — navega al detalle */}
      <button
        onClick={onClick}
        style={{ width: '100%', display: 'flex', cursor: 'pointer', textAlign: 'left', minHeight: 70, background: 'none', border: 'none', padding: 0 }}
      >
        <div style={{ width: 4, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.study_type}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {studySource === 'email' && (
                <span
                  title="Recibido por email"
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: isDark ? 'rgba(0,200,122,0.15)' : '#ECFDF5', color: '#00A663' }}
                >
                  <Mail size={10} />
                  Email
                </span>
              )}
              {frameColor && (
                <span style={{ fontSize: 10, fontWeight: 700, color: frameColor, letterSpacing: '0.04em' }} title={`Calidad OCR: ${Math.round(ocrScore!)}%`}>
                  {Math.round(ocrScore!)}%
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: confirmedBg, color: confirmedFg }}>
                {study.confirmed ? 'Confirmado' : 'Pendiente'}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 13, color: t.textSub }}>{formatStudyDate(study.study_date)}</span>
          {study.lab_name && <span style={{ fontSize: 12, color: t.textMuted, display: 'block' }}>{study.lab_name}</span>}
        </div>
      </button>

      {/* Fila inferior — solo para estudios confirmados */}
      {study.confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 10px 18px', borderTop: `1px solid ${t.borderLight}`, flexWrap: 'wrap' }}>
          {isDicom && onDicomView && (
            <button
              onClick={onDicomView}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', background: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
            >
              <ScanEye size={13} /> Ver imagen
            </button>
          )}
          <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500, marginRight: 2 }}>Compartir:</span>
          <button
            onClick={onQR}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.cardAlt, color: t.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
          >
            <QrCode size={13} /> QR
          </button>
          <button
            onClick={onWhatsApp}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
          >
            <Share2 size={13} /> WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

export function StudyCardSkeleton() {
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  return (
    <div style={{ height: 70, borderRadius: 14, display: 'flex', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: 4 }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: t.card, border: `1px solid ${t.border}` }}>
        <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '30%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

type DraftStatus = 'pending' | 'processing' | 'completed' | 'done' | 'failed' | 'error';
type PendingDraft = {
  id: string;
  status: DraftStatus;
  study_type: string | null;
  category: string | null;
  ocr_score?: number | null;
};

export function DraftStudyCard({
  draft,
  onReview,
  onAutoConfirm,
  onDismiss,
}: {
  draft: PendingDraft;
  onReview: () => void;
  // Solo se llama cuando ocr_score >= 95 (alta confianza → 1 click).
  onAutoConfirm?: (draftId: string) => void;
  onDismiss: () => void;
}) {
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const color = categoryColor(draft.category ?? 'otro');
  const isDone   = draft.status === 'completed' || draft.status === 'done';
  const isFailed = draft.status === 'failed'    || draft.status === 'error';
  const score    = typeof draft.ocr_score === 'number' ? draft.ocr_score : null;
  const isHighConfidence = score != null && score >= 95;

  if (isFailed) {
    return (
      <div style={{ width: '100%', background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : '#FECACA'}`, borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70 }}>
        <div style={{ width: 4, background: '#EF4444', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 700 }}>✕</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#FCA5A5' : '#DC2626', display: 'block' }}>No pudimos leer el documento</span>
            <span style={{ fontSize: 12, color: '#EF4444' }}>Podés ingresar los datos a mano</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onReview} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Ingresar →
            </button>
            <button onClick={onDismiss} style={{ background: 'none', border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : '#FECACA'}`, borderRadius: 8, color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: '6px 8px' }}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDone) {
    // Alta confianza (>=95): un click → agrega al Vault sin pantalla de review.
    // Score medio o sin score → flujo de review actual.
    const primaryAction = isHighConfidence && onAutoConfirm
      ? () => onAutoConfirm(draft.id)
      : onReview;
    const ctaLabel = isHighConfidence ? 'Agregar al Vault →' : 'Revisá →';
    const subLabel = isHighConfidence
      ? `Lectura confiable (${Math.round(score!)}%)`
      : 'Revisá los datos extraídos';

    return (
      <div style={{ width: '100%', background: isDark ? 'rgba(34,197,94,0.13)' : '#F0FDF4', border: `1px solid ${isDark ? 'rgba(34,197,94,0.4)' : '#86EFAC'}`, borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70 }}>
        <button
          onClick={primaryAction}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
        >
          <div style={{ width: 4, background: '#00C87A', flexShrink: 0, alignSelf: 'stretch', marginLeft: -14, marginTop: -12, marginBottom: -12 }} />
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {draft.study_type ?? '¡Resultado listo!'}
            </span>
            <span style={{ fontSize: 12, color: isDark ? '#86EFAC' : '#16A34A' }}>{subLabel}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#86EFAC' : '#00A663', whiteSpace: 'nowrap', flexShrink: 0 }}>{ctaLabel}</span>
        </button>
        {isHighConfidence && (
          <button
            onClick={onReview}
            style={{ background: 'none', border: 'none', borderLeft: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : '#86EFAC'}`, padding: '0 14px', color: isDark ? '#86EFAC' : '#16A34A', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            title="Revisar antes de guardar"
          >
            Revisar
          </button>
        )}
      </div>
    );
  }

  // procesando (pending / processing)
  return (
    <div style={{ width: '100%', background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70 }}>
      <div style={{ width: 4, background: color, flexShrink: 0, opacity: 0.4, animation: 'pulse-bar 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${t.border}`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.textSub, display: 'block' }}>Analizando el estudio…</span>
          <span style={{ fontSize: 12, color: t.textMuted }}>La IA está procesando en segundo plano</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: t.borderLight, color: t.textMuted, flexShrink: 0 }}>
          Procesando
        </span>
      </div>
    </div>
  );
}
