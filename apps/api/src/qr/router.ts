import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const router = Router();

const GenerateSchema = z.object({
  study_ids: z.array(z.string().uuid()).min(1).max(20),
  ttl_hours: z.number().int().min(1).max(168), // max 7 days
});

// POST /qr/generate — authenticated
router.post('/generate', requireAuth, async (req, res) => {
  const parse = GenerateSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'Invalid body' }); return; }

  const userId: string = res.locals.userId;
  const { study_ids, ttl_hours } = parse.data;

  // Verify all studies belong to this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  const { data: studies } = await supabase
    .from('studies')
    .select('id')
    .in('id', study_ids)
    .eq('profile_id', profile.id);

  if (!studies || studies.length !== study_ids.length) {
    res.status(403).json({ error: 'One or more studies do not belong to you' });
    return;
  }

  const expires_at = new Date(Date.now() + ttl_hours * 3_600_000).toISOString();

  const { data: qrToken, error } = await supabase
    .from('qr_tokens')
    .insert({ profile_id: profile.id, study_ids, expires_at })
    .select('token, expires_at')
    .single();

  if (error || !qrToken) { res.status(500).json({ error: 'Failed to create QR token' }); return; }

  res.json({ token: qrToken.token, expires_at: qrToken.expires_at });
});

// DELETE /qr/:token — revoke (authenticated)
router.delete('/:token', requireAuth, async (req, res) => {
  const userId: string = res.locals.userId;
  const token = req.params['token'] as string;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  const { error } = await supabase
    .from('qr_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .eq('profile_id', profile.id);

  if (error) { res.status(500).json({ error: 'Failed to revoke' }); return; }

  res.json({ ok: true });
});

// GET /qr/:token — public doctor view
router.get('/:token', async (req, res) => {
  const token = req.params['token'] as string;

  // Validate token
  const { data: qrToken } = await supabase
    .from('qr_tokens')
    .select('id, study_ids, expires_at, profile_id')
    .eq('token', token)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!qrToken) {
    res.status(404).json({ error: 'QR inválido o vencido' });
    return;
  }

  // Fetch studies (service role bypasses RLS — we already validated via qr_tokens)
  const { data: studies } = await supabase
    .from('studies')
    .select('id, study_type, category, study_date, lab_name, extracted_fields, confirmed')
    .in('id', qrToken.study_ids)
    .eq('confirmed', true);

  const SAFE_FIELDS = new Set([
    'Hemoglobina','Hematocrito','Leucocitos','Plaquetas','VCM','Glucosa','Creatinina',
    'Colesterol total','Triglicéridos','Ácido úrico','TSH','T4L','T3L','CVF','VEF1',
    'Relación VEF1/CVF','Ritmo','FC','QRS','Conclusión','Hallazgo','Técnica',
  ]);

  const safeStudies = (studies ?? []).map(s => ({
    ...s,
    extracted_fields: Object.fromEntries(
      Object.entries((s.extracted_fields as Record<string, unknown>) ?? {})
        .filter(([k]) => SAFE_FIELDS.has(k))
    ),
  }));

  res.json({ studies: safeStudies, expires_at: qrToken.expires_at });
});

export default router;
