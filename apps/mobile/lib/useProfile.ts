import { useEffect, useState } from 'react';
import type { Database } from '@bresca/shared';
import { supabase } from './supabase';
import { useSession } from './session';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user?.id]);

  return { profile, loading };
}
