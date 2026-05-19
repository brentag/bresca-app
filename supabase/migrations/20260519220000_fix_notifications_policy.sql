-- DB-M1: notifications UPDATE solo permite cambiar la columna `read`.
-- Antes, la policy notifications_update_own no tenía WITH CHECK ni column-grant
-- restringido, así que un usuario malicioso podía sobreescribir title/body/type/metadata
-- de sus propias notifications (vandalismo de su propio inbox, pero abre puerta a
-- prompt-injection si esos campos se renderizan sin escape).
--
-- Fix: column-level grant — solo `read` es UPDATEABLE para authenticated.
-- service_role mantiene full access.

-- Revocar UPDATE general primero
REVOKE UPDATE ON public.notifications FROM authenticated;

-- Permitir UPDATE solo de la columna `read` para authenticated
GRANT UPDATE (read) ON public.notifications TO authenticated;

-- La policy notifications_update_own (definida en 20260509120000_fix_notifications_rls.sql)
-- ya restringe el UPDATE a filas donde profile_id pertenece al usuario.
-- Agregamos WITH CHECK por defensa en profundidad: aunque el column-grant ya
-- impide cambiar profile_id, el WITH CHECK asegura que si en el futuro se
-- expande el grant, la fila no pueda migrar a otro profile.
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (
    profile_id = ANY(SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id = ANY(SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- DB-B3: índice sobre profiles.email para acelerar lookups (Email-to-Vault,
-- futuras integraciones). Partial index para no indexar NULLs.
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email)
  WHERE email IS NOT NULL;
