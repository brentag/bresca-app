import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// TS-023: patient_hash must never be accepted as an input parameter in any /cro/ endpoint.
// This prevents potential de-anonymization attacks where a caller could filter by a known hash.
function rejectPatientHash(req: Request, res: Response, next: NextFunction) {
  if ('patient_hash' in req.query || (req.body && 'patient_hash' in req.body)) {
    res.status(400).json({ error: 'patient_hash is not a valid input parameter' });
    return;
  }
  next();
}

// CRO access check — email must be in CRO_ALLOWED_EMAILS env var
async function requireCro(req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]) {
  await new Promise<void>((resolve) => requireAuth(req, res, () => resolve()));
  if (res.headersSent) return;

  const allowlist = (process.env.CRO_ALLOWED_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length === 0) {
    console.error('[cro] CRO_ALLOWED_EMAILS no configurado — acceso denegado');
    res.status(503).json({ error: 'Panel CRO no configurado' });
    return;
  }

  const { data } = await supabase.auth.admin.getUserById(res.locals.userId);
  const email = data.user?.email?.toLowerCase() ?? '';
  if (!allowlist.includes(email)) { res.status(403).json({ error: 'CRO access denied' }); return; }

  next();
}

// GET /cro/stats
router.get('/stats', requireCro, rejectPatientHash, async (_req, res) => {
  const [patientsRes, studiesRes, consentRes] = await Promise.all([
    supabase.from('cro_anonymous_patients').select('patient_hash', { count: 'exact', head: true }),
    supabase.from('studies').select('category', { count: 'exact' }).eq('confirmed', true),
    supabase.from('consent_audit').select('id', { count: 'exact', head: true }).eq('layer', 'research').eq('granted', true).is('revoked_at', null),
  ]);

  const studiesByCategory: Record<string, number> = {};
  for (const s of studiesRes.data ?? []) {
    studiesByCategory[s.category] = (studiesByCategory[s.category] ?? 0) + 1;
  }

  res.json({
    total_patients: patientsRes.count ?? 0,
    total_studies: studiesRes.count ?? 0,
    active_consents: consentRes.count ?? 0,
    studies_by_category: studiesByCategory,
  });
});

// GET /cro/patients?page=0&limit=50
router.get('/patients', requireCro, rejectPatientHash, async (req, res) => {
  const page = Math.max(0, Number(req.query['page']) || 0);
  const limit = Math.min(100, Number(req.query['limit']) || 50);

  const { data, count } = await supabase
    .from('cro_anonymous_patients')
    .select('*', { count: 'exact' })
    .range(page * limit, page * limit + limit - 1);

  res.json({ patients: data ?? [], total: count ?? 0, page, limit });
});

// GET /cro/distribution
router.get('/distribution', requireCro, rejectPatientHash, async (_req, res) => {
  const { data } = await supabase
    .from('studies')
    .select('category, study_type')
    .eq('confirmed', true);

  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const s of data ?? []) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    byType[s.study_type] = (byType[s.study_type] ?? 0) + 1;
  }

  res.json({
    by_category: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    by_type: Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
  });
});

// POST /cro/match
const MatchSchema = z.object({
  age_min: z.number().int().min(0).max(120).optional(),
  age_max: z.number().int().min(0).max(120).optional(),
  categories: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
});

router.post('/match', requireCro, rejectPatientHash, async (req, res) => {
  const parse = MatchSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'Invalid body' }); return; }

  const { age_min, age_max, categories } = parse.data;

  let query = supabase.from('cro_anonymous_patients').select('*');

  if (age_min !== undefined) query = query.gte('age_range', age_min);
  if (age_max !== undefined) query = query.lte('age_range', age_max);
  if (categories && categories.length > 0) {
    query = query.overlaps('study_categories', categories);
  }

  const { data } = await query.limit(200);
  res.json({ matches: data ?? [], count: data?.length ?? 0 });
});

export default router;
