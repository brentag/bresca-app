import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.title}>¿Cuál es tu email?</Text>
          <Text style={s.subtitle}>Te enviamos un código de 6 dígitos para ingresar.</Text>

          <TextInput
            style={s.input}
            placeholder="tu@email.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={sendOtp}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, (!email.trim() || loading) && s.btnDisabled]}
          onPress={sendOtp}
          disabled={!email.trim() || loading}
        >
          <Text style={s.btnText}>{loading ? 'Enviando…' : 'Enviar código'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 16 },
  back: { paddingTop: 8 },
  backText: { color: '#64748B', fontSize: 15 },
  content: { flex: 1, justifyContent: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  btn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
