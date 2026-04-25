import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useProfile } from '../../../lib/useProfile';
import { type Study, categoryColor, formatStudyDate } from '../../../lib/vault';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const TTL_OPTIONS = [
  { label: '1 hora', hours: 1 },
  { label: '8 horas', hours: 8 },
  { label: '24 horas', hours: 24 },
  { label: '48 horas', hours: 48 },
  { label: '7 días', hours: 168 },
];

export default function ShareScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ttl, setTtl] = useState(24);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('studies')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('confirmed', true)
      .order('study_date', { ascending: false })
      .then(({ data }) => { setStudies(data ?? []); setLoading(false); });
  }, [profile?.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generate() {
    if (selected.size === 0) return;
    setGenerating(true);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ study_ids: Array.from(selected), ttl_hours: ttl }),
    });

    setGenerating(false);

    if (!res.ok) {
      Alert.alert('Error', 'No se pudo generar el QR. Intentá de nuevo.');
      return;
    }

    const { token, expires_at } = await res.json();
    router.replace({ pathname: '/(app)/vault/qr', params: { token, expires_at } });
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.navBack}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Compartir con QR</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.section}>
        <Text style={s.label}>Seleccioná los estudios</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00C87A" /></View>
      ) : studies.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>No tenés estudios confirmados para compartir.</Text>
        </View>
      ) : (
        <FlatList
          data={studies}
          keyExtractor={(s) => s.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.studyRow, selected.has(item.id) && s.studyRowSelected]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
            >
              <View style={[s.dot, { backgroundColor: categoryColor(item.category) }]} />
              <View style={s.studyBody}>
                <Text style={s.studyName} numberOfLines={1}>{item.study_type}</Text>
                <Text style={s.studyDate}>{formatStudyDate(item.study_date)}</Text>
              </View>
              <View style={[s.check, selected.has(item.id) && s.checkSelected]}>
                {selected.has(item.id) && <Text style={s.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={s.footer}>
        <Text style={s.label}>Tiempo de acceso</Text>
        <View style={s.ttlRow}>
          {TTL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.hours}
              style={[s.ttlChip, ttl === opt.hours && s.ttlChipActive]}
              onPress={() => setTtl(opt.hours)}
            >
              <Text style={[s.ttlText, ttl === opt.hours && s.ttlTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.genBtn, (selected.size === 0 || generating) && s.genBtnDisabled]}
          onPress={generate}
          disabled={selected.size === 0 || generating}
        >
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.genBtnText}>Generar QR ({selected.size} estudio{selected.size !== 1 ? 's' : ''})</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  navBack: { color: '#64748B', fontSize: 15, width: 60 },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  section: { paddingHorizontal: 20, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
  list: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  studyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  studyRowSelected: { borderColor: '#00C87A', backgroundColor: '#F0FDF9' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  studyBody: { flex: 1 },
  studyName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  studyDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkSelected: { backgroundColor: '#00C87A', borderColor: '#00C87A' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  footer: { padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
  ttlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ttlChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  ttlChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  ttlText: { fontSize: 13, color: '#64748B' },
  ttlTextActive: { color: '#fff', fontWeight: '600' },
  genBtn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  genBtnDisabled: { opacity: 0.4 },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
