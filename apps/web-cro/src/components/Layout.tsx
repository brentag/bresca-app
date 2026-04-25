import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'dashboard' | 'patients' | 'studies' | 'matching';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: '📊' },
  { id: 'patients',  label: 'Pacientes',  icon: '👥' },
  { id: 'studies',   label: 'Estudios',   icon: '🧪' },
  { id: 'matching',  label: 'Matching',   icon: '🎯' },
];

export default function Layout({ tab, onTab, children }: { tab: Tab; onTab: (t: Tab) => void; children: ReactNode }) {
  return (
    <div style={s.root}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.logoMark} />
          <div>
            <div style={s.brandName}>bresca</div>
            <div style={s.brandBadge}>Panel CRO</div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map((item) => (
            <button
              key={item.id}
              style={{ ...s.navItem, ...(tab === item.id ? s.navItemActive : {}) }}
              onClick={() => onTab(item.id)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button style={s.signOut} onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main style={s.main}>{children}</main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', minHeight: '100vh', background: '#F7F9FC', fontFamily: 'system-ui, -apple-system, sans-serif' },
  sidebar: { width: 220, background: '#fff', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 4, flexShrink: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 28px' },
  logoMark: { width: 32, height: 32, borderRadius: 9, background: '#00C87A', flexShrink: 0 },
  brandName: { fontSize: 16, fontWeight: 700, color: '#0F172A' },
  brandBadge: { fontSize: 10, fontWeight: 700, color: '#00A663', textTransform: 'uppercase', letterSpacing: 0.5 },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#64748B', fontWeight: 500, textAlign: 'left', width: '100%' },
  navItemActive: { background: '#F0FDF9', color: '#00A663', fontWeight: 600 },
  navIcon: { fontSize: 16 },
  signOut: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#94A3B8', padding: '10px 12px', textAlign: 'left' },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
};
