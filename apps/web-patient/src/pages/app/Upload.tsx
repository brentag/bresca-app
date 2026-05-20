import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Camera, Upload as UploadIcon, FolderOpen, ArrowLeft, ScanLine, Plus, X, FileText, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { enqueueExtract } from '../../lib/api';
import { useTrackNode } from '../../lib/useTrackNode';
import { useTheme, themeColors } from '../../lib/theme';
import { CATEGORIES } from '../../lib/vault';
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
const MAX_SERIES_FILES = 500; // DICOM series: CT/MR slices can reach 500+

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf',
  dcm: 'application/dicom', dicom: 'application/dicom', dco: 'application/dicom', dic: 'application/dicom',
};

// Detección visual para thumbnails (heurística rápida, sin leer el archivo)
function looksLikeDicom(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes('.')) return true; // sin extensión → típico en Linux/Mac DICOM
  const ext = lower.split('.').pop() ?? '';
  return ['dcm', 'dicom', 'dco', 'dic', 'ima', 'img'].includes(ext);
}

// Detección real por magic bytes — lee solo los primeros 132 bytes del archivo
async function isDicomBuffer(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 132).arrayBuffer();
    const b = new Uint8Array(buf);
    // DICOM preamble: 128 bytes + "DICM" en bytes 128-131
    return b.length >= 132 &&
      b[128] === 0x44 && b[129] === 0x49 && b[130] === 0x43 && b[131] === 0x4D;
  } catch {
    return false;
  }
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
  const [draftSignedUrls, setDraftSignedUrls] = useState<{ path: string; url: string; isPdf: boolean; isDicom: boolean }[]>([]);
  const [seriesName, setSeriesName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const folderRef = React.useRef<HTMLInputElement>(null);
  const moreFolderRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderRef.current) folderRef.current.setAttribute('webkitdirectory', '');
    if (moreFolderRef.current) moreFolderRef.current.setAttribute('webkitdirectory', '');
  }, []);

  // Genera signed URLs del draft para mostrar preview en el review screen
  useEffect(() => {
    const paths = draft?.storagePaths;
    if (!paths?.length) { setDraftSignedUrls([]); return; }
    supabase.storage.from('studies')
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!data) return;
        setDraftSignedUrls(
          data.filter(d => d.signedUrl && d.path).map(d => {
            const ext = d.path!.toLowerCase().split('.').pop() ?? '';
            return {
              path: d.path!,
              url: d.signedUrl!,
              isPdf: ext === 'pdf',
              isDicom: ['dcm', 'dicom', 'dco', 'dic'].includes(ext),
            };
          }),
        );
      });
  }, [draft?.storagePaths?.join(',')]);

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

    // Acepta cualquier archivo — la detección DICOM ocurre por magic bytes al procesar
    const relPath = (incoming[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const detected = relPath ? relPath.split('/')[0] : null;
    if (detected) setSeriesName(detected);

    const toAdd = incoming.slice(0, MAX_SERIES_FILES);
    if (toAdd.length < incoming.length) {
      setExtractError(`Serie grande: se cargarán los primeros ${toAdd.length} de ${incoming.length} archivos.`);
    }
    setFiles(toAdd.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, preview: '' })));
    e.target.value = '';
  }

  function removeFile(id: string) {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (!next.length) setSeriesName(null);
      return next;
    });
  }

  function addMoreFolderFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    setExtractError('');
    setFiles(prev => {
      const remaining = MAX_SERIES_FILES - prev.length;
      if (remaining <= 0) {
        setExtractError(`Límite de ${MAX_SERIES_FILES} archivos alcanzado.`);
        return prev;
      }
      const toAdd = incoming.slice(0, remaining);
      if (toAdd.length < incoming.length) {
        setExtractError(`Se agregaron ${toAdd.length} de ${incoming.length} archivos adicionales (límite total: ${MAX_SERIES_FILES}).`);
      }
      return [...prev, ...toAdd.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, preview: '' }))];
    });
    e.target.value = '';
  }

  async function readDirEntry(dirEntry: FileSystemDirectoryEntry, out: File[]): Promise<void> {
    return new Promise(resolve => {
      const reader = dirEntry.createReader();
      const readBatch = () => {
        reader.readEntries(async entries => {
          if (!entries.length) { resolve(); return; }
          await Promise.all(entries.map(entry => {
            if (entry.isFile) {
              return new Promise<void>(r => (entry as FileSystemFileEntry).file(f => { out.push(f); r(); }, () => r()));
            }
            if (entry.isDirectory) return readDirEntry(entry as FileSystemDirectoryEntry, out);
          }));
          readBatch();
        });
      };
      readBatch();
    });
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    setExtractError('');

    const items = Array.from(e.dataTransfer.items);
    if (!items.length) return;

    const allFiles: File[] = [];
    const dirNames: string[] = [];

    await Promise.all(
      items.map(item => {
        const entry = item.webkitGetAsEntry?.();
        if (!entry) {
          const f = item.getAsFile();
          if (f) allFiles.push(f);
          return;
        }
        if (entry.isFile) {
          return new Promise<void>(resolve => {
            (entry as FileSystemFileEntry).file(f => { allFiles.push(f); resolve(); }, () => resolve());
          });
        }
        if (entry.isDirectory) {
          dirNames.push(entry.name);
          return readDirEntry(entry as FileSystemDirectoryEntry, allFiles);
        }
      }),
    );

    if (!allFiles.length) return;

    if (dirNames.length > 0) {
      // Serie DICOM: reemplaza o agrega a la existente
      const name = dirNames.length === 1 ? dirNames[0] : `${dirNames.length} carpetas`;
      const toAdd = allFiles.slice(0, MAX_SERIES_FILES);
      if (allFiles.length > MAX_SERIES_FILES) {
        setExtractError(`Serie grande: se cargarán los primeros ${toAdd.length} de ${allFiles.length} archivos.`);
      }
      if (seriesName) {
        setFiles(prev => {
          const remaining = MAX_SERIES_FILES - prev.length;
          return [...prev, ...toAdd.slice(0, remaining).map(file => ({ id: `${Date.now()}-${Math.random()}`, file, preview: '' }))];
        });
      } else {
        setSeriesName(name);
        setFiles(toAdd.map(file => ({ id: `${Date.now()}-${Math.random()}`, file, preview: '' })));
      }
    } else {
      // Archivos sueltos
      setFiles(prev => {
        const remaining = MAX_FILES - prev.length;
        if (remaining <= 0) {
          setExtractError(`Máximo ${MAX_FILES} archivos por envío.`);
          return prev;
        }
        const toAdd = allFiles.slice(0, remaining);
        if (toAdd.length < allFiles.length) {
          setExtractError(`Se agregaron ${toAdd.length} de ${allFiles.length} archivos (límite: ${MAX_FILES}).`);
        }
        return [...prev, ...toAdd.map(file => ({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        }))];
      });
    }
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
          const ext     = file.name.includes('.') ? (file.name.split('.').pop()?.toLowerCase() ?? '') : '';
          const mime    = MIME_MAP[ext] ?? 'application/octet-stream';
          const suffix  = ext ? `.${ext}` : '';
          const path    = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
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
      const vaultPath    = familyProfileId ? `/app/vault?p=${familyProfileId}` : '/app/vault';

      // DICOM: detección por magic bytes (DICM en offset 128) — ignora la extensión del archivo.
      // Basta con verificar el primer archivo; si es DICOM asumimos serie homogénea.
      const allDicom = await isDicomBuffer(files[0].file);
      if (allDicom) {
        try {
          const buffer = await files[0].file.arrayBuffer();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { default: dicomParser } = await import('dicom-parser') as any;
          const dataset = dicomParser.parseDicom(new Uint8Array(buffer));

          const str = (tag: string) => { try { return (dataset.string(tag) ?? '').replace(/\0/g, '').trim(); } catch { return ''; } };
          const u16 = (tag: string) => { try { return dataset.uint16(tag) ?? null; } catch { return null; } };

          const modality  = str('x00080060');
          const bodyPart  = str('x00180015');
          const rawDate   = str('x00080020');  // YYYYMMDD
          const studyDesc = str('x0008103e') || str('x00081030') || str('x00080104');
          const rows      = u16('x00280010');
          const cols      = u16('x00280011');

          const today   = new Date().toISOString().slice(0, 10);
          const studyDate = rawDate.length === 8
            ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
            : today;

          const extracted: Record<string, string> = {};
          if (modality) extracted['Modalidad'] = modality;
          if (bodyPart) extracted['Región anatómica'] = bodyPart;
          if (rows && cols) extracted['Resolución'] = `${rows}×${cols}`;

          const { error: insertErr } = await supabase.from('studies').insert({
            profile_id:       targetProfileId,
            study_type:       studyDesc || (modality ? `DICOM ${modality}` : 'Estudio DICOM'),
            category:         'imágenes',
            study_date:       studyDate,
            lab_name:         null,
            extracted_fields: extracted as Database['public']['Tables']['studies']['Row']['extracted_fields'],
            confirmed:        true,
            storage_path:     storagePaths[0] ?? null,
            storage_paths:    storagePaths,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ocr_score:        95 as any,
          });
          if (!insertErr) {
            nav(vaultPath, { replace: true });
            return;
          }
        } catch { /* dicom-parser falló — fallback al path OCR */ }
      }

      // Path OCR: Edge Function procesa PDF e imágenes.
      // FE-A2: si el server está dormido (Render free tier), enqueueExtract
      // reintenta tras 32s. Mostramos un mensaje claro al usuario en ese caso.
      const { job_id } = await enqueueExtract(
        storagePaths,
        primaryMime,
        undefined,
        familyProfileId,
        { onColdStart: (msg) => setUploadingFileName(msg) },
      );
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

  const fileLabel = seriesName
    ? `serie (${files.length} archivos)`
    : files.length === 1 ? '1 archivo' : `${files.length} archivos`;

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
        <div
          style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}
          onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,200,122,0.08)', border: '2.5px dashed #00C87A', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, pointerEvents: 'none' }}>
              <FolderOpen size={40} color="#00C87A" />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#00C87A' }}>Soltá los archivos aquí</span>
              <span style={{ fontSize: 13, color: '#00A663' }}>Archivos o carpetas DICOM</span>
            </div>
          )}

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
                <UploadIcon size={28} color="#4B6EF5" />
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Subir archivo</span>
                <span style={{ fontSize: 10, color: c.textMuted }}>PDF · Imagen · DICOM</span>
                <input type="file" accept="image/*,application/pdf,.dcm,.dicom,.dco,.dic" multiple onChange={addFiles} style={{ display: 'none' }} />
              </label>
            </div>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              style={{ ...sourceCardStyle, width: '100%', flexDirection: 'row', justifyContent: 'flex-start', gap: 14, padding: '14px 16px', border: `1.5px solid ${c.border}` }}
            >
              <FolderOpen size={26} color="#8B5CF6" style={{ flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Serie DICOM</div>
                <div style={{ fontSize: 11, color: c.textMuted }}>Seleccionar carpeta — CT, MR, PET, US</div>
              </div>
            </button>
            <input ref={folderRef} type="file" multiple onChange={addFolderFiles} style={{ display: 'none' }} />
          </div>

          {/* Thumbnails / Serie card */}
          {files.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.textSub }}>
                  {seriesName ? `Serie: ${seriesName}` : `${fileLabel} seleccionado${files.length !== 1 ? 's' : ''}`}
                </span>
                <button onClick={() => { setFiles([]); setSeriesName(null); }} style={{ fontSize: 12, color: c.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Limpiar todo
                </button>
              </div>

              {/* Serie DICOM: card única en lugar de N thumbnails */}
              {seriesName ? (
                <div style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <FolderOpen size={32} color="#7C3AED" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {seriesName}
                      </div>
                      <div style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>
                        {files.length} archivos DICOM
                        {files.length >= MAX_SERIES_FILES && <span style={{ color: '#F59E0B', marginLeft: 6 }}>· límite {MAX_SERIES_FILES}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setFiles([]); setSeriesName(null); }}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: '#EDE9FE', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <X size={13} color="#7C3AED" strokeWidth={2.5} />
                    </button>
                  </div>
                  {files.length < MAX_SERIES_FILES && (
                    <button
                      type="button"
                      onClick={() => moreFolderRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EDE9FE', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#7C3AED', cursor: 'pointer' }}
                    >
                      <Plus size={14} color="#7C3AED" /> Agregar otra carpeta
                    </button>
                  )}
                  <input ref={moreFolderRef} type="file" multiple onChange={addMoreFolderFiles} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {files.map((f, i) => (
                    <div key={f.id} style={{ position: 'relative', width: 72, height: 72 }}>
                      {f.preview ? (
                        <img src={f.preview} alt={`Página ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1.5px solid ${c.border}` }} />
                      ) : looksLikeDicom(f.file.name) ? (
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
              )}
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

          {/* Preview de archivos del draft */}
          {draftSignedUrls.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', marginBottom: 8 }}>
                {draftSignedUrls.length === 1 ? 'ARCHIVO' : `ARCHIVOS (${draftSignedUrls.length})`}
              </p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {draftSignedUrls.map((f, i) => (
                  f.isPdf ? (
                    <a key={f.path} href={f.url} target="_blank" rel="noopener noreferrer"
                       style={{ flexShrink: 0, width: 80, height: 100, borderRadius: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                      <FileText size={24} color="#EF4444" />
                      <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 600 }}>Ver PDF ↗</span>
                    </a>
                  ) : f.isDicom ? (
                    <div key={f.path} style={{ flexShrink: 0, width: 80, height: 100, borderRadius: 10, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Activity size={24} color="#3B82F6" />
                      <span style={{ fontSize: 9, color: '#3B82F6', fontWeight: 600 }}>DICOM {i + 1}</span>
                    </div>
                  ) : (
                    <a key={f.path} href={f.url} target="_blank" rel="noopener noreferrer"
                       style={{ flexShrink: 0, width: 80, height: 100, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.border}`, display: 'block', textDecoration: 'none' }}>
                      <img src={f.url} alt={`Archivo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          <div style={fieldGroupStyle}>
            <CategorySelectRow value={draft.category} onChange={v => setDraft({ ...draft, category: v })} />
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

function CategorySelectRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { isDark } = useTheme();
  const c = themeColors(isDark);
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}` }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: c.textMuted, letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
        Categoría
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: c.text, background: 'transparent', minHeight: 28, cursor: 'pointer' }}
      >
        {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => (
          <option key={cat.id} value={cat.id}>{cat.label}</option>
        ))}
      </select>
    </div>
  );
}
