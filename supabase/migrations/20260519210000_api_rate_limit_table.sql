-- S-C2: rate limit persistido en DB — sobrevive cold-starts y scale-out.
-- Reemplaza el bucket in-memory en apps/api/src/copilot/rate-limit.ts.
-- Cualquier instancia del API (Render free tier puede dormir y despertar) lee
-- el conteo real desde acá.

CREATE TABLE IF NOT EXISTS public.api_rate_limit (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope       TEXT         NOT NULL,   -- 'copilot' | 'support' | 'qr' | otros
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_lookup
  ON public.api_rate_limit (user_id, scope, created_at DESC);

-- RLS: solo service_role escribe/lee. El cliente nunca toca esta tabla.
ALTER TABLE public.api_rate_limit ENABLE ROW LEVEL SECURITY;

-- Sin policies = sin acceso para authenticated/anon. service_role bypassa RLS.

-- TTL cleanup helper: borra registros >2h. La query del API ya filtra por 1h.
CREATE OR REPLACE FUNCTION public.cleanup_api_rate_limit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_rate_limit
  WHERE created_at < now() - interval '2 hours';
END;
$$;

-- Schedule del cleanup cada 15 min — best effort; si pg_cron no está disponible
-- (entornos locales sin la extensión), se omite silenciosamente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup_api_rate_limit',
      '*/15 * * * *',
      $cron$SELECT public.cleanup_api_rate_limit();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si la extensión pg_cron no está habilitada en este entorno, ignorar.
  NULL;
END $$;
