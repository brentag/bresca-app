import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function QRScreen() {
  const router = useRouter();
  const { token, expires_at } = useLocalSearchParams<{ token: string; expires_at: string }>();
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const deepLink = `bresca://qr/${token}`;
  const expiresDate = new Date(expires_at);
  const expiresLabel = expiresDate.toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  async function shareLink() {
    await Share.share({ message: deepLink, title: 'Mis estudios médicos — Bresca' });
  }

  async function revoke() {
    Alert.alert(
      'Revocar acceso',
      'El médico no podrá ver tus estudios después de esto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar', style: 'destructive', onPress: async () => {
            setRevoking(true);
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${API_URL}/qr/${token}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            setRevoking(false);
            setRevoked(true);
          },
        },
      ]
    );
  }

  if (revoked) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <Text style={s.revokedIcon}>🔒</Text>
          <Text style={s.revokedTitle}>Acceso revocado</Text>
          <Text style={s.revokedText}>El QR ya no es válido. Podés generar uno nuevo cuando lo necesites.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(app)/vault')}>
            <Text style={s.backBtnText}>Volver al Vault</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.replace('/(app)/vault')}>
          <Text style={s.navBack}>← Vault</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Código QR</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.body}>
        <Text style={s.subtitle}>Mostrá este QR al profesional de salud</Text>

        <View style={s.qrCard}>
          <QRCode value={deepLink} size={220} color="#0F172A" backgroundColor="#fff" />
        </View>

        <View style={s.expiryRow}>
          <Text style={s.expiryIcon}>⏱</Text>
          <Text style={s.expiryText}>Válido hasta el {expiresLabel}</Text>
        </View>

        <TouchableOpacity style={s.shareBtn} onPress={shareLink}>
          <Text style={s.shareBtnText}>Compartir enlace</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.revokeBtn, revoking && s.revokeBtnDisabled]}
          onPress={revoke}
          disabled={revoking}
        >
          <Text style={s.revokeBtnText}>{revoking ? 'Revocando…' : 'Revocar acceso'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  navBack: { color: '#64748B', fontSize: 15, width: 60 },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 20, paddingTop: 8 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  qrCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF9C3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  expiryIcon: { fontSize: 14 },
  expiryText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  shareBtn: { width: '100%', backgroundColor: '#00C87A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  revokeBtn: { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' },
  revokeBtnDisabled: { opacity: 0.4 },
  revokeBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '500' },
  revokedIcon: { fontSize: 48 },
  revokedTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  revokedText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: 8, backgroundColor: '#00C87A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
