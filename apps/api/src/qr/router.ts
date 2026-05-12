import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { checkRateLimit } from '../copilot/rate-limit';
import { emitEvent } from '../lib/emit-event';

const QR_MAX_PER_HOUR = 10;

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

  const { allowed } = checkRateLimit(`qr:${userId}`, QR_MAX_PER_HOUR);
  if (!allowed) {
    res.status(429).json({ error: 'Demasiados QR generados. Intentá de nuevo en una hora.' });
    return;
  }
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

  // Owner display_name para el copy "X te compartió por Bresca"
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', qrToken.profile_id)
    .single();

  // Fetch studies (service role bypasses RLS — we already validated via qr_tokens)
  const { data: studies } = await supabase
    .from('studies')
    .select('id, study_type, category, study_date, lab_name, extracted_fields, storage_path, storage_paths, confirmed')
    .in('id', qrToken.study_ids)
    .eq('confirmed', true);

  const SAFE_FIELDS = new Set([
    // Hemograma
    'Hemoglobina','Hematocrito','Leucocitos','Plaquetas','VCM','HCM','CHCM','RDW',
    'Neutrófilos','Linfocitos','Monocitos','Eosinófilos','Basófilos','Eritrocitos',
    // Bioquímica
    'Glucosa','Creatinina','Urea','Ácido úrico','Proteínas totales','Albúmina',
    'Bilirrubina total','Bilirrubina directa','Bilirrubina indirecta',
    // Lípidos
    'Colesterol total','Triglicéridos','HDL','LDL','VLDL','Colesterol/HDL',
    // Función hepática
    'TGO','TGP','AST','ALT','GGT','FAL','Fosfatasa alcalina',
    // Tiroides
    'TSH','T4L','T3L','T4 total','T3 total',
    // Electrolitos
    'Sodio','Potasio','Cloro','Calcio','Fósforo','Magnesio',
    // Coagulación
    'KPTT','Tiempo de protrombina','INR','Fibrinógeno',
    // Orina
    'Densidad','pH','Proteinuria','Glucosuria','Leucocituria',
    // Ferrocinética
    'Hierro sérico','Ferritina','Transferrina','TIBC','Saturación de transferrina',
    // Hormonas
    'FSH','LH','Estradiol','Testosterona','Prolactina','Cortisol','Insulina','HOMA',
    // Marcadores inflamación
    'PCR','VSG','Factor reumatoideo',
    // Función renal
    'Clearance de creatinina','Microalbuminuria',
    // Imágenes / ECG / Informes
    'Ritmo','FC','QRS','Conclusión','Hallazgo','Técnica',
    'Diagnóstico','Impresión diagnóstica','Modalidad','Parte del cuerpo','Resolución','Descripción',
  ]);

  // TTL para signed URLs: dura tanto como el token, max 7 días = 604800s.
  // Cuando expira el token la URL también vence — alineado por construcción.
  const ttlSeconds = Math.max(
    60,
    Math.floor((new Date(qrToken.expires_at).getTime() - Date.now()) / 1000),
  );

  const safeStudies = await Promise.all((studies ?? []).map(async s => {
    const raw = (s.extracted_fields as Record<string, unknown>) ?? {};
    const discarded = Object.keys(raw).filter(k => !SAFE_FIELDS.has(k));
    if (discarded.length > 0) {
      console.warn('[QR] campos descartados por SAFE_FIELDS', { study_id: s.id, discarded });
    }

    // Paths a firmar: prioriza storage_paths (multi-página), fallback a storage_path (legacy).
    const paths: string[] = (s.storage_paths as string[] | null)?.length
      ? (s.storage_paths as string[])
      : (s.storage_path ? [s.storage_path as string] : []);

    let files: { path: string; url: string; mime: string }[] = [];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from('studies').createSignedUrls(paths, ttlSeconds);
      files = (signed ?? [])
        .map((row, i) => ({
          path: paths[i] ?? '',
          url: row.signedUrl ?? '',
          mime: guessMime(paths[i] ?? ''),
        }))
        .filter(f => f.url.length > 0);
    }

    // No retornamos storage_path/storage_paths al cliente público — sólo signed URLs.
    const { storage_path: _sp, storage_paths: _sps, ...rest } = s as Record<string, unknown>;
    void _sp; void _sps;
    return {
      ...rest,
      extracted_fields: Object.fromEntries(
        Object.entries(raw).filter(([k]) => SAFE_FIELDS.has(k)),
      ),
      files,
    };
  }));

  emitEvent('qr_scan', 'qr');
  res.json({
    owner_name: ownerProfile?.display_name ?? null,
    studies: safeStudies,
    expires_at: qrToken.expires_at,
  });
});

function guessMime(path: string): string {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':  return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    case 'dcm':  return 'application/dicom';
    default:     return 'application/octet-stream';
  }
}

export default router;
