import { supabase } from './supabase';

type EventType =
  | 'page_view'
  | 'page_exit'
  | 'upload_start'
  | 'upload_complete'
  | 'copilot_query'
  | 'qr_scan'
  | 'ocr_complete'
  | 'cro_search'
  | 'cro_view'
  | 'support_query'
  | 'study_moved';

type Node = 'home' | 'vault' | 'upload' | 'copilot' | 'qr' | 'family' | 'cro' | 'api' | 'onboarding' | 'support';

export function emitEvent(
  event_type: EventType,
  node: Node,
  profile_id?: string,
  metadata: Record<string, unknown> = {},
): void {
  // Fire-and-forget — nunca bloquea el response principal
  supabase
    .from('events')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ event_type, node, profile_id: profile_id ?? null, metadata: metadata as any })
    .then(({ error }) => {
      if (error) console.error('[events] emit failed:', error.message);
    });
}
