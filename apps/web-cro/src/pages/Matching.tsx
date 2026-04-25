import { useState } from 'react';
import { matchPatients } from '../lib/api';

type Match = Awaited<ReturnType<typeof matchPatients>>['matches'][number];

const CATEGORIES = ['hematología', 'bioquímica', 'imágenes', 'cardiología', 'endocrinología', 'respiratorio'];

export default function Matching() {
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [results, setResults] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function toggleCat(cat: string) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const filters = {
      ...(ageMin ? { age_min: Number(ageMin) } : {}),
      ...(ageMax ? { age_max: Number(ageMax) } : {}),
      ...(selectedCats.length ? { categories: selectedCats } : {}),
    };
    const { matches } = await matchPatients(filters);
    setResults(matches);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Matching de pacientes</h1>
      <p style={s.subtitle}>Encontrá pacientes elegibles para estudios clínicos según criterios anónimos.</p>

      <div style={s.layout}>
        {/* Filters */}
        <form onSubmit={search} style={s.filters}>
          <h2 style={s.filterTitle}>Criterios de búsqueda</h2>

          <div style={s.fieldGroup}>
            <label style={s.label}>Rango etario</label>
            <div style={s.ageRow}>
              <input style={s.input} type="number" placeholder="Desde" min={0} max={120} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
              <span style={s.ageSep}>—</span>
              <input style={s.input} type="number" placeholder="Hasta" min={0} max={120} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Categorías de estudios</label>
            <div style={s.catGrid}>
              {CATEGORIES.map((cat) => (
                <label key={cat} style={s.catLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat)}
                    onChange={() => toggleCat(cat)}
                    style={{ accentColor: '#00C87A' }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <button style={s.searchBtn} type="submit" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar pacientes'}
          </button>

          {searched && results && (
            <div style={s.resultCount}>
              <strong>{results.length}</strong> pacientes encontrados
            </div>
          )}
        </form>

        {/* Results */}
        <div style={s.results}>
          {!searched ? (
            <div style={s.placeholder}>
              <span style={s.placeholderIcon}>🎯</span>
              <p>Configurá los criterios y buscá para ver los pacientes elegibles.</p>
            </div>
          ) : results && results.length === 0 ? (
            <div style={s.placeholder}>
              <span style={s.placeholderIcon}>🔍</span>
              <p>Sin resultados para los criterios seleccionados.</p>
            </div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Hash paciente', 'Edad', 'Categorías', 'Último estudio'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(results ?? []).map((p, i) => (
                    <tr key={p.patient_hash} style={i % 2 === 0 ? { background: '#FAFBFC' } : {}}>
                      <td style={s.td}><code style={s.hash}>{p.patient_hash.slice(0, 12)}…</code></td>
                      <td style={s.td}>{p.age_range !== null ? `${p.age_range}–${p.age_range + 4}` : '—'}</td>
                      <td style={s.td}>
                        <div style={s.chips}>
                          {p.study_categories.map((c) => <span key={c} style={s.chip}>{c}</span>)}
                        </div>
                      </td>
                      <td style={s.td}>{p.last_study_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: '#64748B', margin: '0 0 24px' },
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' },
  filters: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 20 },
  filterTitle: { fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
  ageRow: { display: 'flex', alignItems: 'center', gap: 8 },
  ageSep: { color: '#94A3B8' },
  input: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', color: '#0F172A', width: '100%' },
  catGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  catLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#0F172A', cursor: 'pointer' },
  searchBtn: { padding: '12px', borderRadius: 10, background: '#00C87A', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  resultCount: { fontSize: 13, color: '#64748B', textAlign: 'center', padding: '8px 0' },
  results: { minHeight: 200 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 12, color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  placeholderIcon: { fontSize: 40 },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' },
  td: { padding: '12px 16px', fontSize: 13, color: '#0F172A', borderBottom: '1px solid #F8FAFC', verticalAlign: 'middle' },
  hash: { background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: '#475569' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: { background: '#E8FBF3', color: '#00A663', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
};
