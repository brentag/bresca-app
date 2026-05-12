import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Camera, Image, ArrowLeft, ScanLine, Plus, X, FileText, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { CATEGORIES } from '../../lib/vault';
import { enqueueExtract } from '../../lib/api';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';
import { CategoryChip } from '../../components/CategoryChip';
import { Spinner } from '../../components/Spinner';
import FeedbackSheet from '../../components/FeedbackSheet';
import type { Database } from '@bresca/shared';

type Step = 'source' | 'review';
type Draft = {
  profileId: string;
  category: string;
  study_type: string;
  lab_name: string;
  study_date: string;
  extracted_fields: Record<string, string>;
  storagePaths: string[];
  draftId?: string;
  ocr_score?: number | null;
  needs_review?: boolean;
};
type SelectedFile = { id: string; file: File; preview: string };

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf', dcm: 'application/dicom',
};

async function uploadFileStorage(
  file: File,
  path: string,
  mime: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.storage.from('studies') as any).upload(path, file, {
    contentType: mime,
    upsert: false,
    onUploadProgress: (p: { loaded: number; total: number }) => {
      if (p.total > 0) onProgress((p.loaded / p.total) * 100);
    },
  });
  if (error) throw new Error(`storage_upload_failed: ${(error as Error).message}`);
}

export default function Upload() {
  useTrackNode('upload');
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const { profile } = useProfile();
  const familyProfileId = searchParams.get('p') ?? undefined;
  const [familyName, setFamilyName]   = useState<string | null>(null);
  const [step, setStep]               = useState<Step>('source');
  const [uploading, setUploading]     = useState(false);
  const [files, setFiles]             = useState<SelectedFile[]>([]);
  const [draft, setDraft]             = useState<Draft | null>(null);
  const [category, setCategory]       = useState('hematología');
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [extractError, setExtractError] = useState('');
  const [uploadPct, setUploadPct]     = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [savedVaultPath, setSavedVaultPath] = useState('/app/vault');

  useEffect(() => {
    if (!familyProfileId) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', familyProfileId)
      .single()
      .then(({ data }) => { if (data) setFamilyName(data.display_name); });
  }, [familyProfileId]);

  useEffect(() => {
    const state = location.state as { mode?: string; draftId?: string } | null;
    if (state?.mode !== 'review' || !state.draftId) return;
    supabase
      .from('study_drafts')
      .select('id,profile_id,category,study_type,lab_name,study_date,extracted_fields,storage_paths')
      .eq('id', state.draftId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any;
        const today = new Date().toISOString().slice(0, 10);
        setCategory(d.category ?? 'hematología');
        setDraft({
          profileId:        d.profile_id,
          draftId:          d.id,
          category:         d.category ?? 'hematología',
          study_type:       d.study_type ?? 'Estudio clínico',
          lab_name:         d.lab_name ?? '',
          study_date:       d.study_date ?? today,
          extracted_fields: (d.extracted_fields ?? {}) as Record<string, string>,
          storagePaths:     (d.storage_paths as string[]) ?? [],
          ocr_score:        d.ocr_score ?? null,
          needs_review:     d.needs_review ?? false,
        });
        setStep('review');
      });
  }, []);

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    setFiles(prev => [
      ...prev,
      ...incoming.map(file => ({
        id:      `${Date.now()}-${Math.random()}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      })),
    ]);
    e.target.value = '';
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function processFiles() {
    const targetProfileId = familyProfileId ?? profile?.id;
    if (!files.length || !targetProfileId) return;
    setExtractError('');
    setUploading(true);
    setUploadPct(0);

    try {
      const totalBytes  = files.reduce((acc, f) => acc + f.file.size, 0) || 1;
      const fileProgress = files.map(() => 0);

      const uploads = await Promise.all(
        files.map(async ({ file }, idx) => {
          const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = MIME_MAP[ext] ?? 'image/jpeg';
          const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

          await uploadFileStorage(file, path, mime, (pct) => {
            fileProgress[idx] = pct;
            const loaded = fileProgress.reduce((acc, p, i) => acc + (p / 100) * files[i].file.size, 0);
            setUploadPct(Math.min(99, Math.round((loaded / totalBytes) * 100)));
          });

          return { path, mime };
        }),
      );

      setUploadPct(100);
      const storagePaths = uploads.map(u => u.path);
      const primaryMime  = uploads[0].mime;
      const { job_id }   = await enqueueExtract(storagePaths, primaryMime, category, familyProfileId);

      const vaultPath = familyProfileId ? `/app/vault?p=${familyProfileId}` : '/app/vault';
      nav(vaultPath, { replace: true, state: { pendingDraftId: job_id } });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Processing error:', errMsg);
      let msg: string;
      if (errMsg.startsWith('storage_upload_failed')) {
        msg = `Error al subir el archivo (${errMsg.replace('storage_upload_failed: ', '')}). Intentá de nuevo o usá una imagen en lugar de PDF.`;
      } else if (errMsg.includes('profile_not_found')) {
        msg = 'No encontramos tu perfil en el servidor. Cerrá sesión, volvé a ingresar e intentá de nuevo.';
      } else if (errMsg.startsWith('extract enqueue')) {
        msg = `Error al enviar a analizar (${errMsg.replace('extract enqueue error ', '')}). Intentá de nuevo en unos segundos.`;
      } else if (err instanceof TypeError || errMsg.toLowerCase().includes('network')) {
        msg = `Sin conexión con el servidor (${errMsg}). Revisá tu conexión e intentá de nuevo.`;
      } else {
        msg = `Error inesperado: ${errMsg}. Intentá de nuevo o contactá soporte.`;
      }
      setExtractError(msg);
      setUploading(false);
      setUploadPct(null);
    }
  }

  async function saveStudy() {
    if (!draft) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('studies').insert({
      profile_id:       draft.profileId,
      study_type:       draft.study_type,
      category:         draft.category,
      study_date:       draft.study_date,
      lab_name:         draft.lab_name || null,
      extracted_fields: draft.extracted_fields as Database['public']['Tables']['studies']['Row']['extracted_fields'],
      confirmed:        true,
      storage_path:     draft.storagePaths[0] ?? null,
      storage_paths:    draft.storagePaths,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(draft.ocr_score != null ? { ocr_score: draft.ocr_score } as any : {}),
    });
    setSaving(false);
    if (error) { setSaveError('No pudimos guardar el estudio. Intentá de nuevo.'); return; }
    if (draft.draftId) {
      await supabase.from('study_drafts').delete().eq('id', draft.draftId);
    }
    const vaultPath = familyProfileId ? `/app/vault?p=${familyProfileId}` : '/app/vault';
    setSavedVaultPath(vaultPath);
    setShowFeedback(true);
  }

  const pageLabel = files.length === 1 ? '1 página' : `${files.length} páginas`;

  const sourceCardStyle: React.CSSProperties = {
    flex: 1, background: c.card, borderRadius: 16, padding: '20px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    border: `1.5px solid ${c.border}`, cursor: 'pointer', minHeight: 90,
  };

  const fieldGroupStyle: React.CSSProperties = {
    background: c.card, borderRadius: 14, overflow: 'hidden', border: `1px solid ${c.border}`,
  };

  return (
    <div style={{ minHeight: '100dvh', background: c.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: c.card, borderBottom: `1px solid ${c.border}` }}>
        <button
          onClick={() => step === 'source' ? nav(-1) : setStep('source')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: c.textSub, fontSize: 15, cursor: 'pointer', minHeight: 44, minWidth: 60 }}
        >
          <ArrowLeft size={18} /> {step === 'source' ? 'Vault' : 'Atrás'}
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: c.text }}>Subir estudio</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Banner perfil familiar */}
      {familyProfileId && familyName && (
        <div style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#1D4ED8' }}>
            Subiendo para: <strong>{familyName}</strong>
          </span>
        </div>
      )}

      {/* ── PASO: source ── */}
      {step === 'source' && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {extractError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#DC2626' }}>
              {extractError}
            </div>
          )}

          {/* Selector de categoría */}
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 12 }}>¿Qué tipo de estudio es?</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => (
                <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={category === cat.id} onClick={() => setCategory(cat.id)} />
              ))}
            </div>
          </div>

          {/* Selector de origen */}
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 12 }}>
              {files.length === 0 ? '¿Cómo querés subir el archivo?' : 'Agregar más páginas'}
            </h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={sourceCardStyle}>
                <Camera size={28} color="#00C87A" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Cámara</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={addFiles} style={{ display: 'none' }} />
              </label>
              <label style={sourceCardStyle}>
                <Image size={28} color="#4B6EF5" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Galería / PDF</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={addFiles} style={{ display: 'none' }} />
              </label>
              <label style={sourceCardStyle}>
                <Activity size={28} color="#3B82F6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>DICOM</span>
                <input type="file" accept=".dcm,application/dicom" onChange={addFiles} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Thumbnails */}
          {files.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.textSub }}>
                  {pageLabel} seleccionada{files.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => setFiles([])} style={{ fontSize: 12, color: c.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Limpiar todo
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {files.map((f, i) => (
                  <div key={f.id} style={{ position: 'relative', width: 72, height: 72 }}>
                    {f.preview ? (
                      <img src={f.preview} alt={`Página ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1.5px solid ${c.border}` }} />
                    ) : f.file.name.toLowerCase().endsWith('.dcm') ? (
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Activity size={22} color="#3B82F6" />
                        <span style={{ fontSize: 9, color: '#3B82F6', fontWeight: 600, textAlign: 'center' }}>DICOM</span>
                      </div>
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: c.cardAlt, border: `1.5px solid ${c.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FileText size={22} color={c.textMuted} />
                        <span style={{ fontSize: 9, color: c.textMuted, textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>
                          {f.file.name.slice(-12)}
                        </span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                      {i + 1}
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={10} color="#fff" strokeWidth={3} />
                    </button>
                  </div>
                ))}

                <label style={{ width: 72, height: 72, borderRadius: 10, border: `1.5px dashed ${c.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: c.cardAlt }}>
                  <Plus size={20} color={c.textMuted} />
                  <span style={{ fontSize: 10, color: c.textMuted }}>Agregar</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.dcm,application/dicom" multiple onChange={addFiles} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* Tip */}
          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ScanLine size={18} color="#00C87A" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
              Si el estudio tiene varias páginas, agregá todas las fotos antes de procesar. Bresca las analiza juntas.
            </p>
          </div>

          {/* Progress bar */}
          {uploading && uploadPct !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: c.textSub, fontWeight: 500 }}>
                  {uploadPct < 100 ? 'Subiendo el archivo…' : 'Enviando a la IA…'}
                </span>
                <span style={{ fontSize: 13, color: '#00C87A', fontWeight: 700 }}>
                  {uploadPct < 100 ? `${uploadPct}%` : '✓'}
                </span>
              </div>
              <div style={{ height: 4, background: c.border, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: 'linear-gradient(90deg, #00C87A, #4B6EF5)', borderRadius: 99, transition: 'width 0.15s ease-out' }} />
              </div>
            </div>
          )}

          {/* Botón procesar */}
          {files.length > 0 && (
            <button
              onClick={processFiles}
              disabled={uploading}
              style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: uploading ? '#94A3B8' : '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {uploading
                ? <><Spinner /> Subiendo…</>
                : <><ScanLine size={18} color="#fff" /> Subir {pageLabel}</>
              }
            </button>
          )}
        </div>
      )}

      {/* ── PASO: review ── */}
      {step === 'review' && draft && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>Revisá los datos extraídos</h2>
            {draft.ocr_score != null && (
              <OcrScoreBadge score={draft.ocr_score} />
            )}
          </div>
          <p style={{ fontSize: 14, color: c.textSub, marginBottom: draft.needs_review ? 12 : 20 }}>Podés corregir cualquier campo antes de guardar.</p>

          {draft.needs_review && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: '0 0 4px' }}>Calidad del documento baja</p>
              <p style={{ fontSize: 12, color: '#B45309', margin: 0, lineHeight: 1.55 }}>
                No pudimos leer el estudio con suficiente precisión. Revisá los campos antes de guardar o resubí el documento con mejor calidad.
              </p>
            </div>
          )}

          <div style={fieldGroupStyle}>
            <FieldRow label="Tipo de estudio"    value={draft.study_type}  onChange={v => setDraft({ ...draft, study_type: v })} />
            <FieldRow label="Laboratorio / Centro" value={draft.lab_name}  onChange={v => setDraft({ ...draft, lab_name: v })} />
            <FieldRow label="Fecha"               value={draft.study_date} onChange={v => setDraft({ ...draft, study_date: v })} type="date" />
          </div>

          {Object.keys(draft.extracted_fields).length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>RESULTADOS EXTRAÍDOS</p>
              <div style={fieldGroupStyle}>
                {Object.entries(draft.extracted_fields).map(([key, val]) => (
                  <FieldRow key={key} label={key} value={val} onChange={v => setDraft({ ...draft, extracted_fields: { ...draft.extracted_fields, [key]: v } })} />
                ))}
              </div>
            </>
          )}

          {Object.keys(draft.extracted_fields).length === 0 && (
            <div style={{ marginTop: 16, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#92400E' }}>
              No encontramos valores específicos en el documento. Podés agregar los resultados manualmente o guardar el estudio tal como está.
            </div>
          )}

          {draft.storagePaths.length > 1 && (
            <p style={{ fontSize: 12, color: c.textMuted, marginTop: 12 }}>
              {draft.storagePaths.length} páginas procesadas
            </p>
          )}

          {saveError && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>{saveError}</p>}

          <button
            onClick={saveStudy}
            disabled={saving}
            style={{ width: '100%', marginTop: 20, padding: '16px', borderRadius: 14, border: 'none', background: saving ? '#94A3B8' : '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {saving ? <><Spinner /> Guardando…</> : 'Guardar en mi Vault'}
          </button>
        </div>
      )}

      {showFeedback && user && draft && (
        <FeedbackSheet
          userId={user.id}
          studyType={draft.study_type}
          category={draft.category}
          onDone={() => nav(savedVaultPath, { replace: true })}
        />
      )}
    </div>
  );
}

function OcrScoreBadge({ score }: { score: number }) {
  const pct   = Math.round(score);
  const color = pct < 80 ? '#EF4444' : pct <= 95 ? '#F59E0B' : '#22C55E';
  const bg    = pct < 80 ? '#FEF2F2' : pct <= 95 ? '#FFFBEB' : '#F0FDF4';
  const label = pct < 80 ? 'Baja' : pct <= 95 ? 'Media' : 'Alta';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: bg, border: `1px solid ${color}30` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}% {label}</span>
    </div>
  );
}

function FieldRow({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}` }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: c.text, background: 'transparent', minHeight: 28 }} />
    </div>
  );
}
