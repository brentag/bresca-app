import { supabase } from './supabase';
import type { Database, Json } from '@bresca/shared';

type FeedbackContext = Database['public']['Enums']['feedback_context'];

export async function saveFeedback(
  userId: string,
  context: FeedbackContext,
  rating?: number,
  comment?: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  return supabase.from('user_feedback').insert({
    user_id:  userId,
    context,
    rating:   rating  ?? null,
    comment:  comment ?? null,
    metadata: (metadata ?? {}) as Json,
  });
}
