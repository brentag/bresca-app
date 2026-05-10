import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const router = Router();

async function requireBrescaAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Missing token' }); return; }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: 'Invalid token' }); return; }

  const email = data.user.email ?? '';
  if (!email.endsWith('@bresca.io')) { res.status(403).json({ error: 'Forbidden' }); return; }

  res.locals.userId = data.user.id;
  next();
}

// GET /admin/metrics?period=day|week|month
router.get('/metrics', requireBrescaAdmin, async (req, res) => {
  const period = (req.query['period'] as string) || 'day';
  if (!['day', 'week', 'month'].includes(period)) {
    res.status(400).json({ error: 'period must be day | week | month' });
    return;
  }

  const { data, error } = await db.rpc('get_kpis', { period });
  if (error) {
    console.error('[admin] get_kpis failed:', error.message);
    res.status(500).json({ error: 'metrics_unavailable' });
    return;
  }

  res.json(data);
});

// GET /admin/live — snapshot de eventos últimos 5 min por nodo
router.get('/live', requireBrescaAdmin, async (req, res) => {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('events')
    .select('node')
    .gte('created_at', since);

  if (error) {
    console.error('[admin] live failed:', error.message);
    res.status(500).json({ error: 'live_unavailable' });
    return;
  }

  const nodes: Record<string, number> = {};
  for (const row of (data ?? []) as { node: string }[]) {
    nodes[row.node] = (nodes[row.node] ?? 0) + 1;
  }

  res.json({ nodes, as_of: new Date().toISOString() });
});

export default router;
