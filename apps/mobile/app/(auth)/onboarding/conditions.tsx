import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useOnboarding } from '../../../lib/onboarding';
import { useSession } from '../../../lib/session';

const OPTIONS = [
  'Diabetes', 'Hipertensión', 'Hipotiroidismo', 'Asma',
  'Enfermedad cardiovascular', 'Artritis', 'Depresión / Ansiedad',
  'Obesidad', 'EPOC', 'Otra condición crónica',
];

export default function ConditionsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: onboardingData } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(item: string) {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  async function finish() {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      display_name: onboardingData.displayName ?? 'Usuario',
      birth_year: onboardingData.birthYear ?? null,
      conditions: selected,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'No pudimos guardar tu perfil. Intentá de nuevo.');
      return;
    }

    router.replace('/(app)');
  }

  return (
    <SafeAreaView style={s.container}>
      <ProgressBar step={3} total={3} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>¿Tenés alguna condición crónica?</Text>
        <Text style={s.subtitle}>Opcional — podés agregar más después.</Text>

        <View style={s.grid}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.chip, selected.includes(opt) && s.chipSelected]}
              onPress={() => toggle(opt)}
            >
              <Text style={[s.chipText, selected.includes(opt) && s.chipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={finish} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Guardando…' : 'Empezar'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={p.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[p.bar, i < step && p.barActive]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC', paddingHorizontal: 24, paddingTop: 16 },
  scroll: { paddingBottom: 24, gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#E8FBF3', borderColor: '#00C87A' },
  chipText: { fontSize: 14, color: '#64748B' },
  chipTextSelected: { color: '#00A663', fontWeight: '600' },
  footer: { paddingBottom: 16, paddingTop: 8 },
  btn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const p = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  barActive: { backgroundColor: '#00C87A' },
});
