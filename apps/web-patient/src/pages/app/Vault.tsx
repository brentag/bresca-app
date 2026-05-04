import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { CATEGORIES, type CategoryFilter } from '../../lib/vault';
import { StudyCard, StudyCardSkeleton } from '../../components/StudyCard';
import { CategoryChip } from '../../components/CategoryChip';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];
type DraftStatus = 'pending' | 'processing' | 'done' | 'completed' | 'error' | 'failed';
type PendingDraft = { id: string; status: DraftStatus; study_type: string | null; category: string | null };

const DONE: DraftStatus[] = ['done', 'completed'];
const IN_PROGRESS: DraftStatus[] = ['pending', 'processing'];

export default function Vault() {
  const nav = useNavigate();
  const location = useLocation();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  // Carga estudios
  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from('studies').select('*').eq('profile_id', profile.id).order('study_date', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    q.then(({ data }) => { if (isMounted.current) { setStudies(data ?? []); setLoading(false); } });
  }, [profile?.id, filter]);

  // Carga drafts pendientes + se suscribe a actualizaciones
  useEffect(() => {
    if (!profile) return;

    // Draft recién encolado desde Upload (viene en navigation state)
    const navState = location.state as { pendingDraftId?: string } | null;

    supabase
      .from('study_drafts')
      .select('id,status,study_type,category')
      .eq('profile_id', profile.id)
      .in('status', [...IN_PROGRESS, ...DONE])
      .then(({ data }) => {
        if (!isMounted.current) return;
        let drafts = (data ?? []) as PendingDraft[];
        // Si hay un draft recién encolado que aún no apareció en la query, añadirlo optimistamente
        if (navState?.pendingDraftId && !drafts.find(d => d.id === navState.pendingDraftId)) {
          drafts = [{ id: navState.pendingDraftId, status: 'pending', study_type: null, category: null }, ...drafts];
        }
        setPendingDrafts(drafts);
      });

    const channel = supabase
      .channel(`vault-drafts-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_drafts', filter: `profile_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as PendingDraft;
          setPendingDrafts(prev => {
            const exists = prev.find(d => d.id === updated.id);
            if (exists) return prev.map(d => d.id === updated.id ? updated : d);
            return [...prev, updated];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  function reviewDraft(draftId: string) {
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    nav('/app/vault/upload', { state: { mode: 'review', draftId } });
  }

  function dismissDraft(draftId: string) {
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    supabase.from('study_drafts').delete().eq('id', draftId);
  }

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

      {/* Drafts pendientes */}
      {pendingDrafts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px 4px' }}>
          {pendingDrafts.map(d => (
            <PendingDraftCard
              key={d.id}
              draft={d}
              onReview={() => reviewDraft(d.id)}
              onDismiss={() => dismissDraft(d.id)}
            />
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px 32px' }}>
        {profileLoading || loading
          ? Array.from({ length: 4 }).map((_, i) => <StudyCardSkeleton key={i} />)
          : studies.length === 0 && pendingDrafts.length === 0
            ? <EmptyState onUpload={() => nav('/app/vault/upload')} />
            : studies.map(s => <StudyCard key={s.id} study={s} onClick={() => nav(`/app/vault/${s.id}`)} />)
        }
      </div>
    </div>
  );
}

function PendingDraftCard({
  draft,
  onReview,
  onDismiss,
}: {
  draft: PendingDraft;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const isDone = DONE.includes(draft.status);

  return (
    <div style={{
      background: isDone ? '#F0FDF4' : '#F8FAFC',
      border: `1.5px solid ${isDone ? '#86EFAC' : '#E2E8F0'}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Ícono / spinner */}
      {isDone ? (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
          ✓
        </div>
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #00C87A', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
      )}

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
          {isDone ? '¡Análisis listo!' : 'Analizando estudio…'}
        </p>
        <p style={{ fontSize: 12, color: '#64748B' }}>
          {isDone
            ? 'Revisá los datos extraídos antes de guardar'
            : 'La IA está procesando el documento en segundo plano'}
        </p>
      </div>

      {/* Acción */}
      {isDone ? (
        <button
          onClick={onReview}
          style={{ background: '#00C87A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Revisá →
        </button>
      ) : (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
        >
          Cancelar
        </button>
      )}
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
