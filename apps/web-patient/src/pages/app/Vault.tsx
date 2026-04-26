import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { CATEGORIES, type CategoryFilter } from '../../lib/vault';
import { StudyCard, StudyCardSkeleton } from '../../components/StudyCard';
import { CategoryChip } from '../../components/CategoryChip';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function Vault() {
  const nav = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from('studies').select('*').eq('profile_id', profile.id).order('study_date', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    q.then(({ data }) => { if (isMounted.current) { setStudies(data ?? []); setLoading(false); } });
  }, [profile?.id, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 16px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Mi Vault</h1>
        <button
          onClick={() => nav('/app/vault/upload')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
        >
          <Plus size={16} strokeWidth={2.5} /> Subir
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 12px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={filter === cat.id} onClick={() => setFilter(cat.id)} />
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px 32px' }}>
        {profileLoading || loading
          ? Array.from({ length: 4 }).map((_, i) => <StudyCardSkeleton key={i} />)
          : studies.length === 0
            ? <EmptyState onUpload={() => nav('/app/vault/upload')} />
            : studies.map(s => <StudyCard key={s.id} study={s} onClick={() => nav(`/app/vault/${s.id}`)} />)
        }
      </div>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🗂</span>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Tu vault está vacío</h3>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>Subí tu primer estudio médico y quedará guardado de forma segura.</p>
      <button onClick={onUpload} style={{ marginTop: 8, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
        Subir estudio
      </button>
    </div>
  );
}
