-- ============================================================
-- Bresca — Fix de handle_account_deletion()
--
-- Síntoma: auth.admin.deleteUser() devuelve 500 "Database error
-- deleting user" para usuarios con consent_audit. Causa: el trigger
-- BEFORE DELETE ON profiles llamaba a UPDATE sobre consent_audit
-- que podía fallar (FK, RLS interna, u otro), abortando todo el
-- cascade y bloqueando el borrado del usuario.
--
-- Fix: envolver la anonimización en BEGIN/EXCEPTION. Si la anonimización
-- falla, se logea el error y se permite el DELETE del profile. La
-- auditoría queda parcial pero NO bloquea el derecho de borrado de
-- cuenta (Ley 25.326 — art. 16 derecho de supresión).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_account_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    PERFORM set_config('app.anonymizing', 'true', true);

    UPDATE consent_audit
    SET
      profile_id = OLD.anon_id,
      ip_address = '0.0.0.0'::inet,
      user_agent = '[account_deleted]'
    WHERE profile_id = OLD.id;

    PERFORM set_config('app.anonymizing', 'false', true);
  EXCEPTION WHEN OTHERS THEN
    -- Logea para diagnóstico en Postgres logs (visible en Supabase Dashboard → Logs).
    RAISE WARNING 'handle_account_deletion: anonimización falló para profile=% sqlstate=% err=%',
      OLD.id, SQLSTATE, SQLERRM;
    -- No re-raise: permitimos que el DELETE de profile proceda.
  END;

  RETURN OLD;
END;
$$;
