import { useEffect, useState } from 'react';
import { getPatients } from '../lib/api';

type Patient = Awaited<ReturnType<typeof getPatients>>['patients'][number];

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    getPatients(page, limit)
      .then(({ patients, total }) => { setPatients(patients); setTotal(total); })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Pacientes anonimizados</h1>
          <p style={s.subtitle}>Solo se muestran cohortes con ≥ 5 pacientes con consentimiento de investigación activo.</p>
        </div>
        <div style={s.badge}>{total} registros</div>
      </div>

      {loading ? (
        <p style={s.muted}>Cargando…</p>
      ) : patients.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>Sin datos disponibles</p>
          <p style={s.muted}>Se necesitan ≥ 5 pacientes con consentimiento en el mismo rango etario.</p>
        </div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Hash paciente', 'Rango etario', 'Categorías de estudios', 'Último estudio'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={p.patient_hash} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}>
                      <code style={s.hash}>{p.patient_hash.slice(0, 12)}…</code>
                    </td>
                    <td style={s.td}>
                      {p.age_range !== null ? `${p.age_range}–${p.age_range + 4} años` : '—'}
                    </td>
                    <td style={s.td}>
                      <div style={s.chips}>
                        {p.study_categories.map((c) => (
                          <span key={c} style={s.chip}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td style={s.td}>{p.last_study_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={s.pageBtn} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>← Anterior</button>
              <span style={s.pageInfo}>{page + 1} / {totalPages}</span>
              <button style={s.pageBtn} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' },
  subtitle: { fontSize: 13, color: '#64748B', margin: 0 },
  badge: { background: '#F1F5F9', borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' },
  muted: { color: '#94A3B8', fontSize: 14 },
  empty: { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 8px' },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' },
  td: { padding: '12px 16px', fontSize: 14, color: '#0F172A', borderBottom: '1px solid #F8FAFC', verticalAlign: 'middle' },
  trEven: { background: '#FAFBFC' },
  hash: { background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: '#475569' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: { background: '#E8FBF3', color: '#00A663', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 },
  pageBtn: { padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13 },
  pageInfo: { fontSize: 13, color: '#64748B' },
};
