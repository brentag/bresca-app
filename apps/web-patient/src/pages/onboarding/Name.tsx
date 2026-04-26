import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { ProgressDots } from './ProgressDots';
import { wrap, title, sub, input, btn, err } from './_styles';

export default function Name() {
  const nav = useNavigate();
  const { user } = useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Ingresá tu nombre.'); return; }
    setLoading(true);
    const { error: e } = await supabase.from('profiles').insert({ user_id: user!.id, display_name: name.trim() });
    setLoading(false);
    if (e) { setError('Error al guardar. Intentá de nuevo.'); return; }
    nav('/onboarding/year');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={0} total={4} />
      <h2 style={title}>¿Cómo te llamás?</h2>
      <p style={sub}>Solo para personalizar tu experiencia.</p>
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Tu nombre" autoFocus style={input} />
      {error && <p style={err}>{error}</p>}
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
    </div>
  );
}
