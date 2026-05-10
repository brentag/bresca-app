import { supabase } from './supabase';

type EventType =
  | 'page_view'
  | 'upload_start'
  | 'upload_complete'
  | 'copilot_query'
  | 'qr_scan'
  | 'ocr_complete'
  | 'cro_search'
  | 'cro_view';

type Node = 'home' | 'vault' | 'upload' | 'copilot' | 'qr' | 'family' | 'cro' | 'api' | 'onboarding';

export function emitEvent(
  event_type: EventType,
  node: Node,
  profile_id?: string,
  metadata: Record<string, unknown> = {},
): void {
  // Fire-and-forget — nunca bloquea el response principal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  db.from('events')
    .insert({ event_type, node, profile_id: profile_id ?? null, metadata })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error('[events] emit failed:', error.message);
    });
}
