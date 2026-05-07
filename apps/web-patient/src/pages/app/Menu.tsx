import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, LogOut, ChevronRight, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { saveFeedback } from '../../lib/saveFeedback';
import FakeDoorModal from '../../components/FakeDoorModal';

export default function Menu() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const [showFakeDoor, setShowFakeDoor] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    nav('/welcome', { replace: true });
  }

  async function handleReportePro() {
    if (user) {
      await saveFeedback(user.id, 'fake_door_click', undefined, undefined, { feature: 'reporte_pro' });
    }
    setShowFakeDoor(true);
  }

  const items = [
    { icon: <User size={20} color="#64748B" />, label: 'Mi perfil',               sub: profile?.display_name ?? '',       action: () => {} },
    { icon: <Shield size={20} color="#64748B" />, label: 'Centro de privacidad', sub: 'Gestioná tus permisos',            action: () => nav('/app/consent') },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Menú</h1>
      {user?.email && <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>{user.email}</p>}

      {/* Reporte Pro — Fake Door */}
      <button
        onClick={handleReportePro}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px', background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)',
          border: '1px solid rgba(75,110,245,0.2)', borderRadius: 16,
          cursor: 'pointer', textAlign: 'left', marginBottom: 12,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={20} color="#4B6EF5" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Ver Reporte Pro</p>
          <p style={{ fontSize: 12, color: '#64748B' }}>Tendencias y análisis avanzados</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#4B6EF5', background: 'rgba(75,110,245,0.1)', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.06em' }}>
          PRÓXIMO
        </span>
      </button>

      {/* Items regulares */}
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

      {showFakeDoor && <FakeDoorModal onClose={() => setShowFakeDoor(false)} />}
    </div>
  );
}
