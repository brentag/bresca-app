import { Users } from 'lucide-react';

export default function Family() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 32, textAlign: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(75,110,245,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Users size={34} color="#4B6EF5" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Familia</h2>
      <p style={{ fontSize: 14, color: '#64748B', maxWidth: 260, lineHeight: 1.6 }}>
        Próximamente podrás gestionar el historial de tu familia desde un solo lugar.
      </p>
      <span style={{ fontSize: 12, background: '#EFF6FF', color: '#4B6EF5', padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>
        Próximamente
      </span>
    </div>
  );
}
