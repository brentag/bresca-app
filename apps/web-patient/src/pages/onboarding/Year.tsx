import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { ProgressDots } from './ProgressDots';
import { wrap, title, sub, input, btn, skip, err } from './_styles';

export default function Year() {
  const nav = useNavigate();
  const { user } = useSession();
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const y = parseInt(year);
    if (year && (isNaN(y) || y < 1900 || y > new Date().getFullYear())) {
      setError('Ingresá un año válido.'); return;
    }
    setLoading(true);
    if (year) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
      if (profile) await supabase.from('profiles').update({ birth_year: y }).eq('id', profile.id);
    }
    setLoading(false);
    nav('/onboarding/conditions');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={1} total={4} />
      <h2 style={title}>¿Cuál es tu año de nacimiento?</h2>
      <p style={sub}>Opcional — para personalizar el Copilot.</p>
      <input value={year} onChange={e => setYear(e.target.value)} type="number" inputMode="numeric" placeholder="ej. 1985" style={input} autoFocus />
      {error && <p style={err}>{error}</p>}
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
      <button onClick={() => nav('/onboarding/conditions')} style={skip}>Saltar</button>
    </div>
  );
}
