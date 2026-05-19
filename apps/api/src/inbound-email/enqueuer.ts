import { randomUUID } from 'crypto';
import { extname } from 'path';
import { supabase } from '../lib/supabase';
import type { InboundContext, ParsedAttachment } from './types';

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf':   '.pdf',
  'image/jpeg':        '.jpg',
  'image/png':         '.png',
  'image/webp':        '.webp',
  'image/gif':         '.gif',
  'application/dicom': '.dcm',
};

/**
 * Sube un archivo a Supabase Storage y encola un study_draft con source='email'.
 * El trigger pg_net en study_drafts dispara la Edge Function OCR automáticamente
 * (mismo pipeline que el upload manual — no hay que llamar a la Edge Function directamente).
 *
 * Retorna el draft_id creado.
 */
export async function enqueueFileForOCR(
  file: ParsedAttachment,
  context: InboundContext,
): Promise<string> {
  // Path en Storage: {userId}/{uuid}{ext}
  const ext = MIME_TO_EXT[file.mimeType]
    ?? extname(file.name).toLowerCase()
    ?? '';
  const storagePath = `${context.userId}/${randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('studies')
    .upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`storage_upload_failed: ${uploadError.message}`);
  }

  const { data: draft, error: draftError } = await supabase
    .from('study_drafts')
    .insert({
      profile_id:    context.profileId,
      storage_path:  storagePath,
      storage_paths: [storagePath],
      mime_type:     file.mimeType,
      status:        'pending',
      source:        'email',
    })
    .select('id')
    .single();

  if (draftError || !draft) {
    // Intentar limpiar el archivo subido si el draft falla
    await supabase.storage.from('studies').remove([storagePath]).catch(() => {});
    throw new Error(`draft_insert_failed: ${draftError?.message ?? 'unknown'}`);
  }

  return draft.id;
}
