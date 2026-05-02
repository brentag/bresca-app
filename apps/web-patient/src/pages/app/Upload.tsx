import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft, ScanLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { CATEGORIES } from '../../lib/vault';
import { enqueueExtract, waitForDraft } from '../../lib/api';
import { CategoryChip } from '../../components/CategoryChip';
import { Spinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Step = 'source' | 'processing' | 'review';
type Draft = {
  category: string;
  study_type: string;
  lab_name: string;
  study_date: string;
  extracted_fields: Record<string, string>;
  storagePath?: string;
};

type ProcessingStage = 'uploading' | 'reading' | 'analyzing';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

const STAGE_LABEL: Record<ProcessingStage, string> = {
  uploading: 'Subiendo archivo…',
  reading: 'Leyendo el documento…',
  analyzing: 'Analizando con IA…',
};

export default function Upload() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>('source');
  const [stage, setStage] = useState<ProcessingStage>('uploading');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [category, setCategory] = useState('hematología');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [extractError, setExtractError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setExtractError('');
    setStep('processing');
    setStage('uploading');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = (MIME_MAP[ext] ?? 'image/jpeg') as string;
    const storagePath = `${user!.id}/${Date.now()}.${ext}`;

    try {
      // 1) Subir archivo a Storage (directo desde el browser)
      const { error: uploadError } = await supabase.storage
        .from('studies')
        .upload(storagePath, file, { contentType: mime });

      if (uploadError) throw uploadError;

      // 2) Encolar job en la API — responde 202 {job_id} en <100ms
      setStage('reading');
      const { job_id } = await enqueueExtract(storagePath, mime, category);

      // 3) Esperar resultado vía Realtime + fallback polling (90s timeout)
      setStage('analyzing');
      const result = await waitForDraft(job_id, 90_000);

      if (result.status === 'failed') {
        throw new Error(result.error_log ?? 'processing_failed');
      }

      const today = new Date().toISOString().slice(0, 10);
      setDraft({
        category,
        study_type:       result.study_type ?? 'Estudio clínico',
        lab_name:         result.lab_name ?? '',
        study_date:       result.study_date ?? today,
        extracted_fields: (result.extracted_fields ?? {}) as Record<string, string>,
        storagePath,
      });
      setStep('review');
    } catch (err) {
      console.error('Processing error:', err);
      setExtractError('No pudimos procesar el archivo. Revisá que sea un PDF o imagen legible e intentá de nuevo.');
      setStep('source');
    }
  }

  async function saveStudy() {
    if (!draft || !profile) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('studies').insert({
      profile_id: profile.id,
      study_type: draft.study_type,
      category: draft.category,
      study_date: draft.study_date,
      lab_name: draft.lab_name || null,
      extracted_fields: draft.extracted_fields as Database['public']['Tables']['studies']['Row']['extracted_fields'],
      confirmed: true,
      storage_path: draft.storagePath ?? null,
    });
    setSaving(false);
    if (error) { setSaveError('No pudimos guardar el estudio. Intentá de nuevo.'); return; }
    nav('/app/vault', { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button
          onClick={() => step === 'source' ? nav(-1) : setStep('source')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44, minWidth: 60 }}
        >
          <ArrowLeft size={18} /> {step === 'source' ? 'Vault' : 'Atrás'}
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Subir estudio</span>
        <div style={{ width: 60 }} />
      </div>

      {step === 'source' && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {extractError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#DC2626' }}>
              {extractError}
            </div>
          )}

          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>¿Qué tipo de estudio es?</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={category === cat.id} onClick={() => setCategory(cat.id)} />
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>¿Cómo querés subir el archivo?</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={sourceCardStyle}>
                <Camera size={32} color="#00C87A" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Cámara</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              <label style={sourceCardStyle}>
                <Image size={32} color="#4B6EF5" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Galería / PDF</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ScanLine size={18} color="#00C87A" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
              Bresca lee tu documento con IA y extrae los valores automáticamente. Podés corregir cualquier campo antes de guardar.
            </p>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg,#00C87A22,#4B6EF522)', animation: 'pulse 2s infinite' }} />
            <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={28} color="#fff" />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{STAGE_LABEL[stage]}</p>
            <p style={{ fontSize: 14, color: '#64748B' }}>
              {stage === 'uploading' && 'Guardando el archivo de forma segura'}
              {stage === 'reading' && 'Extrayendo el texto del documento'}
              {stage === 'analyzing' && 'DeepSeek está identificando los valores médicos'}
            </p>
          </div>
          <Spinner size="sm" />
        </div>
      )}

      {step === 'review' && draft && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Revisá los datos extraídos</h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Podés corregir cualquier campo antes de guardar.</p>

          <div style={fieldGroupStyle}>
            <FieldRow label="Tipo de estudio" value={draft.study_type} onChange={v => setDraft({ ...draft, study_type: v })} />
            <FieldRow label="Laboratorio / Centro" value={draft.lab_name} onChange={v => setDraft({ ...draft, lab_name: v })} />
            <FieldRow label="Fecha" value={draft.study_date} onChange={v => setDraft({ ...draft, study_date: v })} type="date" />
          </div>

          {Object.keys(draft.extracted_fields).length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>RESULTADOS EXTRAÍDOS</p>
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
    </div>
  );
}

function FieldRow({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: '#0F172A', background: 'transparent', minHeight: 28 }} />
    </div>
  );
}

const sourceCardStyle: React.CSSProperties = {
  flex: 1, background: '#fff', borderRadius: 16, padding: '24px 16px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  border: '1.5px solid #E2E8F0', cursor: 'pointer', minHeight: 110,
};
const fieldGroupStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0',
};
