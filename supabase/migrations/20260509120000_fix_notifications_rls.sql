-- Corrige RLS de notifications que fallaba con "more than one row returned by subquery"
-- cuando el usuario tiene múltiples perfiles (perfil propio + perfiles familiares).
-- Cambia scalar = (subquery) → = ANY(subquery) para soportar múltiples perfiles.

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (
    profile_id = ANY(SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (
    profile_id = ANY(SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
