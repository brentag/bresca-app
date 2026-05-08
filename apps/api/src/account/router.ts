import { Router } from 'express';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// DELETE /account — borra cuenta y todos los datos del usuario
// Cascade DB: auth.users → profiles → studies / drafts / qr_tokens / consent_audit (anonimizado por trigger)
router.delete('/', requireAuth, async (req, res) => {
  const userId: string = res.locals.userId;

  // 1. Eliminar archivos de storage del usuario
  const { data: files } = await supabase.storage.from('studies').list(userId, { limit: 1000 });
  if (files && files.length > 0) {
    const paths = files.map(f => `${userId}/${f.name}`);
    await supabase.storage.from('studies').remove(paths);
  }

  // 2. Eliminar usuario de auth → DB cascade elimina profiles → studies → drafts → qr_tokens
  //    El trigger BEFORE DELETE ON profiles anonymiza consent_audit antes del cascade
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[account] deleteUser failed:', error.message);
    res.status(500).json({ error: 'delete_failed' });
    return;
  }

  res.json({ ok: true });
});

export default router;
