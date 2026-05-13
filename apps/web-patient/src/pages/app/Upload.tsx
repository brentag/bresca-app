import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Camera, Upload, FolderOpen, ArrowLeft, ScanLine, Plus, X, FileText, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { enqueueExtract } from '../../lib/api';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';
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

const MAX_FILES = 10;

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf',
  dcm: 'application/dicom', dicom: 'application/dicom', dco: 'application/dicom', dic: 'application/dicom',
};

function isDicomFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes('.')) return true; // sin extensión → DICOM de serie/carpeta
  const ext = lower.split('.').pop() ?? '';
  return ['dcm', 'dicom', 'dco', 'dic'].includes(ext);
}

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
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [extractError, setExtractError] = useState('');
  const [uploadPct, setUploadPct]       = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [savedVaultPath, setSavedVaultPath] = useState('/app/vault');
  const folderRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderRef.current) folderRef.current.setAttribute('webkitdirectory', '');
  }, []);

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
        setDraft({
          profileId:        d.profile_id,
          draftId:          d.id,
          category:         d.category ?? 'otro',
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
    setExtractError('');
    setFiles(prev => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) {
        setExtractError(`Máximo ${MAX_FILES} archivos por envío. Procesá los actuales primero.`);
        return prev;
      }
      const toAdd = incoming.slice(0, remaining);
      if (toAdd.length < incoming.length) {
        setExtractError(`Se agregaron ${toAdd.length} de ${incoming.length} archivos (límite: ${MAX_FILES}).`);
      }
      return [
        ...prev,
        ...toAdd.map(file => ({
          id:      `${Date.now()}-${Math.random()}`,
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        })),
      ];
    });
    e.target.value = '';
  }

  function addFolderFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    setExtractError('');
    const dicomFiles = incoming.filter(f => isDicomFile(f.name));
    if (!dicomFiles.length) {
      setExtractError('La carpeta no contiene archivos DICOM reconocidos (.dcm, .dicom o sin extensión).');
      e.target.value = '';
      return;
    }
    setFiles(prev => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) {
        setExtractError(`Máximo ${MAX_FILES} archivos por envío. Procesá los actuales primero.`);
        return prev;
      }
      const toAdd = dicomFiles.slice(0, remaining);
      if (toAdd.length < dicomFiles.length) {
        setExtractError(`Se agregaron ${toAdd.length} de ${dicomFiles.length} archivos DICOM (límite: ${MAX_FILES}).`);
      }
      return [
        ...prev,
        ...toAdd.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, preview: '' })),
      ];
    });
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
    setUploadingFileName(null);

    try {
      const totalBytes   = files.reduce((acc, f) => acc + f.file.size, 0) || 1;
      const fileProgress = files.map(() => 0);

      const uploads = await Promise.all(
        files.map(async ({ file }, idx) => {
          const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
          const mime = MIME_MAP[ext] ?? 'application/octet-stream';
          const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          setUploadingFileName(file.name.length > 30 ? `…${file.name.slice(-27)}` : file.name);

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
      // Sin category → la Edge Function la detecta automáticamente del contenido.
      const { job_id }   = await enqueueExtract(storagePaths, primaryMime, undefined, familyProfileId);

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

  const fileLabel = files.length === 1 ? '1 archivo' : `${files.length} archivos`;

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

          {/* Selector de origen */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: c.text }}>
                {files.length === 0 ? '¿Qué querés subir?' : 'Agregar más archivos'}
              </h2>
              {files.length > 0 && (
                <span style={{ fontSize: 12, color: files.length >= MAX_FILES ? '#EF4444' : c.textMuted }}>
                  {files.length}/{MAX_FILES}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={sourceCardStyle}>
                <Camera size={28} color="#00C87A" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Cámara</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={addFiles} style={{ display: 'none' }} />
              </label>
              <label style={{ ...sourceCardStyle, flex: 2 }}>
                <Upload size={28} color="#4B6EF5" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Subir archivo</span>
                <span style={{ fontSize: 10, color: c.textMuted }}>PDF · Imagen · DICOM</span>
                <input type="file" accept="image/*,application/pdf,.dcm,.dicom,.dco,.dic" multiple onChange={addFiles} style={{ display: 'none' }} />
              </label>
            </div>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', alignSelf: 'flex-start' }}
            >
              <FolderOpen size={14} color={c.textMuted} />
              <span style={{ fontSize: 12, color: c.textMuted }}>Serie DICOM — seleccionar carpeta</span>
            </button>
            <input ref={folderRef} type="file" multiple onChange={addFolderFiles} style={{ display: 'none' }} />
          </div>

          {/* Thumbnails */}
          {files.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.textSub }}>
                  {fileLabel} seleccionado{files.length !== 1 ? 's' : ''}
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
                    ) : isDicomFile(f.file.name) ? (
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Activity size={22} color="#3B82F6" />
                        <span style={{ fontSize: 9, color: '#3B82F6', fontWeight: 600, textAlign: 'center' }}>DICOM</span>
                      </div>
                    ) : f.file.name.toLowerCase().endsWith('.pdf') ? (
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FileText size={22} color="#EF4444" />
                        <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 600, textAlign: 'center' }}>PDF</span>
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
                  <input type="file" accept="image/*,application/pdf,.dcm,.dicom,.dco,.dic" multiple onChange={addFiles} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* Tip */}
          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ScanLine size={18} color="#00C87A" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
              Podés seleccionar hasta {MAX_FILES} archivos a la vez — PDF, imágenes o DICOM. Si el estudio tiene varias páginas, agregalas todas antes de procesar.
            </p>
          </div>

          {/* Progress bar */}
          {uploading && uploadPct !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: c.textSub, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadPct < 100
                    ? (uploadingFileName ? uploadingFileName : 'Subiendo…')
                    : 'Enviando a la IA…'}
                </span>
                <span style={{ fontSize: 13, color: '#00C87A', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
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
                : <><ScanLine size={18} color="#fff" /> Subir {fileLabel}</>
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
