import { categoryColor, formatStudyDate } from '../lib/vault';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export function StudyCard({ study, onClick }: { study: Study; onClick: () => void }) {
  const color = categoryColor(study.category);
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: 70, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
    >
      <div style={{ width: 4, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.study_type}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: study.confirmed ? '#DCFCE7' : '#FEF3C7', color: study.confirmed ? '#16A34A' : '#D97706' }}>
            {study.confirmed ? 'Confirmado' : 'Pendiente'}
          </span>
        </div>
        <span style={{ fontSize: 13, color: '#64748B' }}>{formatStudyDate(study.study_date)}</span>
        {study.lab_name && <span style={{ fontSize: 12, color: '#94A3B8', display: 'block' }}>{study.lab_name}</span>}
      </div>
    </button>
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
