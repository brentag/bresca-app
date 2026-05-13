import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { emitEvent } from '../lib/emit-event';

const router = Router();

const MoveSchema = z.object({
  target_profile_id: z.string().uuid(),
});

// PATCH /studies/:id/move — mueve un estudio a otro perfil del mismo usuario
router.patch('/:id/move', requireAuth, async (req, res) => {
  const parse = MoveSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const userId: string = res.locals.userId;
  const studyId = req.params.id as string;
  const { target_profile_id } = parse.data;

  // Verificar que el estudio existe y pertenece a un perfil del usuario
  const { data: study } = await supabase
    .from('studies')
    .select('id, profile_id')
    .eq('id', studyId)
    .single();

  if (!study) {
    res.status(404).json({ error: 'study_not_found' });
    return;
  }

  const { data: sourceProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', study.profile_id)
    .or(`user_id.eq.${userId},owner_user_id.eq.${userId}`)
    .maybeSingle();

  if (!sourceProfile) {
    res.status(403).json({ error: 'access_denied' });
    return;
  }

  if (study.profile_id === target_profile_id) {
    res.json({ ok: true }); // no-op
    return;
  }

  // Verificar que el perfil destino también pertenece al usuario
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', target_profile_id)
    .or(`user_id.eq.${userId},owner_user_id.eq.${userId}`)
    .maybeSingle();

  if (!targetProfile) {
    res.status(403).json({ error: 'target_profile_access_denied' });
    return;
  }

  const { error } = await supabase
    .from('studies')
    .update({ profile_id: target_profile_id })
    .eq('id', studyId);

  if (error) {
    res.status(500).json({ error: 'move_failed' });
    return;
  }

  emitEvent('study_moved', 'vault');
  res.json({ ok: true, moved_to: targetProfile.display_name });
});

export default router;
