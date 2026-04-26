import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { CATEGORIES, mockExtract } from '../../lib/vault';
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

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

export default function Upload() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>('source');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [category, setCategory] = useState('hematología');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('processing');

    let storagePath: string | undefined;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      storagePath = `${user!.id}/${Date.now()}.${ext}`;
      const mime = MIME_MAP[ext] ?? 'image/jpeg';
      const { error } = await supabase.storage.from('studies').upload(storagePath, file, { contentType: mime });
      if (error) storagePath = undefined;
    } catch { storagePath = undefined; }

    // Mock OCR — replace with real Document AI call when ready
    await new Promise<void>(r => setTimeout(r, 1500));
    const extracted = mockExtract(category);
    setDraft({ ...extracted, category, storagePath });
    setStep('review');
  }

  async function saveStudy() {
    if (!draft || !profile) return;
    setSaving(true); setSaveError('');
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
              {/* capture="environment" abre cámara trasera en mobile */}
              <label style={sourceCardStyle}>
                <Camera size={32} color="#00C87A" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Cámara</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              {/* Sin capture — abre galería o file picker */}
              <label style={sourceCardStyle}>
                <Image size={32} color="#4B6EF5" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Galería / PDF</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Spinner size="lg" />
          <p style={{ fontSize: 17, fontWeight: 600, color: '#0F172A' }}>Extrayendo datos del estudio…</p>
          <p style={{ fontSize: 14, color: '#64748B' }}>Esto toma unos segundos</p>
        </div>
      )}

      {step === 'review' && draft && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Revisá los datos extraídos</h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Podés corregir cualquier campo antes de guardar.</p>

          <div style={fieldGroupStyle}>
            <FieldRow label="Tipo de estudio" value={draft.study_type} onChange={v => setDraft({ ...draft, study_type: v })} />
            <FieldRow label="Laboratorio / Centro" value={draft.lab_name} onChange={v => setDraft({ ...draft, lab_name: v })} />
            <FieldRow label="Fecha (AAAA-MM-DD)" value={draft.study_date} onChange={v => setDraft({ ...draft, study_date: v })} type="date" />
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>RESULTADOS</p>
          <div style={fieldGroupStyle}>
            {Object.entries(draft.extracted_fields).map(([key, val]) => (
              <FieldRow key={key} label={key} value={val} onChange={v => setDraft({ ...draft, extracted_fields: { ...draft.extracted_fields, [key]: v } })} />
            ))}
          </div>

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

const sourceCardStyle: React.CSSProperties = { flex: 1, background: '#fff', borderRadius: 16, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1.5px solid #E2E8F0', cursor: 'pointer', minHeight: 110 };
const fieldGroupStyle: React.CSSProperties = { background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' };
