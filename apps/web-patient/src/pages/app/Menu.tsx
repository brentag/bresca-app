import { useNavigate } from 'react-router-dom';
import { User, Shield, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';

export default function Menu() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();

  async function logout() {
    await supabase.auth.signOut();
    nav('/welcome', { replace: true });
  }

  const items = [
    { icon: <User size={20} color="#64748B" />, label: 'Mi perfil', sub: profile?.display_name ?? '', action: () => {} },
    { icon: <Shield size={20} color="#64748B" />, label: 'Centro de consentimiento', sub: 'Gestioná tus permisos', action: () => nav('/app/consent') },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Menú</h1>
      {user?.email && <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>{user.email}</p>}

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: 24 }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', textAlign: 'left', minHeight: 62 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{item.label}</p>
              {item.sub && <p style={{ fontSize: 12, color: '#94A3B8' }}>{item.sub}</p>}
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </button>
        ))}
      </div>

      <button
        onClick={logout}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, cursor: 'pointer', minHeight: 62 }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={20} color="#EF4444" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}>Cerrar sesión</span>
      </button>
    </div>
  );
}
