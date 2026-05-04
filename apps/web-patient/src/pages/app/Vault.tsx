import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
const FAILED: DraftStatus[] = ['error', 'failed'];

export default function Vault() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const isMounted = useRef(true);

  // profileId activo: el de la URL (?p=) o el del usuario
  const familyProfileId = searchParams.get('p');
  const activeProfileId = familyProfileId ?? profile?.id;

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  // Si se está viendo un perfil familiar, cargar su nombre
  useEffect(() => {
    if (!familyProfileId) { setFamilyName(null); return; }
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', familyProfileId)
      .single()
      .then(({ data }) => { if (isMounted.current) setFamilyName(data?.display_name ?? null); });
  }, [familyProfileId]);

  // Carga estudios
  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    let q = supabase.from('studies').select('*').eq('profile_id', activeProfileId).order('study_date', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    q.then(({ data }) => { if (isMounted.current) { setStudies(data ?? []); setLoading(false); } });
  }, [activeProfileId, filter]);

  // Carga drafts pendientes + se suscribe a actualizaciones
  useEffect(() => {
    if (!profile) return;

    // Draft recién encolado desde Upload (viene en navigation state)
    const navState = location.state as { pendingDraftId?: string } | null;

    supabase
      .from('study_drafts')
      .select('id,status,study_type,category')
      .eq('profile_id', profile.id)
      .in('status', [...IN_PROGRESS, ...DONE, ...FAILED])
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
        {familyProfileId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => nav('/app/family')}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Familia
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
              {familyName ?? 'Cargando…'}
            </h1>
          </div>
        ) : (
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Mi Vault</h1>
        )}

        {!familyProfileId && (
          <button
            onClick={() => nav('/app/vault/upload')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
          >
            <Plus size={16} strokeWidth={2.5} /> Subir
          </button>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 12px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={filter === cat.id} onClick={() => setFilter(cat.id)} />
        ))}
      </div>

      {/* Drafts pendientes (solo en vault propio) */}
      {!familyProfileId && pendingDrafts.length > 0 && (
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
          : studies.length === 0 && (familyProfileId || pendingDrafts.length === 0)
            ? <EmptyState
                message={familyProfileId ? `${familyName ?? 'Este perfil'} no tiene estudios todavía.` : undefined}
                onUpload={familyProfileId ? undefined : () => nav('/app/vault/upload')}
              />
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
  const isDone   = DONE.includes(draft.status);
  const isFailed = FAILED.includes(draft.status);

  if (isFailed) {
    return (
      <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
          ✕
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 2 }}>
            No pudimos analizar el documento
          </p>
          <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 10 }}>
            El análisis con IA falló. Podés ingresar los datos a mano o descartar.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onReview}
              style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Ingresar datos →
            </button>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 10, color: '#EF4444', fontSize: 13, cursor: 'pointer', padding: '8px 12px' }}
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      {isDone ? (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
          ✓
        </div>
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #00C87A', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
      )}

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

function EmptyState({ message, onUpload }: { message?: string; onUpload?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🗂</span>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
        {message ? 'Sin estudios' : 'Tu vault está vacío'}
      </h3>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
        {message ?? 'Subí tu primer estudio médico y quedará guardado de forma segura.'}
      </p>
      {onUpload && (
        <button onClick={onUpload} style={{ marginTop: 8, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
          Subir estudio
        </button>
      )}
    </div>
  );
}
