import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.hero}>
        <View style={s.logoMark} />
        <Text style={s.brand}>bresca</Text>
        <Text style={s.tagline}>Tu historial médico,{'\n'}siempre contigo</Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(auth)/email')}>
          <Text style={s.btnPrimaryText}>Crear cuenta gratis</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btnSecondary} onPress={() => router.push('/(auth)/email')}>
          <Text style={s.btnSecondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>

        <Text style={s.legal}>
          Al continuar aceptás nuestros{' '}
          <Text style={s.legalLink}>Términos de uso</Text>
          {' '}y{' '}
          <Text style={s.legalLink}>Política de privacidad</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC', justifyContent: 'space-between', paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logoMark: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#00C87A' },
  brand: { fontSize: 32, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5 },
  tagline: { fontSize: 18, color: '#64748B', textAlign: 'center', lineHeight: 26 },
  actions: { paddingBottom: 16, gap: 12 },
  btnPrimary: { backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  btnSecondaryText: { color: '#0F172A', fontSize: 16, fontWeight: '500' },
  legal: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  legalLink: { color: '#00C87A' },
});
