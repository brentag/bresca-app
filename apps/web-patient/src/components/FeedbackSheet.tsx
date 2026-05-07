import { useState } from 'react';
import { X } from 'lucide-react';
import { saveFeedback } from '../lib/saveFeedback';

interface Props {
  userId: string;
  studyType: string;
  category: string;
  onDone: () => void;
}

const STARS = [1, 2, 3, 4, 5];
const LABELS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export default function FeedbackSheet({ userId, studyType, category, onDone }: Props) {
  const [rating, setRating]   = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);

  async function submit() {
    setSaving(true);
    await saveFeedback(userId, 'post_ocr', rating ?? undefined, comment || undefined, {
      study_type: studyType,
      category,
    });
    onDone();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        animation: 'slideUp 220ms ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* Handle + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2E8F0', margin: '0 auto' }} />
          <button
            onClick={onDone}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, position: 'absolute', right: 20, top: 20 }}
          >
            <X size={20} color="#94A3B8" />
          </button>
        </div>

        <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
          ¿Qué tan precisa fue la lectura?
        </p>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
          Tu respuesta nos ayuda a mejorar el motor de IA.
        </p>

        {/* Star rating */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          {STARS.map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 36, lineHeight: 1,
                opacity: rating === null || rating === s ? 1 : 0.3,
                transform: rating === s ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 150ms ease',
              }}
            >
              ⭐
            </button>
          ))}
        </div>
        {rating !== null && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#00C87A', fontWeight: 600, marginBottom: 16 }}>
            {LABELS[rating - 1]}
          </p>
        )}

        {/* Optional comment */}
        {rating !== null && rating <= 3 && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="¿Qué dato estaba mal? (opcional)"
            rows={2}
            style={{
              width: '100%', borderRadius: 12, border: '1px solid #E2E8F0',
              padding: '10px 14px', fontSize: 16, color: '#0F172A',
              resize: 'none', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', marginBottom: 16,
            }}
          />
        )}

        {/* Actions */}
        <button
          onClick={submit}
          disabled={rating === null || saving}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none',
            background: rating !== null ? '#00C87A' : '#E2E8F0',
            color: rating !== null ? '#fff' : '#94A3B8',
            fontSize: 15, fontWeight: 700, cursor: rating !== null ? 'pointer' : 'default',
            marginBottom: 10, transition: 'all 200ms ease',
          }}
        >
          {saving ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          onClick={onDone}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: 8 }}
        >
          Omitir
        </button>
      </div>
    </div>
  );
}
