import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../../lib/onboarding';

export default function YearScreen() {
  const router = useRouter();
  const { set } = useOnboarding();
  const [year, setYear] = useState('');

  const currentYear = new Date().getFullYear();
  const valid = !year || (Number(year) >= 1900 && Number(year) <= currentYear);

  function next() {
    if (year && Number(year) >= 1900 && Number(year) <= currentYear) {
      set('birthYear', Number(year));
    }
    router.push('/(auth)/onboarding/conditions');
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        <ProgressBar step={2} total={3} />
        <View style={s.content}>
          <Text style={s.title}>¿Año de nacimiento?</Text>
          <Text style={s.subtitle}>Opcional — nos ayuda a contextualizar tus estudios.</Text>
          <TextInput
            style={[s.input, !valid && s.inputError]}
            placeholder={`ej. ${currentYear - 30}`}
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            value={year}
            onChangeText={setYear}
          />
          {!valid && <Text style={s.errorText}>Año inválido</Text>}
        </View>
        <View style={s.footer}>
          <TouchableOpacity style={s.btnSkip} onPress={() => { router.push('/(auth)/onboarding/conditions'); }}>
            <Text style={s.btnSkipText}>Omitir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, !valid && s.btnDisabled]} onPress={next} disabled={!valid}>
            <Text style={s.btnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16, justifyContent: 'space-between', paddingBottom: 16 },
  content: { flex: 1, justifyContent: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 13 },
  footer: { flexDirection: 'row', gap: 12 },
  btnSkip: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  btnSkipText: { color: '#64748B', fontSize: 16, fontWeight: '500' },
  btn: { flex: 2, backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const p = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  barActive: { backgroundColor: '#00C87A' },
});
