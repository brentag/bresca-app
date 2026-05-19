import { createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '../lib/supabase';

const MAX_PER_DAY = parseInt(process.env.INBOUND_EMAIL_MAX_PER_DAY ?? '10', 10);

/**
 * Valida la firma del webhook de Postmark.
 * Postmark envía Authorization: Bearer <token> — el token es POSTMARK_INBOUND_SECRET.
 * Para mayor seguridad usamos timingSafeEqual para evitar timing attacks.
 */
export function validatePostmarkAuth(authHeader: string | undefined): boolean {
  const secret = process.env.POSTMARK_INBOUND_SECRET;
  if (!secret) return false;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const provided = authHeader.slice(7);
  try {
    // Comparación en tiempo constante
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Alternativa: validar mediante HMAC-SHA256 del raw body si Postmark lo configura así.
 * Disponible para futuras integraciones con otros providers.
 */
export function validateHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Busca el user_id correspondiente al email del remitente en auth.users. */
export async function lookupUserByEmail(email: string): Promise<string | null> {
  // auth.users no es accesible desde el cliente anon — requiere service_role
  const { data, error } = await supabase
    .rpc('get_user_id_by_email', { p_email: email.toLowerCase().trim() });
  if (error || !data) return null;
  return data as string;
}

/** Obtiene el profile propio del usuario (user_id = userId, no familiar). */
export async function getOwnProfile(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .is('owner_user_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Verifica el rate limit del usuario contra la tabla inbound_email_log en DB.
 * Retorna true si el usuario está dentro del límite (puede recibir más emails).
 * Rate limit en DB (no en memoria) — sobrevive restarts del servidor en Render.
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('inbound_email_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('status', 'eq', 'rejected')
    .gte('received_at', new Date(Date.now() - 86_400_000).toISOString());
  if (error) return true; // En caso de error de DB, permitir por defecto
  return (count ?? 0) < MAX_PER_DAY;
}
