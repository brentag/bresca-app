import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { emitEvent } from '../lib/emit-event';

const router = Router();

const UpdateStudySchema = z.object({
  study_type:       z.string().min(1).max(200).optional(),
  category:         z.enum(['hematología', 'bioquímica', 'imágenes', 'cardiología', 'endocrinología', 'respiratorio', 'receta', 'otro']).optional(),
  study_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lab_name:         z.string().max(200).nullable().optional(),
  extracted_fields: z.record(z.string(), z.string()).optional(),
}).strict();

// PATCH /studies/:id — edita campos de un estudio confirmado
router.patch('/:id', requireAuth, async (req, res) => {
  const parse = UpdateStudySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const userId: string = res.locals.userId;
  const studyId = req.params.id as string;

  const { data: study } = await supabase
    .from('studies')
    .select('id, profile_id')
    .eq('id', studyId)
    .single();

  if (!study) {
    res.status(404).json({ error: 'study_not_found' });
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', study.profile_id)
    .or(`user_id.eq.${userId},owner_user_id.eq.${userId}`)
    .maybeSingle();

  if (!profile) {
    res.status(403).json({ error: 'access_denied' });
    return;
  }

  const d = parse.data;
  const update: Record<string, unknown> = {};
  if (d.study_type       !== undefined) update.study_type       = d.study_type;
  if (d.category         !== undefined) update.category         = d.category;
  if (d.study_date       !== undefined) update.study_date       = d.study_date;
  if (d.lab_name         !== undefined) update.lab_name         = d.lab_name;
  if (d.extracted_fields !== undefined) update.extracted_fields = d.extracted_fields;

  if (Object.keys(update).length === 0) {
    res.json({ ok: true });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('studies').update(update as any).eq('id', studyId);
  if (error) {
    res.status(500).json({ error: 'update_failed' });
    return;
  }

  emitEvent('study_updated', 'vault');
  res.json({ ok: true });
});

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
