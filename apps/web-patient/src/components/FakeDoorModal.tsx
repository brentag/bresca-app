import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function FakeDoorModal({ onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360, background: '#fff',
        borderRadius: 20, padding: '28px 24px',
        animation: 'fadeIn 200ms ease', textAlign: 'center',
      }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }`}</style>

        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={20} color="#94A3B8" />
        </button>

        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>

        <p style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
          Reporte Pro — Próximamente
        </p>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 24 }}>
          Estamos trabajando en un reporte inteligente que analiza tus tendencias de salud a lo largo del tiempo.
          Ya guardamos tu interés.
        </p>

        <div style={{
          background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, marginBottom: 2 }}>¿Qué incluirá?</p>
          <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
            Tendencias por biomarcador · Alertas de valores fuera de rango · Comparativa con rangos de referencia · Exportación PDF
          </p>
        </div>

        <a
          href="mailto:founder@bresca.io?subject=Me%20interesa%20el%20Reporte%20Pro&body=Hola%2C%20me%20interesa%20el%20Reporte%20Pro.%20Av%C3%ADsame%20cuando%20est%C3%A9%20disponible."
          style={{
            display: 'block', width: '100%', height: 50, borderRadius: 14,
            background: '#00C87A', color: '#fff', textDecoration: 'none',
            fontSize: 15, fontWeight: 700, lineHeight: '50px', textAlign: 'center',
            boxSizing: 'border-box', marginBottom: 10,
          }}
        >
          Avisame cuando esté listo
        </a>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: 8 }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
