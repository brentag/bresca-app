import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const router = Router();

const ExtractSchema = z.object({
  storage_path: z.string().min(1),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  category: z.string().min(1),
});

// POST /extract — encola el job de OCR, responde 202 {job_id} en <100ms
router.post('/', requireAuth, async (req, res) => {
  const parse = ExtractSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const userId = (req as unknown as { user: { id: string } }).user.id;

  // El storage_path sigue la convención `${user.id}/${ts}.${ext}` del frontend
  if (!parse.data.storage_path.startsWith(`${userId}/`)) {
    res.status(403).json({ error: 'storage_path_mismatch' });
    return;
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (profErr || !profile) {
    res.status(404).json({ error: 'profile_not_found' });
    return;
  }

  const { data: draft, error: insErr } = await supabase
    .from('study_drafts')
    .insert({
      profile_id:   profile.id,
      storage_path: parse.data.storage_path,
      mime_type:    parse.data.mime_type,
      category:     parse.data.category,
      status:       'pending',
    })
    .select('id')
    .single();

  if (insErr || !draft) {
    console.error('[extract] insert draft failed', insErr);
    res.status(500).json({ error: 'enqueue_failed' });
    return;
  }

  res.status(202).json({ job_id: draft.id });
});

export default router;
