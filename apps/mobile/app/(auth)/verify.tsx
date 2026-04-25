import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function verifyOtp() {
    if (code.length !== 6) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Código inválido', 'Verificá el código o solicitá uno nuevo.');
      setCode('');
      return;
    }

    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', data.user!.id)
      .maybeSingle();

    if (profile) {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/onboarding/name');
    }
  }

  async function resend() {
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    Alert.alert('Código reenviado', `Revisá tu bandeja de ${email}`);
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.title}>Ingresá el código</Text>
          <Text style={s.subtitle}>Lo enviamos a{'\n'}<Text style={s.email}>{email}</Text></Text>

          <TextInput
            style={s.codeInput}
            placeholder="000000"
            placeholderTextColor="#CBD5E1"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            value={code}
            onChangeText={(v) => {
              setCode(v);
              if (v.length === 6) {
                // auto-submit when complete
                setTimeout(() => verifyOtp(), 100);
              }
            }}
          />

          <TouchableOpacity onPress={resend}>
            <Text style={s.resend}>¿No llegó? Reenviar código</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.btn, (code.length !== 6 || loading) && s.btnDisabled]}
          onPress={verifyOtp}
          disabled={code.length !== 6 || loading}
        >
          <Text style={s.btnText}>{loading ? 'Verificando…' : 'Continuar'}</Text>
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
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  email: { color: '#0F172A', fontWeight: '600' },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 12,
    textAlign: 'center',
  },
  resend: { color: '#00C87A', fontSize: 14, textAlign: 'center' },
  btn: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
