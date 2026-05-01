import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Archive, MessageCircle, Users, Menu } from 'lucide-react';

const NAV = [
  { to: '/app/home',    label: 'Inicio',    Icon: Home },
  { to: '/app/vault',   label: 'Vault',     Icon: Archive },
  { to: '/app/copilot', label: 'Asistente', Icon: MessageCircle },
  { to: '/app/family',  label: 'Familia',   Icon: Users },
  { to: '/app/menu',    label: 'Menú',      Icon: Menu },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <Outlet />
      </main>
      <nav style={navStyle}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={itemStyle(isActive)}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={labelStyle(isActive)}>{label}</span>
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
  display: 'flex', backgroundColor: '#fff',
  borderTop: '1px solid #E2E8F0',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  zIndex: 100,
};

const itemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 56, gap: 3, padding: '8px 0',
  color: active ? '#00C87A' : '#94A3B8',
  transition: 'color 150ms ease-out',
});

const labelStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif",
});
