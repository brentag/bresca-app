-- ============================================================
-- Refactor OCR async: study_drafts con status pipeline +
-- webhook trigger a Edge Function + pg_cron cleanup
-- ============================================================

-- ── 1. Columnas nuevas en study_drafts ──────────────────────
ALTER TABLE study_drafts
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN storage_path text,
  ADD COLUMN mime_type text,
  ADD COLUMN category text,
  ADD COLUMN study_type text,
  ADD COLUMN lab_name text,
  ADD COLUMN study_date date,
  ADD COLUMN error_log text,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN completed_at timestamptz;

-- raw_text deja de ser requerido al crear el draft (lo llena la Edge Function)
ALTER TABLE study_drafts ALTER COLUMN raw_text DROP NOT NULL;
ALTER TABLE study_drafts ALTER COLUMN raw_text SET DEFAULT '';

CREATE INDEX idx_study_drafts_status ON study_drafts(status, created_at)
  WHERE status IN ('pending', 'processing');

-- ── 2. RLS: cliente solo lee, service_role escribe ──────────
DROP POLICY "drafts_owner" ON study_drafts;

-- SELECT: el paciente lee sus propios drafts (necesario para Realtime)
CREATE POLICY "drafts_owner_select" ON study_drafts
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
-- INSERT / UPDATE / DELETE: sin policy → solo service_role puede

-- ── 3. Realtime: habilitar cambios en study_drafts ──────────
ALTER PUBLICATION supabase_realtime ADD TABLE study_drafts;

-- ── 4. pg_net: trigger webhook a Edge Function ───────────────
-- Requiere extensión pg_net (habilitada en Supabase Free).
-- Antes de activar esta migración, ejecutar manualmente en producción:
--   ALTER DATABASE postgres SET app.edge_ocr_url = 'https://<project_ref>.supabase.co/functions/v1/process-study-draft';
--   ALTER DATABASE postgres SET app.edge_webhook_secret = '<random-32-bytes-hex>';
-- Igual en staging con sus propios valores.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_ocr_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  edge_url text;
  edge_secret text;
BEGIN
  edge_url    := current_setting('app.edge_ocr_url',    true);
  edge_secret := current_setting('app.edge_webhook_secret', true);

  -- Si los settings no están configurados, no crashear — el draft
  -- queda en 'pending' y lo recoge el cron de reintento (ver paso 5).
  IF edge_url IS NULL OR edge_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || edge_secret
    ),
    body    := jsonb_build_object('draft_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER study_drafts_ocr_webhook
  AFTER INSERT ON study_drafts
  FOR EACH ROW EXECUTE FUNCTION trigger_ocr_job();

-- ── 5. pg_cron: cleanup + reintento de pending huérfanos ────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Limpia cada hora: expirados, fallidos >1h, processing >10min (Edge Function muerta)
SELECT cron.schedule(
  'cleanup_study_drafts',
  '17 * * * *',
  $$
  DELETE FROM study_drafts
  WHERE expires_at < now()
     OR (status = 'failed'     AND completed_at < now() - interval '1 hour')
     OR (status = 'processing' AND started_at   < now() - interval '10 minutes');
  $$
);
