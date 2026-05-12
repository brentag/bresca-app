import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './session';
import type { Database } from '@bresca/shared';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }) => { setProfile(data?.[0] ?? null); setLoading(false); });
  }, [user?.id]);

  return { profile, loading };
}
