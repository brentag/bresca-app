import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FlaskConical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import type React from 'react';

const AREAS = [
  { id: 'cardiología',    label: 'Cardiología',        desc: 'Enfermedades del corazón y sistema cardiovascular' },
  { id: 'endocrinología', label: 'Endocrinología',      desc: 'Diabetes, tiroides y trastornos hormonales' },
  { id: 'hematología',    label: 'Hematología',         desc: 'Análisis de sangre y sistema linfático' },
  { id: 'imágenes',       label: 'Imagen diagnóstica',  desc: 'Ecografías, tomografías y resonancias' },
  { id: 'bioquímica',     label: 'Bioquímica',          desc: 'Análisis bioquímicos y metabólicos' },
  { id: 'respiratorio',   label: 'Respiratorio',        desc: 'Pulmones y vías respiratorias' },
];

type ConsentsMap = Record<string, boolean>;

async function fetchConsents(profileId: string): Promise<ConsentsMap> {
  const { data } = await supabase
    .from('consent_audit')
    .select('layer, area_id, granted, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (!data) return {};

  const result: ConsentsMap = {};
  const seen = new Set<string>();

  for (const row of data) {
    const key = row.area_id ? `area:${row.area_id}` : row.layer;
    if (!seen.has(key)) {
      seen.add(key);
      result[key] = row.granted;
    }
  }

  return result;
}

async function writeConsent(profileId: string, layer: string, areaId: string | null, granted: boolean) {
  return supabase.from('consent_audit').insert({
    profile_id: profileId,
    layer,
    area_id: areaId,
    granted,
    revoked_at: granted ? null : new Date().toISOString(),
  });
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onChange}
      aria-label={on ? 'Desactivar' : 'Activar'}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? '#00C87A' : '#E2E8F0',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 200ms ease', display: 'block',
      }} />
    </button>
  );
}

export default function ConsentCenter() {
  const nav = useNavigate();
  const { profile } = useProfile();
  const [consents, setConsents] = useState<ConsentsMap | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchConsents(profile.id).then(setConsents);
  }, [profile?.id]);

  const toggle = useCallback(async (key: string, layer: string, areaId: string | null) => {
    if (!profile || saving !== null) return;
    const current = consents?.[key] ?? false;
    const next = !current;

    setConsents(prev => ({ ...(prev ?? {}), [key]: next }));
    setSaving(key);

    const { error } = await writeConsent(profile.id, layer, areaId, next);
    if (error) {
      setConsents(prev => ({ ...(prev ?? {}), [key]: current }));
    }
    setSaving(null);
  }, [profile, consents, saving]);

  const masterOn = consents?.['research'] ?? false;
  const loading = consents === null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#F7F9FC', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 8px', display: 'flex', alignItems: 'center', minHeight: 60 }}>
        <button
          onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 }}
        >
          <ChevronLeft size={24} color="#0F172A" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Centro de consentimiento</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Intro banner */}
        <div style={{ background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)', border: '1px solid rgba(0,200,122,0.2)', borderRadius: 16, padding: '16px', marginBottom: 20, display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <FlaskConical size={22} color="#4B6EF5" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Tus datos, tu decisión</p>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              Si autorizás, organizaciones de investigación clínica (CROs) pueden ver tus datos de forma completamente anónima. Podés cambiar esto en cualquier momento.
            </p>
          </div>
        </div>

        {/* Master toggle */}
        <p style={sectionLabel}>Investigación médica</p>
        <div style={card}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>Participar en investigación clínica</p>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              Permite que CROs accedan a tus datos anonimizados para estudios clínicos. Sin nombre ni información identificable.
            </p>
          </div>
          {loading
            ? <div style={{ width: 44, height: 26, borderRadius: 13, background: '#E2E8F0' }} />
            : <Toggle on={masterOn} onChange={() => toggle('research', 'research', null)} disabled={saving !== null} />
          }
        </div>

        {/* Therapeutic areas — only shown when master is ON */}
        {masterOn && (
          <>
            <p style={{ ...sectionLabel, marginTop: 24 }}>Áreas terapéuticas</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 1.55 }}>
              Elegí en qué áreas específicas querés contribuir. Podés ser tan específico como quieras.
            </p>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
              {AREAS.map((area, i) => {
                const key = `area:${area.id}`;
                const on = consents?.[key] ?? false;
                return (
                  <div
                    key={area.id}
                    style={{
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                      borderBottom: i < AREAS.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 1 }}>{area.label}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8' }}>{area.desc}</p>
                    </div>
                    <Toggle
                      on={on}
                      onChange={() => toggle(key, 'therapeutic_area', area.id)}
                      disabled={saving !== null}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Legal note */}
        <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 28, marginBottom: 8, lineHeight: 1.7 }}>
          Tus datos nunca son identificables.{'\n'}Bresca cumple con la Ley 25.326 de Protección de Datos Personales.
        </p>

      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
  padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#94A3B8',
  letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 10,
};
