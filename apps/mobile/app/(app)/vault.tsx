import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { CATEGORIES, type CategoryFilter, type Study, categoryColor, formatStudyDate } from '../../lib/vault';

export default function VaultScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!profile) return;
    setLoading(true);

    let q = supabase
      .from('studies')
      .select('*')
      .eq('profile_id', profile.id)
      .order('study_date', { ascending: false });

    if (filter !== 'all') q = q.eq('category', filter);

    q.then(({ data }) => {
      setStudies(data ?? []);
      setLoading(false);
    });
  }, [profile?.id, filter]);

  const filtered = studies; // already filtered server-side

  if (profileLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#00C87A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Mi Vault</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={() => router.push('/(app)/vault/upload')}>
          <Text style={s.uploadBtnText}>+ Subir</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[s.chip, filter === cat.id && s.chipActive]}
            onPress={() => setFilter(cat.id)}
          >
            <Text style={[s.chipText, filter === cat.id && s.chipTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#00C87A" />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={() => router.push('/(app)/vault/upload')} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <StudyCard study={item} onPress={() => router.push(`/(app)/vault/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function StudyCard({ study, onPress }: { study: Study; onPress: () => void }) {
  const color = categoryColor(study.category);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.cardAccent, { backgroundColor: color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardTitle} numberOfLines={1}>{study.study_type}</Text>
          <View style={[s.badge, study.confirmed ? s.badgeConfirmed : s.badgePending]}>
            <Text style={[s.badgeText, study.confirmed ? s.badgeTextConfirmed : s.badgeTextPending]}>
              {study.confirmed ? 'Confirmado' : 'Pendiente'}
            </Text>
          </View>
        </View>
        <Text style={s.cardDate}>{formatStudyDate(study.study_date)}</Text>
        {study.lab_name && <Text style={s.cardLab}>{study.lab_name}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>🗂</Text>
      <Text style={s.emptyTitle}>Tu vault está vacío</Text>
      <Text style={s.emptyText}>Subí tu primer estudio médico y quedará guardado de forma segura.</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onUpload}>
        <Text style={s.emptyBtnText}>Subir estudio</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  uploadBtn: { backgroundColor: '#00C87A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  chips: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  cardDate: { fontSize: 13, color: '#64748B' },
  cardLab: { fontSize: 12, color: '#94A3B8' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeConfirmed: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextConfirmed: { color: '#16A34A' },
  badgeTextPending: { color: '#D97706' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: '#00C87A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
