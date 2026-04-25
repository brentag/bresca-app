import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../../lib/onboarding';

export default function NameScreen() {
  const router = useRouter();
  const { set } = useOnboarding();
  const [name, setName] = useState('');

  function next() {
    if (!name.trim()) return;
    set('displayName', name.trim());
    router.push('/(auth)/onboarding/year');
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        <ProgressBar step={1} total={3} />
        <View style={s.content}>
          <Text style={s.title}>¿Cómo te llamás?</Text>
          <Text style={s.subtitle}>Tu nombre solo es visible para vos.</Text>
          <TextInput
            style={s.input}
            placeholder="Nombre o apodo"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
            autoFocus
            value={name}
            onChangeText={setName}
            onSubmitEditing={next}
          />
        </View>
        <TouchableOpacity style={[s.btn, !name.trim() && s.btnDisabled]} onPress={next} disabled={!name.trim()}>
          <Text style={s.btnText}>Continuar</Text>
        </TouchableOpacity>
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
  btn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const p = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  barActive: { backgroundColor: '#00C87A' },
});
