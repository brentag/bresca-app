import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useProfile } from '../../../lib/useProfile';
import { useSession } from '../../../lib/session';
import { CATEGORIES, mockExtract } from '../../../lib/vault';

type Step = 'source' | 'processing' | 'review';

type DraftData = {
  category: string;
  study_type: string;
  lab_name: string;
  study_date: string;
  extracted_fields: Record<string, string>;
  imageUri?: string;
  storagePath?: string;
};

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>('source');
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('hematología');
  const [saving, setSaving] = useState(false);

  async function pickImage(source: 'camera' | 'gallery') {
    const fn =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.requestMediaLibraryPermissionsAsync;

    // Request permission first
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso para continuar.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });

    if (result.canceled) return;

    setStep('processing');
    const uri = result.assets[0].uri;

    // Upload to Supabase Storage
    let storagePath: string | undefined;
    try {
      const ext = uri.split('.').pop() ?? 'jpg';
      const filename = `${Date.now()}.${ext}`;
      storagePath = `${user!.id}/${filename}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('studies')
        .upload(storagePath, blob, { contentType: `image/${ext}` });

      if (error) storagePath = undefined; // non-blocking — continue without storage
    } catch {
      storagePath = undefined;
    }

    // Simulate OCR (replace with real API call when ready)
    await new Promise<void>((r) => setTimeout(r, 1500));
    const extracted = mockExtract(selectedCategory);

    setDraft({ ...extracted, imageUri: uri, storagePath, category: selectedCategory });
    setStep('review');
  }

  async function saveStudy() {
    if (!draft || !profile) return;
    setSaving(true);

    const { error } = await supabase.from('studies').insert({
      profile_id: profile.id,
      study_type: draft.study_type,
      category: draft.category,
      study_date: draft.study_date,
      lab_name: draft.lab_name || null,
      extracted_fields: draft.extracted_fields as unknown as import('@bresca/shared').Json,
      confirmed: true,
      storage_path: draft.storagePath ?? null,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'No pudimos guardar el estudio. Intentá de nuevo.');
      return;
    }

    router.replace('/(app)/vault');
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => (step === 'source' ? router.back() : setStep('source'))}>
          <Text style={s.navBack}>← {step === 'source' ? 'Vault' : 'Atrás'}</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Subir estudio</Text>
        <View style={{ width: 60 }} />
      </View>

      {step === 'source' && <SourceStep category={selectedCategory} onCategoryChange={setSelectedCategory} onPick={pickImage} />}
      {step === 'processing' && <ProcessingStep />}
      {step === 'review' && draft && (
        <ReviewStep draft={draft} onChange={setDraft} onConfirm={saveStudy} saving={saving} />
      )}
    </SafeAreaView>
  );
}

/* ── Step 1: Source ── */
function SourceStep({
  category, onCategoryChange, onPick,
}: { category: string; onCategoryChange: (c: string) => void; onPick: (s: 'camera' | 'gallery') => void }) {
  return (
    <ScrollView contentContainerStyle={s.stepScroll}>
      <Text style={s.stepTitle}>¿Qué tipo de estudio es?</Text>
      <View style={s.grid}>
        {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.catChip, category === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '18' }]}
            onPress={() => onCategoryChange(cat.id)}
          >
            <View style={[s.catDot, { backgroundColor: cat.color }]} />
            <Text style={[s.catLabel, category === cat.id && { color: cat.color, fontWeight: '600' }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.stepTitle}>¿Cómo querés subir el archivo?</Text>
      <View style={s.sourceRow}>
        <TouchableOpacity style={s.sourceCard} onPress={() => onPick('camera')}>
          <Text style={s.sourceIcon}>📷</Text>
          <Text style={s.sourceLabel}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.sourceCard} onPress={() => onPick('gallery')}>
          <Text style={s.sourceIcon}>🖼</Text>
          <Text style={s.sourceLabel}>Galería</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ── Step 2: Processing ── */
function ProcessingStep() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#00C87A" />
      <Text style={s.processingText}>Extrayendo datos del estudio…</Text>
      <Text style={s.processingSubtext}>Esto toma unos segundos</Text>
    </View>
  );
}

/* ── Step 3: Review ── */
function ReviewStep({
  draft, onChange, onConfirm, saving,
}: {
  draft: DraftData;
  onChange: (d: DraftData) => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={s.stepScroll} keyboardShouldPersistTaps="handled">
      <Text style={s.stepTitle}>Revisá los datos extraídos</Text>
      <Text style={s.stepSubtitle}>Podés corregir cualquier campo antes de guardar.</Text>

      <View style={s.fieldGroup}>
        <FieldRow label="Tipo de estudio" value={draft.study_type} onChange={(v) => onChange({ ...draft, study_type: v })} />
        <FieldRow label="Laboratorio / Centro" value={draft.lab_name} onChange={(v) => onChange({ ...draft, lab_name: v })} />
        <FieldRow label="Fecha (AAAA-MM-DD)" value={draft.study_date} onChange={(v) => onChange({ ...draft, study_date: v })} keyboardType="numbers-and-punctuation" />
      </View>

      <Text style={s.sectionLabel}>Resultados</Text>
      <View style={s.fieldGroup}>
        {Object.entries(draft.extracted_fields).map(([key, val]) => (
          <FieldRow
            key={key}
            label={key}
            value={val}
            onChange={(v) => onChange({ ...draft, extracted_fields: { ...draft.extracted_fields, [key]: v } })}
          />
        ))}
      </View>

      <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={onConfirm} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Guardar en mi Vault</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function FieldRow({
  label, value, onChange, keyboardType = 'default',
}: { label: string; value: string; onChange: (v: string) => void; keyboardType?: string }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType as any}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  navBack: { color: '#64748B', fontSize: 15, width: 60 },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  processingText: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  processingSubtext: { fontSize: 14, color: '#64748B' },
  stepScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  stepSubtitle: { fontSize: 14, color: '#64748B', marginTop: -8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 13, color: '#64748B' },
  sourceRow: { flexDirection: 'row', gap: 12 },
  sourceCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 28, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E2E8F0' },
  sourceIcon: { fontSize: 32 },
  sourceLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  fieldGroup: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', gap: 0 },
  fieldRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  fieldLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginBottom: 2, textTransform: 'uppercase' },
  fieldInput: { fontSize: 15, color: '#0F172A', padding: 0 },
  confirmBtn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
