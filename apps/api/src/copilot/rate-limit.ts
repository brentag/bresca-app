import { MAX_COPILOT_RPH } from '@bresca/shared';
import { supabase } from '../lib/supabase';

// NOTA: api_rate_limit fue agregada en migration 20260519210000_api_rate_limit_table.sql.
// Los types generados de Supabase (packages/shared/src/database.types.ts) deben
// regenerarse con `supabase gen types typescript --project-id mkacuagcvwxoduhdthwg`
// después de aplicar la migración. Hasta entonces, casteamos a `any` localmente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// S-C2: rate limit persistido en DB (tabla api_rate_limit) — sobrevive
// cold-starts del free tier de Render y scale-out futuro. Antes era un
// Map<string,Bucket> in-memory que se perdía cada restart.
//
// Compatibilidad: los callers actuales esperan { allowed, remaining }.
// Parseamos `key` con prefijo opcional ('qr:<userId>', 'support:<userId>')
// para extraer userId y scope. Si no hay prefijo, asumimos scope='copilot'.

type RateLimitResult = { allowed: boolean; remaining: number };

function parseKey(key: string): { userId: string; scope: string } {
  const idx = key.indexOf(':');
  if (idx === -1) return { userId: key, scope: 'copilot' };
  return { scope: key.slice(0, idx), userId: key.slice(idx + 1) };
}

/**
 * Verifica y consume una unidad del rate-limit del usuario para el scope dado.
 *
 * - Lee el conteo de la última hora desde public.api_rate_limit.
 * - Si está bajo el límite, hace INSERT y retorna allowed=true.
 * - Si está sobre el límite, NO inserta y retorna allowed=false.
 *
 * Si el INSERT falla por un error de DB, devolvemos allowed=true y
 * remaining=maxPerHour-1 (fail-open) — un downtime de DB no debe romper la
 * funcionalidad del Copilot. La integridad del rate limit no es crítica para
 * seguridad: lo crítico (consent, RLS) está fuera de esta función.
 *
 * NOTA: el `key` puede ser:
 *  - Solo el userId (compat copilot: checkRateLimit(userId))
 *  - 'scope:userId' (qr, support)
 */
export async function checkRateLimit(
  key: string,
  maxPerHour: number = MAX_COPILOT_RPH,
): Promise<RateLimitResult> {
  const { userId, scope } = parseKey(key);
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { count, error: countErr } = await db
    .from('api_rate_limit')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('scope', scope)
    .gte('created_at', oneHourAgo);

  if (countErr) {
    // Fail-open ante error de DB — log pero no bloquear al usuario.
    console.error('[rate-limit] count failed:', countErr.message);
    return { allowed: true, remaining: maxPerHour - 1 };
  }

  const current = count ?? 0;
  if (current >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  const { error: insErr } = await db
    .from('api_rate_limit')
    .insert({ user_id: userId, scope });

  if (insErr) {
    // Fail-open: log pero permitir.
    console.error('[rate-limit] insert failed:', insErr.message);
    return { allowed: true, remaining: maxPerHour - current - 1 };
  }

  return { allowed: true, remaining: maxPerHour - current - 1 };
}
