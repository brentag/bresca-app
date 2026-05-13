import { useEffect } from 'react';
import { supabase } from './supabase';

type Node = 'home' | 'vault' | 'upload' | 'copilot' | 'qr' | 'family' | 'cro' | 'api' | 'onboarding' | 'support';

function getOrCreateSessionId(): string {
  const key = 'bresca_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useTrackNode(node: Node): void {
  useEffect(() => {
    const session_id = getOrCreateSessionId();
    const startedAt = Date.now();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('events').insert({ event_type: 'page_view', node, session_id } as any).then(() => {});
    });

    return () => {
      const duration_ms = Date.now() - startedAt;
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.from('events').insert({ event_type: 'page_exit', node, session_id, duration_ms } as any).then(() => {});
      });
    };
  }, [node]);
}
