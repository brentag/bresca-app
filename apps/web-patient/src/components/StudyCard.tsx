import { QrCode, Share2, ScanEye } from 'lucide-react';
import { categoryColor, formatStudyDate } from '../lib/vault';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

function isDicomStudy(study: Study): boolean {
  return (study.storage_paths as string[] | null)?.some(p => p.toLowerCase().endsWith('.dcm')) ?? false;
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
  const color   = categoryColor(study.category);
  const isDicom = isDicomStudy(study);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrScore: number | null | undefined = (study as any).ocr_score;
  const dotColor = ocrScore == null ? null
    : ocrScore < 80  ? '#EF4444'
    : ocrScore <= 95 ? '#F59E0B'
    : '#22C55E';

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Fila principal — navega al detalle */}
      <button
        onClick={onClick}
        style={{ width: '100%', display: 'flex', cursor: 'pointer', textAlign: 'left', minHeight: 70, background: 'none', border: 'none', padding: 0 }}
      >
        <div style={{ width: 4, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.study_type}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {dotColor && (
                <span
                  title={`Calidad OCR: ${Math.round(ocrScore!)}%`}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
                />
              )}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: study.confirmed ? '#DCFCE7' : '#FEF3C7', color: study.confirmed ? '#16A34A' : '#D97706' }}>
                {study.confirmed ? 'Confirmado' : 'Pendiente'}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 13, color: '#64748B' }}>{formatStudyDate(study.study_date)}</span>
          {study.lab_name && <span style={{ fontSize: 12, color: '#94A3B8', display: 'block' }}>{study.lab_name}</span>}
        </div>
      </button>

      {/* Fila inferior — solo para estudios confirmados */}
      {study.confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 10px 18px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
          {isDicom && onDicomView && (
            <button
              onClick={onDicomView}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
            >
              <ScanEye size={13} /> Ver imagen
            </button>
          )}
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginRight: 2 }}>Compartir:</span>
          <button
            onClick={onQR}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}
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
  return (
    <div style={{ height: 70, borderRadius: 14, display: 'flex', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: 4 }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '30%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

type DraftStatus = 'pending' | 'processing' | 'completed' | 'done' | 'failed' | 'error';
type PendingDraft = { id: string; status: DraftStatus; study_type: string | null; category: string | null };

export function DraftStudyCard({
  draft,
  onReview,
  onDismiss,
}: {
  draft: PendingDraft;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const color = categoryColor(draft.category ?? 'hematología');
  const isDone   = draft.status === 'completed' || draft.status === 'done';
  const isFailed = draft.status === 'failed'    || draft.status === 'error';

  if (isFailed) {
    return (
      <div style={{ width: '100%', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70 }}>
        <div style={{ width: 4, background: '#EF4444', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 700 }}>✕</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', display: 'block' }}>No pudimos leer el documento</span>
            <span style={{ fontSize: 12, color: '#EF4444' }}>Podés ingresar los datos a mano</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onReview} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Ingresar →
            </button>
            <button onClick={onDismiss} style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 8, color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: '6px 8px' }}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <button
        onClick={onReview}
        style={{ width: '100%', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 4, background: '#00C87A', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {draft.study_type ?? '¡Resultado listo!'}
            </span>
            <span style={{ fontSize: 12, color: '#16A34A' }}>Revisá los datos extraídos</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#00A663', whiteSpace: 'nowrap', flexShrink: 0 }}>Revisá →</span>
        </div>
      </button>
    );
  }

  // procesando (pending / processing)
  return (
    <div style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', overflow: 'hidden', minHeight: 70 }}>
      <div style={{ width: 4, background: color, flexShrink: 0, opacity: 0.4, animation: 'pulse-bar 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 20, height: 20, border: `2px solid #E2E8F0`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', display: 'block' }}>Analizando el estudio…</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>La IA está procesando en segundo plano</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#94A3B8', flexShrink: 0 }}>
          Procesando
        </span>
      </div>
    </div>
  );
}
