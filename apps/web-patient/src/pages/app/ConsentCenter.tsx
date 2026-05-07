import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FlaskConical, FileText, Clock, MessageCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useConsentState } from '../../lib/useConsentState';
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

interface HistoryEntry {
  id: string;
  layer: string;
  area_id: string | null;
  granted: boolean;
  created_at: string;
}

interface LegalDoc {
  id: string;
  version: string;
  content_url: string;
}

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

async function fetchHistory(profileId: string): Promise<HistoryEntry[]> {
  const { data } = await supabase
    .from('consent_audit')
    .select('id, layer, area_id, granted, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(12);
  return data ?? [];
}

async function callRecordConsent(
  profileId: string, layer: string, areaId: string | null, granted: boolean
) {
  return supabase.rpc('record_consent', {
    p_profile_id: profileId,
    p_layer:      layer,
    p_action:     granted ? 'grant' : 'revoke',
    p_area_id:    areaId ?? undefined,
    p_user_agent: navigator.userAgent,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7)  return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function historyLabel(entry: HistoryEntry): string {
  const on = entry.granted;
  if (entry.layer === 'tc')      return 'Aceptaste los Términos y Condiciones';
  if (entry.layer === 'privacy') return 'Aceptaste la Política de Privacidad';
  if (entry.layer === 'research') {
    return on ? 'Activaste investigación clínica' : 'Desactivaste investigación clínica';
  }
  if (entry.layer === 'therapeutic_area' && entry.area_id) {
    const area = AREAS.find(a => a.id === entry.area_id);
    const label = area?.label ?? entry.area_id;
    return on ? `Activaste ${label}` : `Desactivaste ${label}`;
  }
  return on ? 'Consentimiento otorgado' : 'Consentimiento revocado';
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
  const { hasAcceptedTc, tcDocumentId } = useConsentState();

  const [consents, setConsents] = useState<ConsentsMap | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tcDoc, setTcDoc] = useState<LegalDoc | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchConsents(profile.id).then(setConsents);
    fetchHistory(profile.id).then(setHistory);
  }, [profile?.id]);

  useEffect(() => {
    if (!tcDocumentId) return;
    supabase
      .from('legal_documents')
      .select('id, version, content_url')
      .eq('id', tcDocumentId)
      .maybeSingle()
      .then(({ data }) => { if (data) setTcDoc(data); });
  }, [tcDocumentId]);

  const toggle = useCallback(async (key: string, layer: string, areaId: string | null) => {
    if (!profile || saving !== null) return;
    const current = consents?.[key] ?? false;
    const next = !current;

    setConsents(prev => ({ ...(prev ?? {}), [key]: next }));
    setSaving(key);

    const { error } = await callRecordConsent(profile.id, layer, areaId, next);
    if (error) {
      setConsents(prev => ({ ...(prev ?? {}), [key]: current }));
    } else {
      fetchHistory(profile.id).then(setHistory);
    }
    setSaving(null);
  }, [profile, consents, saving]);

  const masterOn = consents?.['research'] ?? false;
  const loading = consents === null;

  const founderSubject = encodeURIComponent('Consulta sobre Bresca');
  const founderBody = encodeURIComponent('Hola, te escribo desde la app de Bresca.\n\n');

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
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Centro de privacidad</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* T&C status card */}
        <p style={sectionLabel}>Documentos legales</p>
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: hasAcceptedTc ? 'rgba(0,200,122,0.1)' : 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {hasAcceptedTc
              ? <CheckCircle size={20} color="#00C87A" />
              : <FileText size={20} color="#EF4444" />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
              Términos y Condiciones
            </p>
            <p style={{ fontSize: 12, color: '#64748B' }}>
              {hasAcceptedTc
                ? `Aceptados${tcDoc ? ` — v${tcDoc.version}` : ''}`
                : 'Pendiente de aceptación'}
            </p>
          </div>
          {tcDoc && (
            <a
              href={tcDoc.content_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4B6EF5', textDecoration: 'none', fontSize: 12, fontWeight: 500 }}
            >
              Ver <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Intro banner */}
        <div style={{ background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)', border: '1px solid rgba(0,200,122,0.2)', borderRadius: 16, padding: '16px', marginBottom: 20, display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(75,110,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <FlaskConical size={22} color="#4B6EF5" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Tus datos, tu decisión</p>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              Si autorizás, organizaciones de investigación clínica (CROs) pueden ver tus datos de forma completamente anónima. Podés revocar esto en cualquier momento.
            </p>
          </div>
        </div>

        {/* Research master toggle */}
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
            : <Toggle on={masterOn} onChange={() => toggle('research', 'research', null)} disabled={saving !== null} />}
        </div>

        {/* Therapeutic areas */}
        {masterOn && (
          <>
            <p style={{ ...sectionLabel, marginTop: 24 }}>Áreas terapéuticas</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 1.55 }}>
              Elegí en qué áreas específicas querés contribuir.
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

        {/* History */}
        {history.length > 0 && (
          <>
            <p style={{ ...sectionLabel, marginTop: 28 }}>Historial de cambios</p>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
              {history.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < history.length - 1 ? '1px solid #F8FAFC' : 'none',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: entry.granted ? 'rgba(0,200,122,0.1)' : 'rgba(239,68,68,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Clock size={14} color={entry.granted ? '#00C87A' : '#EF4444'} />
                  </div>
                  <p style={{ flex: 1, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                    {historyLabel(entry)}
                  </p>
                  <p style={{ fontSize: 11, color: '#CBD5E1', flexShrink: 0 }}>
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Hablar con el fundador */}
        <div style={{ marginTop: 28, marginBottom: 8 }}>
          <a
            href={`mailto:founder@bresca.io?subject=${founderSubject}&body=${founderBody}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
              padding: '14px 16px', textDecoration: 'none', color: '#0F172A',
              fontSize: 14, fontWeight: 600,
            }}
          >
            <MessageCircle size={18} color="#4B6EF5" />
            Hablar con el fundador
          </a>
          <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 6 }}>
            Tu mensaje llega directo a founder@bresca.io
          </p>
        </div>

        {/* Legal note */}
        <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 20, marginBottom: 8, lineHeight: 1.7 }}>
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
