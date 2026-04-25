import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { CATEGORIES, type Study, formatStudyDate, categoryColor } from '../../lib/vault';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [stats, setStats] = useState({ total: 0, confirmed: 0 });
  const [recent, setRecent] = useState<Study[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!profile) return;

    Promise.all([
      supabase.from('studies').select('id, confirmed', { count: 'exact' }).eq('profile_id', profile.id),
      supabase.from('studies').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(3),
    ]).then(([statsRes, recentRes]) => {
      const all = statsRes.data ?? [];
      setStats({ total: all.length, confirmed: all.filter((s) => s.confirmed).length });
      setRecent(recentRes.data ?? []);
      setLoadingData(false);
    });
  }, [profile?.id]);

  if (profileLoading) {
    return <View style={s.center}><ActivityIndicator color="#00C87A" /></View>;
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'vos';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greet}>{greeting()},</Text>
            <Text style={s.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => router.push('/(app)/menu')}>
            <Text style={s.avatarText}>{firstName[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats card */}
        <View style={s.statsCard}>
          <StatItem value={stats.total} label="estudios" />
          <View style={s.statsDivider} />
          <StatItem value={stats.confirmed} label="confirmados" color="#00C87A" />
          <View style={s.statsDivider} />
          <StatItem value={stats.total - stats.confirmed} label="pendientes" color="#F59E0B" />
        </View>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Acciones rápidas</Text>
        <View style={s.actions}>
          <ActionCard
            icon="📤"
            label="Subir estudio"
            color="#E8FBF3"
            onPress={() => router.push('/(app)/vault/upload')}
          />
          <ActionCard
            icon="🤖"
            label="Preguntarle al Copilot"
            color="#EEF2FF"
            onPress={() => router.push('/(app)/copilot')}
          />
          <ActionCard
            icon="📋"
            label="Ver mi Vault"
            color="#FFF7ED"
            onPress={() => router.push('/(app)/vault')}
          />
          <ActionCard
            icon="👨‍👩‍👧"
            label="Perfiles familia"
            color="#FDF2F8"
            onPress={() => router.push('/(app)/family')}
          />
        </View>

        {/* Recent studies */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimos estudios</Text>
          {stats.total > 0 && (
            <TouchableOpacity onPress={() => router.push('/(app)/vault')}>
              <Text style={s.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingData ? (
          <ActivityIndicator color="#00C87A" style={{ marginTop: 16 }} />
        ) : recent.length === 0 ? (
          <View style={s.emptyRecent}>
            <Text style={s.emptyRecentText}>Todavía no subiste ningún estudio.</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/vault/upload')}>
              <Text style={s.emptyRecentLink}>Subir ahora →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.recentList}>
            {recent.map((study) => (
              <TouchableOpacity
                key={study.id}
                style={s.recentCard}
                onPress={() => router.push(`/(app)/vault/${study.id}`)}
                activeOpacity={0.7}
              >
                <View style={[s.recentDot, { backgroundColor: categoryColor(study.category) }]} />
                <View style={s.recentBody}>
                  <Text style={s.recentTitle} numberOfLines={1}>{study.study_type}</Text>
                  <Text style={s.recentDate}>{formatStudyDate(study.study_date)}</Text>
                </View>
                <Text style={s.recentArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label, color = '#0F172A' }: { value: number; label: string; color?: string }) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.actionCard, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={s.actionIcon}>{icon}</Text>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 20 },
  greet: { fontSize: 14, color: '#64748B' },
  name: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00C87A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 26, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#94A3B8' },
  statsDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#00C87A', fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionCard: { width: '47%', borderRadius: 14, padding: 16, gap: 10 },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A', lineHeight: 18 },
  recentList: { gap: 8 },
  recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  recentDot: { width: 10, height: 10, borderRadius: 5 },
  recentBody: { flex: 1 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  recentDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  recentArrow: { fontSize: 20, color: '#CBD5E1' },
  emptyRecent: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
  emptyRecentText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  emptyRecentLink: { fontSize: 14, color: '#00C87A', fontWeight: '600' },
});
