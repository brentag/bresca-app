import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Archive, MessageCircle, Users, Menu } from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import { useTheme } from '../lib/theme';

const NAV = [
  { to: '/app/home',    label: 'Inicio',    Icon: Home },
  { to: '/app/vault',   label: 'Vault',     Icon: Archive },
  { to: '/app/copilot', label: 'Asistente', Icon: MessageCircle },
  { to: '/app/family',  label: 'Familia',   Icon: Users },
  { to: '/app/menu',    label: 'Menú',      Icon: Menu, showDot: true },
];

export default function Layout() {
  const { unreadCount } = useNotifications();
  const { isDark } = useTheme();

  const navBg    = isDark ? '#0F172A' : '#fff';
  const navBorder = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: isDark ? '#0F172A' : '#F7F9FC' }}>
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <Outlet />
      </main>
      <nav style={{ ...navStyle, backgroundColor: navBg, borderTop: `1px solid ${navBorder}` }}>
        <span style={{ position: 'absolute', top: 3, right: 6, fontSize: 8, color: isDark ? '#334155' : '#E2E8F0', fontFamily: 'monospace', userSelect: 'none', pointerEvents: 'none', zIndex: 1 }}>
          {__BUILD_VERSION__}
        </span>
        {NAV.map(({ to, label, Icon, showDot }) => (
          <NavLink key={to} to={to} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={itemStyle(isActive, isDark)}>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {showDot && unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -3, right: -4,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#EF4444',
                      border: `2px solid ${navBg}`,
                    }} />
                  )}
                </div>
                <span style={labelStyle(isActive, isDark)}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  display: 'flex',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  zIndex: 100,
};

const itemStyle = (active: boolean, isDark: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 56, gap: 3, padding: '8px 0',
  color: active ? '#00C87A' : (isDark ? '#475569' : '#94A3B8'),
  transition: 'color 150ms ease-out',
});

const labelStyle = (active: boolean, isDark: boolean): React.CSSProperties => ({
  fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif",
  color: active ? '#00C87A' : (isDark ? '#475569' : '#94A3B8'),
});
