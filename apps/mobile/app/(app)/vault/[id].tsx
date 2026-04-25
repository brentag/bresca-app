import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { type Study, categoryColor, formatStudyDate } from '../../../lib/vault';
import type { Json } from '@bresca/shared';

function fieldsFromJson(raw: Json): [string, string][] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, Json>).map(([k, v]) => [k, String(v ?? '')]);
}

export default function StudyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('studies')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setStudy(data);
        setLoading(false);
      });
  }, [id]);

  function confirmDelete() {
    Alert.alert(
      'Eliminar estudio',
      '¿Seguro que querés eliminarlo? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            await supabase.from('studies').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#00C87A" /></View>;
  }

  if (!study) {
    return (
      <View style={s.center}>
        <Text style={s.missing}>Estudio no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = categoryColor(study.category);
  const fields = fieldsFromJson(study.extracted_fields);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Navbar */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.navBack}>← Vault</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete}>
          <Text style={s.navDelete}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, { borderLeftColor: color }]}>
          <Text style={s.heroTitle}>{study.study_type}</Text>
          <Text style={s.heroDate}>{formatStudyDate(study.study_date)}</Text>
          {study.lab_name && <Text style={s.heroLab}>{study.lab_name}</Text>}
          <View style={[s.badge, study.confirmed ? s.badgeGreen : s.badgeYellow]}>
            <Text style={[s.badgeText, study.confirmed ? s.badgeTextGreen : s.badgeTextYellow]}>
              {study.confirmed ? '✓ Confirmado' : '⏳ Pendiente'}
            </Text>
          </View>
        </View>

        {/* Extracted fields */}
        {fields.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Resultados</Text>
            <View style={s.table}>
              {fields.map(([key, val], i) => (
                <View key={key} style={[s.row, i % 2 === 0 && s.rowEven]}>
                  <Text style={s.rowKey}>{key}</Text>
                  <Text style={s.rowVal}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Share QR */}
        <TouchableOpacity
          style={s.shareBtn}
          onPress={() => router.push('/(app)/vault/share')}
        >
          <Text style={s.shareBtnText}>Compartir con médico (QR)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  missing: { color: '#64748B', fontSize: 16 },
  backLink: { color: '#00C87A', fontSize: 15 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  navBack: { color: '#64748B', fontSize: 15 },
  navDelete: { color: '#EF4444', fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  hero: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderLeftWidth: 4, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  heroDate: { fontSize: 14, color: '#64748B' },
  heroLab: { fontSize: 13, color: '#94A3B8' },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeYellow: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextGreen: { color: '#16A34A' },
  badgeTextYellow: { color: '#D97706' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  rowEven: { backgroundColor: '#F8FAFC' },
  rowKey: { flex: 1, fontSize: 14, color: '#64748B' },
  rowVal: { fontSize: 14, fontWeight: '600', color: '#0F172A', textAlign: 'right' },
  shareBtn: { borderWidth: 1.5, borderColor: '#00C87A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#00C87A', fontWeight: '600', fontSize: 15 },
});
