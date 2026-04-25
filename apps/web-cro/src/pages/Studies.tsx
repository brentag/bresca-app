import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { getDistribution } from '../lib/api';

type Dist = Awaited<ReturnType<typeof getDistribution>>;

const COLORS = ['#00C87A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#6366F1'];

export default function Studies() {
  const [dist, setDist] = useState<Dist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDistribution().then(setDist).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#94A3B8', fontSize: 14 }}>Cargando…</p>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Distribución de estudios</h1>

      <div style={s.grid}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Por categoría</h2>
          {!dist?.by_category.length ? (
            <p style={s.muted}>Sin datos todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dist.by_category} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="value" name="estudios" radius={[4, 4, 0, 0]}>
                  {dist.by_category.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={s.card}>
          <h2 style={s.cardTitle}>Top tipos de estudio</h2>
          {!dist?.by_type.length ? (
            <p style={s.muted}>Sin datos todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dist.by_type}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dist.by_type.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 16px' },
  muted: { color: '#94A3B8', fontSize: 14 },
};
