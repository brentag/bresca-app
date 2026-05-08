-- S-10: limpieza automática de QR tokens expirados/revocados
-- Los tokens inválidos se filtran en consulta por RLS, pero se acumulan en tabla indefinidamente.
-- Esta función los elimina 7 días después de que expiran o son revocados.

CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.qr_tokens
  WHERE (expires_at  < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');
END;
$$;

-- Todos los días a las 03:00 UTC (madrugada Argentina)
SELECT cron.schedule(
  'cleanup-qr-tokens',
  '0 3 * * *',
  'SELECT public.cleanup_expired_qr_tokens()'
);
