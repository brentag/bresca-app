import { useEffect } from 'react';
import { supabase } from './supabase';

type Node = 'home' | 'vault' | 'upload' | 'copilot' | 'qr' | 'family' | 'cro' | 'api' | 'onboarding';

export function useTrackNode(node: Node): void {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.from('events').insert({ event_type: 'page_view', node }).then(() => {});
    });
  }, [node]);
}
