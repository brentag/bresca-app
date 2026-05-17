import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Archive, Users, Menu, Settings, LogOut } from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import { useTheme, themeColors } from '../lib/theme';
import { useIsDesktop } from '../lib/responsive';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import UnifiedAssistant from './UnifiedAssistant';

const NAV = [
  { to: '/app/home',   label: 'Inicio',  Icon: Home },
  { to: '/app/vault',  label: 'Vault',   Icon: Archive },
  { to: '/app/family', label: 'Familia', Icon: Users },
  { to: '/app/menu',   label: 'Menú',    Icon: Menu, showDot: true },
];

export default function Layout() {
  const { unreadCount } = useNotifications();
  const { isDark } = useTheme();
  const t = themeColors(isDark);
  const isDesktop = useIsDesktop();
  const { user } = useSession();
  const nav = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navBg     = isDark ? '#0F172A' : '#fff';
  const navBorder = isDark ? '#1E293B' : '#E2E8F0';

  async function logout() {
    await supabase.auth.signOut();
    nav('/welcome', { replace: true });
  }

  /* ── DESKTOP ── */
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100dvh', background: t.bg }}>

        {/* Sidebar */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: t.card,
          borderRight: `1px solid ${t.border}`,
          overflow: 'hidden',
          zIndex: 10,
        }}>

          {/* Brand */}
          <div style={{ padding: '22px 20px 16px', borderBottom: `1px solid ${t.border}` }}>
            <img
              src={isDark ? '/logo-horizontal-negative.png' : '/logo-horizontal-bicolor.png'}
              alt="Bresca"
              style={{ height: 28, objectFit: 'contain', maxWidth: '100%', display: 'block' }}
            />
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {NAV.map(({ to, label, Icon, showDot }) => (
              <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div
                    onMouseEnter={() => setHoveredItem(to)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      cursor: 'pointer',
                      background: isActive
                        ? 'rgba(0,200,122,0.1)'
                        : hoveredItem === to
                          ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                          : 'transparent',
                      color: isActive ? '#00C87A' : t.textSub,
                      transition: 'background 150ms ease-out, color 150ms ease-out',
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                      {showDot && unreadCount > 0 && (
                        <span style={{
                          position: 'absolute', top: -3, right: -4,
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#EF4444',
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: isActive ? 600 : 400,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {label}
                    </span>
                    {showDot && unreadCount > 0 && (
                      <span style={{
                        marginLeft: 'auto', minWidth: 20, height: 20,
                        borderRadius: 10, background: '#EF4444',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px',
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom: settings + user + logout */}
          <div style={{ padding: '12px', borderTop: `1px solid ${t.border}` }}>
            <NavLink to="/app/settings" style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div
                  onMouseEnter={() => setHoveredItem('settings')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                    background: isActive
                      ? 'rgba(0,200,122,0.1)'
                      : hoveredItem === 'settings'
                        ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                        : 'transparent',
                    color: isActive ? '#00C87A' : t.textSub,
                    transition: 'background 150ms ease-out',
                  }}
                >
                  <Settings size={20} strokeWidth={1.8} />
                  <span style={{ fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>Configuración</span>
                </div>
              )}
            </NavLink>
            {user?.email && (
              <div style={{ padding: '6px 12px', marginBottom: 2 }}>
                <p style={{
                  fontSize: 12, color: t.textMuted,
                  fontFamily: "'Space Grotesk', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                }}>
                  {user.email}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              onMouseEnter={() => setHoveredItem('logout')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, background: hoveredItem === 'logout'
                  ? 'rgba(239,68,68,0.08)' : 'none',
                border: 'none', cursor: 'pointer', color: '#EF4444',
                transition: 'background 150ms ease-out',
              }}
            >
              <LogOut size={20} strokeWidth={1.8} />
              <span style={{ fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, height: '100dvh', overflowY: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>

        <UnifiedAssistant />
      </div>
    );
  }

  /* ── MOBILE ── */
  return (
    <div style={{ minHeight: '100dvh', background: t.bg }}>
      <main style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <Outlet />
      </main>
      <UnifiedAssistant />
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
        backgroundColor: navBg,
        borderTop: `1px solid ${navBorder}`,
      }}>
        <span style={{
          position: 'absolute', top: 3, right: 6,
          fontSize: 8, color: isDark ? '#334155' : '#E2E8F0',
          fontFamily: 'monospace', userSelect: 'none', pointerEvents: 'none', zIndex: 1,
        }}>
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
