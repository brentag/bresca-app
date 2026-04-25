import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Json } from '@bresca/shared';
import { categoryColor, formatStudyDate } from '../../lib/vault';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type SharedStudy = {
  id: string;
  study_type: string;
  category: string;
  study_date: string;
  lab_name: string | null;
  extracted_fields: Json;
  confirmed: boolean;
};

function fieldsFromJson(raw: Json): [string, string][] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, Json>).map(([k, v]) => [k, String(v ?? '')]);
}

export default function QRViewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [studies, setStudies] = useState<SharedStudy[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/qr/${token}`)
      .then((r) => {
        if (!r.ok) { setInvalid(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setStudies(data.studies);
        setExpiresAt(data.expires_at);
        setLoading(false);
      })
      .catch(() => { setInvalid(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#00C87A" /></View>;
  }

  if (invalid) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <Text style={s.invalidIcon}>⚠️</Text>
          <Text style={s.invalidTitle}>QR inválido o vencido</Text>
          <Text style={s.invalidText}>Este código ya no es válido. Pedile al paciente que genere uno nuevo.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const expiresLabel = new Date(expiresAt).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLogo}>
          <View style={s.logoMark} />
          <Text style={s.logoText}>bresca</Text>
        </View>
        <Text style={s.headerSub}>Estudios compartidos</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.expiryBanner}>
          <Text style={s.expiryText}>⏱ Acceso válido hasta {expiresLabel}</Text>
        </View>

        {studies.map((study) => {
          const color = categoryColor(study.category);
          const fields = fieldsFromJson(study.extracted_fields);
          return (
            <View key={study.id} style={[s.card, { borderLeftColor: color }]}>
              <Text style={s.cardTitle}>{study.study_type}</Text>
              <Text style={s.cardMeta}>{formatStudyDate(study.study_date)}{study.lab_name ? ` · ${study.lab_name}` : ''}</Text>

              {fields.length > 0 && (
                <View style={s.table}>
                  {fields.map(([key, val], i) => (
                    <View key={key} style={[s.row, i % 2 === 0 && s.rowEven]}>
                      <Text style={s.rowKey}>{key}</Text>
                      <Text style={s.rowVal}>{val}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={s.disclaimer}>
          Esta información fue compartida voluntariamente por el paciente a través de Bresca. No reemplaza la consulta médica presencial.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff', gap: 2 },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#00C87A' },
  logoText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B' },
  scroll: { padding: 20, gap: 16 },
  expiryBanner: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12, alignItems: 'center' },
  expiryText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderLeftWidth: 4, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', paddingHorizontal: 16, paddingTop: 14 },
  cardMeta: { fontSize: 13, color: '#64748B', paddingHorizontal: 16, paddingBottom: 12 },
  table: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  rowEven: { backgroundColor: '#F8FAFC' },
  rowKey: { flex: 1, fontSize: 13, color: '#64748B' },
  rowVal: { fontSize: 13, fontWeight: '600', color: '#0F172A', textAlign: 'right' },
  disclaimer: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  invalidIcon: { fontSize: 48 },
  invalidTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  invalidText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
