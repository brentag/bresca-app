import { supabase } from './supabase';

export async function buildUserContext(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return '';

  const [{ data: studies }, { count: familyCount }] = await Promise.all([
    supabase
      .from('studies')
      .select('category')
      .eq('profile_id', profile.id)
      .eq('confirmed', true),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId),
  ]);

  const totalStudies = studies?.length ?? 0;
  const byCategory: Record<string, number> = {};
  for (const s of studies ?? []) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
  }

  const catSummary = Object.entries(byCategory)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-AR', {
    month: 'short', year: 'numeric',
  });

  return [
    `Nombre: ${profile.display_name}`,
    `Miembro desde: ${memberSince}`,
    `Estudios en vault: ${totalStudies}${catSummary ? ` (${catSummary})` : ''}`,
    familyCount ? `Perfiles familiares: ${familyCount}` : null,
  ].filter(Boolean).join('\n');
}
