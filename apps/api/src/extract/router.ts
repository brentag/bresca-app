import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { emitEvent } from '../lib/emit-event';

const router = Router();

const ExtractSchema = z.object({
  storage_paths: z.array(z.string().min(1)).min(1).max(20),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']),
  category: z.string().min(1),
  profile_id: z.string().uuid().optional(), // perfil familiar — omitir para perfil propio
});

// POST /extract — encola el job de OCR, responde 202 {job_id} en <100ms
router.post('/', requireAuth, async (req, res) => {
  const parse = ExtractSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const userId: string = res.locals.userId;

  // Todos los paths deben pertenecer al usuario autenticado
  if (!parse.data.storage_paths.every(p => p.startsWith(`${userId}/`))) {
    res.status(403).json({ error: 'storage_path_mismatch' });
    return;
  }

  let targetProfileId: string;

  if (parse.data.profile_id) {
    // Perfil familiar: verificar que el usuario sea el owner
    const { data: familyProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', parse.data.profile_id)
      .eq('owner_user_id', userId)
      .maybeSingle();

    if (!familyProfile) {
      res.status(403).json({ error: 'profile_access_denied' });
      return;
    }
    targetProfileId = familyProfile.id;
  } else {
    // Perfil propio
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profErr || !profile) {
      res.status(404).json({ error: 'profile_not_found' });
      return;
    }
    targetProfileId = profile.id;
  }

  const { data: draft, error: insErr } = await supabase
    .from('study_drafts')
    .insert({
      profile_id:    targetProfileId,
      storage_path:  parse.data.storage_paths[0],   // primary (trigger + backward compat)
      storage_paths: parse.data.storage_paths,
      mime_type:     parse.data.mime_type,
      category:      parse.data.category,
      status:        'pending',
    })
    .select('id')
    .single();

  if (insErr || !draft) {
    console.error('[extract] insert draft failed:', insErr?.code ?? 'unknown');
    res.status(500).json({ error: 'enqueue_failed' });
    return;
  }

  emitEvent('upload_start', 'upload');
  res.status(202).json({ job_id: draft.id });
});

export default router;
