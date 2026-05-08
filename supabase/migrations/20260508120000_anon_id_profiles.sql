-- S-08: reemplazar anonimización MD5 por UUID aleatorio persistido.
-- MD5(profile_id) es reversible si se conoce el UUID original.
-- gen_random_uuid() garantiza irreversibilidad sin sacrificar unicidad.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anon_id UUID DEFAULT gen_random_uuid();

-- Backfill: perfiles existentes reciben un UUID nuevo (mejor que nada vs MD5).
UPDATE public.profiles
  SET anon_id = gen_random_uuid()
  WHERE anon_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN anon_id SET NOT NULL;

-- Index para búsquedas CRO por anon_id (ya que MD5 era el identificador en consent_audit).
CREATE INDEX IF NOT EXISTS idx_profiles_anon_id ON public.profiles(anon_id);

-- Actualizar handle_account_deletion() para usar el anon_id persistido
-- en lugar de recalcular md5 en tiempo de borrado.
CREATE OR REPLACE FUNCTION handle_account_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.anonymizing', 'true', true);

  UPDATE consent_audit
  SET
    profile_id  = OLD.anon_id,
    ip_address  = '0.0.0.0'::inet,
    user_agent  = '[account_deleted]'
  WHERE profile_id = OLD.id;

  PERFORM set_config('app.anonymizing', 'false', true);

  RETURN OLD;
END;
$$;
