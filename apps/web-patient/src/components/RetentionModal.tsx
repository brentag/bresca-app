import { useState } from 'react';
import { X } from 'lucide-react';
import { saveFeedback } from '../lib/saveFeedback';

interface Props {
  userId: string;
  onDone: () => void;
}

const OPTIONS = [
  { value: 1, label: 'Muy decepcionado/a',        emoji: '😢' },
  { value: 2, label: 'Algo decepcionado/a',        emoji: '😕' },
  { value: 3, label: 'No tan decepcionado/a',      emoji: '😐' },
];

export default function RetentionModal({ userId, onDone }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment]   = useState('');
  const [saving, setSaving]     = useState(false);

  async function submit() {
    setSaving(true);
    await saveFeedback(userId, 'retention_check', selected ?? undefined, comment || undefined);
    onDone();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: '#fff',
        borderRadius: 20, padding: '24px',
        animation: 'fadeIn 200ms ease',
      }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }`}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>💊</div>
          <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#94A3B8" />
          </button>
        </div>

        <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
          Una pregunta rápida
        </p>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
          ¿Qué tan decepcionado/a te sentirías si no pudieras usar Bresca mañana?
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 12, border: 'none',
                background: selected === opt.value ? 'rgba(0,200,122,0.08)' : '#F7F9FC',
                outline: selected === opt.value ? '2px solid #00C87A' : '2px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 150ms ease',
              }}
            >
              <span style={{ fontSize: 22 }}>{opt.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: selected === opt.value ? 600 : 400, color: '#0F172A' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Optional comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="¿Cuál es la función que más usás? (opcional)"
          rows={2}
          style={{
            width: '100%', borderRadius: 12, border: '1px solid #E2E8F0',
            padding: '10px 14px', fontSize: 16, color: '#0F172A',
            resize: 'none', outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit', marginBottom: 16,
          }}
        />

        <button
          onClick={submit}
          disabled={selected === null || saving}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none',
            background: selected !== null ? '#00C87A' : '#E2E8F0',
            color: selected !== null ? '#fff' : '#94A3B8',
            fontSize: 15, fontWeight: 700,
            cursor: selected !== null ? 'pointer' : 'default',
            transition: 'all 200ms ease',
          }}
        >
          {saving ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
