import { lazy, Suspense, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { generateQR } from '../../lib/api';
import { exportStudyPDF } from '../../lib/export-pdf';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';
import { CATEGORIES, categoryColor, type CategoryFilter } from '../../lib/vault';
import { StudyCard, StudyCardSkeleton, DraftStudyCard } from '../../components/StudyCard';
import { CategoryChip } from '../../components/CategoryChip';
import { useIsDesktop } from '../../lib/responsive';
import type { Database } from '@bresca/shared';

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const DicomViewer = lazy(() => import('../../components/DicomViewer').then(m => ({ default: m.DicomViewer })));

type Study = Database['public']['Tables']['studies']['Row'];
type DraftStatus = 'pending' | 'processing' | 'done' | 'completed' | 'error' | 'failed';
type PendingDraft = {
  id: string;
  status: DraftStatus;
  study_type: string | null;
  category: string | null;
  ocr_score: number | null;
  created_at?: string | null;
};

const DONE: DraftStatus[] = ['done', 'completed'];
const IN_PROGRESS: DraftStatus[] = ['pending', 'processing'];
const FAILED: DraftStatus[] = ['error', 'failed'];

export default function Vault() {
  useTrackNode('vault');
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const nav = useNavigate();
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);  // 0-11, null = todos
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [dicomStudy, setDicomStudy] = useState<Study | null>(null);
  const isMounted = useRef(true);
  const pendingDraftsRef = useRef<PendingDraft[]>([]);

  // profileId activo: el de la URL (?p=) o el del usuario
  const familyProfileId = searchParams.get('p');
  const activeProfileId = familyProfileId ?? profile?.id;

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  useEffect(() => { pendingDraftsRef.current = pendingDrafts; }, [pendingDrafts]);

  useEffect(() => {
    if (!familyProfileId) { setFamilyName(null); return; }
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', familyProfileId)
      .single()
      .then(({ data }) => { if (isMounted.current) setFamilyName(data?.display_name ?? null); });
  }, [familyProfileId]);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    let q = supabase.from('studies').select('*').eq('profile_id', activeProfileId).order('study_date', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    q.then(({ data }) => { if (isMounted.current) { setStudies(data ?? []); setLoading(false); } });
  }, [activeProfileId, filter]);

  useEffect(() => {
    if (!activeProfileId) return;

    const navState = location.state as { pendingDraftId?: string } | null;

    supabase
      .from('study_drafts')
      .select('id,status,study_type,category,ocr_score,created_at')
      .eq('profile_id', activeProfileId)
      .in('status', [...IN_PROGRESS, ...DONE, ...FAILED])
      .then(({ data }) => {
        if (!isMounted.current) return;
        let drafts = (data ?? []) as PendingDraft[];
        if (navState?.pendingDraftId && !drafts.find(d => d.id === navState.pendingDraftId)) {
          drafts = [{ id: navState.pendingDraftId, status: 'pending', study_type: null, category: null, ocr_score: null, created_at: new Date().toISOString() }, ...drafts];
        }
        setPendingDrafts(drafts);
      });

    const channel = supabase
      .channel(`vault-drafts-${activeProfileId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_drafts', filter: `profile_id=eq.${activeProfileId}` },
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
  }, [activeProfileId]);

  // Polling fallback: por si Realtime pierde un UPDATE, refresca cada 5s mientras haya drafts en progreso.
  const inProgressIds = pendingDrafts.filter(d => IN_PROGRESS.includes(d.status)).map(d => d.id).join(',');
  useEffect(() => {
    if (!inProgressIds) return;
    const timer = setInterval(async () => {
      const current = pendingDraftsRef.current.filter(d => IN_PROGRESS.includes(d.status));
      if (!current.length) return;
      const { data } = await supabase
        .from('study_drafts')
        .select('id,status,study_type,category,ocr_score,created_at')
        .in('id', current.map(d => d.id));
      if (data?.length && isMounted.current) {
        setPendingDrafts(prev => prev.map(d => {
          const u = data.find(x => x.id === d.id);
          return u ? { ...d, ...u } as PendingDraft : d;
        }));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [inProgressIds]);

  function handleQR(studyId: string) {
    nav('/app/vault/qr', { state: { study_ids: [studyId] } });
  }

  async function handleWhatsApp(studyId: string) {
    try {
      const { token } = await generateQR([studyId], 24);
      const url = `${window.location.origin}/qr/${token}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(`Te comparto mis estudios médicos 🏥\n${url}`)}`, '_blank', 'noopener');
    } catch { /* fallo silencioso — el usuario puede usar el botón QR como alternativa */ }
  }

  function reviewDraft(draftId: string) {
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    nav('/app/vault/upload', { state: { mode: 'review', draftId } });
  }

  function dismissDraft(draftId: string) {
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    supabase.from('study_drafts').delete().eq('id', draftId);
  }

  // Auto-confirm: cuando ocr_score >= 95, el usuario confirma con un click sin
  // pasar por la pantalla de review. Crea el study + borra el draft.
  async function autoConfirmDraft(draftId: string) {
    const { data: d } = await supabase
      .from('study_drafts')
      .select('profile_id,study_type,category,study_date,lab_name,extracted_fields,storage_path,storage_paths,ocr_score')
      .eq('id', draftId)
      .single();
    if (!d) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draft = d as any;
    // S-M6: defensa en profundidad. La UI ya filtra el botón "Auto-confirmar"
    // por ocr_score >= 95, pero si llega un caller programático con score menor,
    // forzamos el flujo de review manual. NUNCA auto-confirmar datos con score bajo.
    if (typeof draft.ocr_score !== 'number' || draft.ocr_score < 95) {
      console.warn('[autoConfirmDraft] score < 95 — redirigiendo a review manual', { draftId, score: draft.ocr_score });
      reviewDraft(draftId);
      return;
    }
    const { error } = await supabase.from('studies').insert({
      profile_id:       draft.profile_id,
      study_type:       draft.study_type ?? 'Estudio clínico',
      category:         draft.category   ?? 'otro',
      study_date:       draft.study_date ?? new Date().toISOString().slice(0, 10),
      lab_name:         draft.lab_name,
      extracted_fields: draft.extracted_fields ?? {},
      confirmed:        true,
      storage_path:     draft.storage_path,
      storage_paths:    draft.storage_paths ?? [],
      ocr_score:        draft.ocr_score,
    });
    if (error) {
      // Si falla, fallback al flujo de review manual.
      reviewDraft(draftId);
      return;
    }
    setPendingDrafts(prev => prev.filter(x => x.id !== draftId));
    await supabase.from('study_drafts').delete().eq('id', draftId);
    // Recargar studies
    if (activeProfileId) {
      let q = supabase.from('studies').select('*').eq('profile_id', activeProfileId).order('study_date', { ascending: false });
      if (filter !== 'all') q = q.eq('category', filter);
      const { data } = await q;
      if (isMounted.current) setStudies(data ?? []);
    }
  }

  // Estudios del año seleccionado, agrupados por mes (para timeline navegable).
  // Cada estudio es un dot individual clickeable.
  const { availableYears, studiesThisYear } = useMemo(() => {
    const years = new Set<number>();
    const yearStudies: Study[] = [];
    for (const s of studies) {
      if (!s.study_date) continue;
      const d = new Date(s.study_date + 'T00:00:00');
      years.add(d.getFullYear());
      if (d.getFullYear() === selectedYear) yearStudies.push(s);
    }
    years.add(selectedYear);
    return { availableYears: [...years].sort((a, b) => b - a), studiesThisYear: yearStudies };
  }, [studies, selectedYear]);

  // Aplica el filtro de mes sobre los estudios ya filtrados por categoría.
  const filteredStudies = useMemo(() => {
    if (selectedMonth == null) return studies;
    return studies.filter(s => {
      if (!s.study_date) return false;
      const d = new Date(s.study_date + 'T00:00:00');
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [studies, selectedYear, selectedMonth]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 16px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        {familyProfileId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => nav('/app/family')}
              style={{ background: 'none', border: 'none', color: c.textSub, cursor: 'pointer', padding: '4px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44 }}
            >
              ← Familia
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: c.text }}>
              {familyName ?? 'Cargando…'}
            </h1>
          </div>
        ) : (
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text }}>Mi Vault</h1>
        )}

        <button
          onClick={() => nav(familyProfileId ? `/app/vault/upload?p=${familyProfileId}` : '/app/vault/upload')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
        >
          <Plus size={16} strokeWidth={2.5} /> Subir
        </button>
      </div>

      {/* Timeline del año — navegación por estudios */}
      {studies.length > 0 && (
        <YearTimeline
          year={selectedYear}
          availableYears={availableYears}
          studies={studiesThisYear}
          selectedMonth={selectedMonth}
          onSelectYear={y => { setSelectedYear(y); setSelectedMonth(null); }}
          onSelectMonth={m => setSelectedMonth(prev => prev === m ? null : m)}
          onSelectStudy={id => nav(`/app/vault/${id}`)}
          c={c}
        />
      )}

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 12px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={filter === cat.id} onClick={() => setFilter(cat.id)} />
        ))}
      </div>

      {/* Lista unificada */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
        gap: 12,
        padding: isDesktop ? '0 24px 32px' : '0 20px 32px',
      }}>
        {profileLoading || loading
          ? Array.from({ length: 4 }).map((_, i) => <StudyCardSkeleton key={i} />)
          : filteredStudies.length === 0 && pendingDrafts.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  message={
                    selectedMonth != null
                      ? `Sin estudios en ${MONTH_LABELS[selectedMonth]} ${selectedYear}.`
                      : familyProfileId ? `${familyName ?? 'Este perfil'} no tiene estudios todavía.` : undefined
                  }
                  onUpload={selectedMonth != null ? undefined : () => nav(familyProfileId ? `/app/vault/upload?p=${familyProfileId}` : '/app/vault/upload')}
                />
              </div>
            )
            : (
              <>
                {pendingDrafts.map(d => (
                  <div key={d.id} style={{ gridColumn: '1 / -1' }}>
                    <DraftStudyCard
                      draft={d}
                      onReview={() => reviewDraft(d.id)}
                      onAutoConfirm={autoConfirmDraft}
                      onDismiss={() => dismissDraft(d.id)}
                    />
                  </div>
                ))}
                {filteredStudies.map(s => (
                  <StudyCard
                    key={s.id}
                    study={s}
                    onClick={() => nav(`/app/vault/${s.id}`)}
                    onQR={() => handleQR(s.id)}
                    onWhatsApp={() => handleWhatsApp(s.id)}
                    onDicomView={() => setDicomStudy(s)}
                    onExportPDF={() => exportStudyPDF(s)}
                  />
                ))}
              </>
            )
        }
      </div>
      {dicomStudy && (
        <Suspense fallback={null}>
          <DicomViewer
            storagePaths={(dicomStudy.storage_paths as string[]) ?? [dicomStudy.storage_path ?? '']}
            onClose={() => setDicomStudy(null)}
          />
        </Suspense>
      )}
    </div>
  );
}


// Timeline horizontal: cada estudio es un dot clickeable sobre un eje
// temporal continuo (12 meses del año). Sirve como navegación — click
// en un dot abre el estudio. Click en un label de mes filtra por ese mes.
function YearTimeline({
  year,
  availableYears,
  studies,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  onSelectStudy,
  c,
}: {
  year: number;
  availableYears: number[];
  studies: Study[];
  selectedMonth: number | null;
  onSelectYear: (y: number) => void;
  onSelectMonth: (m: number) => void;
  onSelectStudy: (id: string) => void;
  c: ReturnType<typeof themeColors>;
}) {
  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();

  const positioned = useMemo(() => {
    return studies.map(s => {
      const d = new Date(s.study_date + 'T00:00:00');
      const startOfYear = new Date(year, 0, 1).getTime();
      const endOfYear   = new Date(year + 1, 0, 1).getTime();
      const pct = ((d.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100;
      return { id: s.id, pct: Math.max(0, Math.min(100, pct)), date: d, category: s.category, type: s.study_type };
    }).sort((a, b) => a.pct - b.pct);
  }, [studies, year]);

  const grouped = useMemo(() => {
    const out: { pct: number; items: typeof positioned }[] = [];
    for (const p of positioned) {
      const last = out[out.length - 1];
      if (last && p.pct - last.pct < 2.5) {
        last.items.push(p);
      } else {
        out.push({ pct: p.pct, items: [p] });
      }
    }
    return out;
  }, [positioned]);

  // Meses que tienen al menos un estudio
  const monthsWithStudies = useMemo(() => {
    const set = new Set<number>();
    for (const s of studies) {
      if (s.study_date) set.add(new Date(s.study_date + 'T00:00:00').getMonth());
    }
    return set;
  }, [studies]);

  return (
    <div style={{ padding: '0 20px 14px' }}>
      {/* Año pills + contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {availableYears.length > 1 ? (
            availableYears.map(y => (
              <button
                key={y}
                onClick={() => onSelectYear(y)}
                style={{
                  background: y === year ? '#00C87A' : 'none',
                  border: `1.5px solid ${y === year ? '#00C87A' : c.borderLight}`,
                  borderRadius: 20, fontSize: 13, fontWeight: 600,
                  color: y === year ? '#fff' : c.textMuted,
                  cursor: 'pointer', padding: '3px 10px', minHeight: 28,
                  transition: 'all 150ms',
                }}
              >{y}</button>
            ))
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{year}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: c.textMuted, letterSpacing: '0.04em' }}>
          {studies.length} {studies.length === 1 ? 'estudio' : 'estudios'}
        </span>
      </div>

      {/* Eje + dots */}
      <div style={{ position: 'relative', height: 52 }}>
        {/* Banda de mes seleccionado */}
        {selectedMonth != null && (
          <div style={{
            position: 'absolute',
            left: `${(selectedMonth / 12) * 100}%`,
            width: `${(1 / 12) * 100}%`,
            top: 0, bottom: 0,
            background: '#00C87A18',
            borderRadius: 4,
            pointerEvents: 'none',
          }} />
        )}

        {/* Tick marks de mes (11 ticks intermedios + extremos) */}
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / 12) * 100}%`,
              top: i === 0 || i === 12 ? 0 : (i % 3 === 0 ? 14 : 17),
              width: 1,
              height: i === 0 || i === 12 ? 0 : (i % 3 === 0 ? 10 : 6),
              background: c.borderLight,
              transform: 'translateX(-50%)',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Línea base */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 24, height: 2,
          background: c.borderLight, borderRadius: 2,
        }} />

        {/* Progreso del año actual */}
        {year === currentYear && (
          <div style={{
            position: 'absolute', left: 0, top: 24, height: 2,
            width: `${((new Date().getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 365)) * 100}%`,
            background: '#00C87A', opacity: 0.45, borderRadius: 2,
          }} />
        )}

        {/* Dots por estudio */}
        {grouped.map((g, i) => {
          const isMulti    = g.items.length > 1;
          const firstColor = categoryColor(g.items[0].category);
          const size       = isMulti ? 20 : 13;
          return (
            <button
              key={i}
              onClick={() => {
                const target = isMulti ? g.items[g.items.length - 1] : g.items[0];
                onSelectStudy(target.id);
              }}
              style={{
                position: 'absolute',
                left: `${g.pct}%`,
                top: 24 - size / 2,
                transform: 'translateX(-50%)',
                width: size, height: size,
                borderRadius: '50%',
                background: firstColor,
                border: `2px solid ${c.bg}`,
                boxShadow: `0 0 0 1.5px ${firstColor}55, 0 1px 5px ${firstColor}25`,
                cursor: 'pointer', padding: 0, zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 9, fontWeight: 700,
                transition: 'transform 120ms, box-shadow 120ms',
              }}
              title={isMulti
                ? `${g.items.length} estudios — ${g.items[0].date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`
                : `${g.items[0].type} · ${g.items[0].date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`}
            >
              {isMulti ? g.items.length : ''}
            </button>
          );
        })}
      </div>

      {/* Labels de meses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', marginTop: 2 }}>
        {MONTH_LABELS.map((label, i) => {
          const isSelected  = selectedMonth === i;
          const isCurrent   = year === currentYear && i === currentMonth;
          const hasStudies  = monthsWithStudies.has(i);
          return (
            <button
              key={label}
              onClick={() => onSelectMonth(i)}
              style={{
                background: isSelected ? '#00C87A' : 'none',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                padding: '4px 0 6px',
                minHeight: 30,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                transition: 'background 120ms',
              }}
              title={`Filtrar ${label} ${year}`}
            >
              <span style={{
                fontSize: 9,
                fontWeight: isSelected ? 700 : (isCurrent ? 600 : 400),
                color: isSelected ? '#fff' : (isCurrent ? '#00C87A' : hasStudies ? c.textSub : c.textMuted),
                letterSpacing: '0.02em',
              }}>
                {label}
              </span>
              {/* Dot indicador de estudios en ese mes */}
              <span style={{
                width: 3, height: 3, borderRadius: '50%',
                background: isSelected ? 'rgba(255,255,255,0.7)' : (hasStudies ? '#00C87A' : 'transparent'),
                transition: 'background 120ms',
              }} />
            </button>
          );
        })}
      </div>

      {selectedMonth != null && (
        <button
          onClick={() => onSelectMonth(selectedMonth)}
          style={{
            marginTop: 4, background: 'none', border: 'none',
            color: '#00C87A', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', padding: '2px 0',
            display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> Todo el año
        </button>
      )}
    </div>
  );
}

function EmptyState({ message, onUpload }: { message?: string; onUpload?: () => void }) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🗂</span>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>
        {message ? 'Sin estudios' : 'Tu vault está vacío'}
      </h3>
      <p style={{ fontSize: 14, color: c.textSub, lineHeight: 1.6 }}>
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
