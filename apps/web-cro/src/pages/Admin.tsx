import { useEffect, useState, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { getMetrics, getLive } from '../lib/api';

type Period = 'day' | 'week' | 'month';

interface KpiMetric {
  current: number;
  previous: number;
  pct_change: number | null;
}

interface KpiData {
  period: Period;
  new_users: KpiMetric;
  uploads: KpiMetric;
  copilot_queries: KpiMetric;
  qr_scans: KpiMetric;
  ocr_success_rate: KpiMetric;
}

interface LiveData {
  nodes: Record<string, number>;
  as_of: string;
}

const NODE_LABELS: Record<string, string> = {
  home:        'Inicio',
  vault:       'Historial',
  upload:      'Cargar',
  copilot:     'Copilot',
  qr:          'QR',
  family:      'Familia',
  cro:         'Panel CRO',
  api:         'API',
  onboarding:  'Onboarding',
};

const NODE_COLOR = '#00C87A';
const ALL_NODES = ['home', 'vault', 'upload', 'copilot', 'qr', 'family', 'cro', 'api'];

const KPI_LABELS: Record<keyof Omit<KpiData, 'period'>, string> = {
  new_users:        'Usuarios nuevos',
  uploads:          'Estudios subidos',
  copilot_queries:  'Consultas Copilot',
  qr_scans:         'Scans de QR',
  ocr_success_rate: 'Tasa éxito OCR',
};

const PERIOD_LABELS: Record<Period, string> = {
  day:   'Hoy',
  week:  'Esta semana',
  month: 'Este mes',
};

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={s.badgeNeutral}>sin datos prev.</span>;
  const positive = value >= 0;
  return (
    <span style={{ ...s.badge, background: positive ? '#F0FDF9' : '#FFF5F5', color: positive ? '#00A663' : '#DC2626' }}>
      {positive ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ label, metric, isRate }: { label: string; metric: KpiMetric; isRate?: boolean }) {
  return (
    <div style={s.kpiCard}>
      <div style={s.kpiLabel}>{label}</div>
      <div style={s.kpiValue}>
        {isRate ? `${metric.current}%` : metric.current.toLocaleString('es-AR')}
      </div>
      <div style={s.kpiFooter}>
        <PctBadge value={metric.pct_change} />
        <span style={s.kpiPrev}>
          vs anterior: {isRate ? `${metric.previous}%` : metric.previous.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [period, setPeriod] = useState<Period>('day');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState(false);
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveError, setLiveError] = useState(false);

  // Obtener sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  const isAdmin = session?.user?.email?.endsWith('@bresca.io') ?? false;

  // Carga inicial del live snapshot + Realtime subscription
  const fetchLive = useCallback(async () => {
    try {
      const data = await getLive();
      setLive(data);
      setLiveError(false);
    } catch {
      setLiveError(true);
    }
  }, []);

  // FE-A5: bursts de eventos (ej. 50 INSERTs en 200ms al cargar varios users
  // simultáneamente) provocaban N refetch del endpoint /admin/live. Debounce
  // 5s coalesce todo en una sola request — el panel sigue sintiéndose live
  // pero no martilla el API en cold start.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLive();

    const channel = supabase
      .channel('admin-events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => { fetchLive(); }, 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [isAdmin, fetchLive]);

  // Carga de KPIs al cambiar período
  useEffect(() => {
    if (!isAdmin) return;
    setKpisLoading(true);
    setKpisError(false);
    getMetrics(period)
      .then((data) => { setKpis(data); })
      .catch(() => { setKpisError(true); })
      .finally(() => { setKpisLoading(false); });
  }, [isAdmin, period]);

  // --- Estados de carga/error/auth ---

  if (session === undefined) {
    return <div style={s.center}><Spinner /></div>;
  }

  if (!session) {
    return <div style={s.center}><p style={s.dim}>Iniciá sesión para acceder al monitoreo.</p></div>;
  }

  if (!isAdmin) {
    return (
      <div style={s.center}>
        <p style={s.dim}>Acceso restringido a cuentas <strong>@bresca.io</strong>.</p>
      </div>
    );
  }

  // --- Datos para el gráfico ---
  const chartData = ALL_NODES.map((node) => ({
    node,
    label: NODE_LABELS[node] ?? node,
    count: live?.nodes[node] ?? 0,
  }));

  const kpiKeys = ['new_users', 'uploads', 'copilot_queries', 'qr_scans', 'ocr_success_rate'] as const;

  return (
    <div style={s.page}>

      {/* ── SECCIÓN 1: Gráfico actividad live ── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <div>
            <h2 style={s.sectionTitle}>Actividad en tiempo real</h2>
            <p style={s.sectionSub}>Usuarios activos por nodo — últimos 5 minutos</p>
          </div>
          <div style={s.liveDot}>
            <span style={s.dot} />
            <span style={s.liveLabel}>LIVE</span>
          </div>
        </div>

        {liveError ? (
          <div style={s.errorBox}>No se pudo cargar la actividad live.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 32, top: 8, bottom: 8 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 13, fill: '#0F172A' }}
                  width={88}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v)} usuario${Number(v) !== 1 ? 's' : ''}`, 'Activos']}
                  contentStyle={{ borderRadius: 10, fontSize: 13, border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.node}
                      fill={entry.count > 0 ? NODE_COLOR : '#E2E8F0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {live && (
              <p style={s.asOf}>
                Última actualización: {new Date(live.as_of).toLocaleTimeString('es-AR')}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── SECCIÓN 2: KPI cards acumulados ── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <div>
            <h2 style={s.sectionTitle}>KPIs acumulados</h2>
            <p style={s.sectionSub}>Comparación con el período anterior</p>
          </div>
          <div style={s.periodToggle}>
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                style={{ ...s.periodBtn, ...(period === p ? s.periodBtnActive : {}) }}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {kpisLoading ? (
          <div style={s.kpiGrid}>
            {kpiKeys.map((k) => (
              <div key={k} style={{ ...s.kpiCard, ...s.skeleton }} />
            ))}
          </div>
        ) : kpisError ? (
          <div style={s.errorBox}>No se pudieron cargar los KPIs.</div>
        ) : kpis ? (
          <div style={s.kpiGrid}>
            {kpiKeys.map((k) => (
              <KpiCard
                key={k}
                label={KPI_LABELS[k]}
                metric={kpis[k]}
                isRate={k === 'ocr_success_rate'}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #00C87A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
  );
}

const s: Record<string, React.CSSProperties> = {
  page:           { display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900 },
  center:         { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  dim:            { color: '#94A3B8', fontSize: 14 },

  section:        { background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', padding: '28px 28px 20px' },
  sectionHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  sectionTitle:   { fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 },
  sectionSub:     { fontSize: 13, color: '#94A3B8', marginTop: 4, fontWeight: 400 },

  liveDot:        { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#F0FDF9', borderRadius: 20 },
  dot:            { width: 8, height: 8, borderRadius: '50%', background: '#00C87A', boxShadow: '0 0 0 2px #bbf7d0', animation: 'pulse 1.5s infinite' },
  liveLabel:      { fontSize: 11, fontWeight: 700, color: '#00A663', letterSpacing: 1 },
  asOf:           { fontSize: 11, color: '#94A3B8', marginTop: 12, textAlign: 'right' as const },

  periodToggle:   { display: 'flex', gap: 4, background: '#F8FAFC', borderRadius: 10, padding: 4 },
  periodBtn:      { border: 'none', background: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontSize: 13, color: '#64748B', fontWeight: 500 },
  periodBtnActive:{ background: '#fff', color: '#00A663', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },

  kpiGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 },
  kpiCard:        { background: '#F8FAFC', borderRadius: 12, padding: '18px 16px', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 6 },
  kpiLabel:       { fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  kpiValue:       { fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1 },
  kpiFooter:      { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginTop: 4 },
  kpiPrev:        { fontSize: 11, color: '#94A3B8' },

  badge:          { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 },
  badgeNeutral:   { fontSize: 11, color: '#94A3B8', background: '#F1F5F9', padding: '2px 7px', borderRadius: 20 },

  skeleton:       { minHeight: 108, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s infinite' },
  errorBox:       { background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 10, padding: '16px 20px', fontSize: 13, color: '#DC2626' },
};
