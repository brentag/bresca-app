import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getStats } from '../lib/api';

type Stats = Awaited<ReturnType<typeof getStats>>;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setError('Error al cargar stats. ¿Está corriendo el API?'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = stats
    ? Object.entries(stats.studies_by_category).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div style={s.page}>
      <h1 style={s.title}>Dashboard</h1>

      {loading && <p style={s.muted}>Cargando…</p>}
      {error && <div style={s.errorBanner}>{error}</div>}

      {stats && (
        <>
          <div style={s.cards}>
            <StatCard label="Pacientes con datos" value={stats.total_patients} icon="👥" color="#00C87A" />
            <StatCard label="Estudios confirmados" value={stats.total_studies} icon="🧪" color="#3B82F6" />
            <StatCard label="Consentimientos activos" value={stats.active_consents} icon="✅" color="#8B5CF6" />
            <StatCard
              label="Categoría principal"
              value={
                chartData.length
                  ? chartData.sort((a, b) => b.value - a.value)[0].name
                  : '—'
              }
              icon="🏆"
              color="#F59E0B"
              isText
            />
          </div>

          <div style={s.chartCard}>
            <h2 style={s.chartTitle}>Estudios por categoría</h2>
            {chartData.length === 0 ? (
              <p style={s.muted}>Sin datos todavía.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }}
                    formatter={(v) => [`${v} estudios`, '']}
                  />
                  <Bar dataKey="value" fill="#00C87A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {stats.total_patients === 0 && (
            <div style={s.infoBanner}>
              <strong>Nota:</strong> La vista de pacientes sólo muestra cohortes con ≥ 5 pacientes con consentimiento de investigación. Los datos aparecerán cuando haya suficiente volumen.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, isText }: { label: string; value: number | string; icon: string; color: string; isText?: boolean }) {
  return (
    <div style={c.card}>
      <div style={{ ...c.iconBox, background: color + '18' }}>
        <span style={c.icon}>{icon}</span>
      </div>
      <div style={isText ? { ...c.value, fontSize: 18 } : c.value}>{value}</div>
      <div style={c.label}>{label}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 24px' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  chartCard: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.05)', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 16px' },
  muted: { color: '#94A3B8', fontSize: 14 },
  errorBanner: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 14, marginBottom: 16 },
  infoBanner: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', color: '#1D4ED8', fontSize: 13 },
};

const c: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  value: { fontSize: 28, fontWeight: 700, color: '#0F172A' },
  label: { fontSize: 13, color: '#64748B' },
};
