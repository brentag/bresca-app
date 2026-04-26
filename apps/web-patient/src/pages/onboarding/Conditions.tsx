import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { ProgressDots } from './ProgressDots';
import { wrap, title, sub, btn, skip } from './_styles';

const OPTIONS = ['Diabetes', 'Hipertensión', 'Oncología', 'Cardiopatía', 'Ninguna'];

export default function Conditions() {
  const nav = useNavigate();
  const { user } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(c: string) {
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function save() {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
    if (profile) await supabase.from('profiles').update({ conditions: selected }).eq('id', profile.id);
    setLoading(false);
    nav('/onboarding/consent');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={2} total={4} />
      <h2 style={title}>Condiciones de salud</h2>
      <p style={sub}>Opcional — ayuda al Copilot a contextualizar mejor.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
        {OPTIONS.map(c => (
          <button
            key={c}
            onClick={() => toggle(c)}
            style={{
              padding: '10px 18px', borderRadius: 100, minHeight: 44,
              border: `1.5px solid ${selected.includes(c) ? '#00C87A' : '#E2E8F0'}`,
              background: selected.includes(c) ? 'rgba(0,200,122,0.08)' : 'transparent',
              color: selected.includes(c) ? '#00C87A' : '#64748B',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >{c}</button>
        ))}
      </div>
      <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#166534' }}>
        Tu información es privada. Nunca la compartimos sin tu consentimiento.
      </div>
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
      <button onClick={() => nav('/onboarding/consent')} style={skip}>Saltar</button>
    </div>
  );
}
