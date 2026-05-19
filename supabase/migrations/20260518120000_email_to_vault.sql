-- Email-to-Vault: tabla de métricas, columna source en drafts/studies, nuevos event types
-- Módulo completamente aislado del pipeline OCR existente.

-- 1. Columna source en study_drafts y studies
ALTER TABLE study_drafts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'
    CHECK (source IN ('upload', 'email', 'transfer'));

ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'
    CHECK (source IN ('upload', 'email', 'transfer'));

-- 2. Tabla inbound_email_log — métricas separadas del core
CREATE TABLE IF NOT EXISTS inbound_email_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_email           TEXT NOT NULL,
  to_address           TEXT NOT NULL,
  subject              TEXT,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  status               TEXT NOT NULL DEFAULT 'queued'
                         CHECK (status IN ('queued','processing','completed','failed','rejected')),
  rejection_reason     TEXT,
  attachment_count     INT DEFAULT 0,
  attachment_bytes     BIGINT DEFAULT 0,
  links_found          INT DEFAULT 0,
  links_downloaded     INT DEFAULT 0,
  draft_ids            UUID[] DEFAULT '{}',
  parse_duration_ms    INT,
  upload_duration_ms   INT,
  download_duration_ms INT,
  total_duration_ms    INT,
  error_detail         TEXT,
  source_ip            INET,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- RLS: solo service_role puede leer/escribir (el módulo usa service_role key)
ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_email_log_service_role_only" ON inbound_email_log
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Índices para consultas de métricas y rate-limiting
CREATE INDEX IF NOT EXISTS idx_inbound_email_user_day
  ON inbound_email_log(user_id, received_at)
  WHERE status NOT IN ('rejected');

CREATE INDEX IF NOT EXISTS idx_inbound_email_status
  ON inbound_email_log(status);

CREATE INDEX IF NOT EXISTS idx_inbound_email_from
  ON inbound_email_log(from_email);

-- 3. Función SECURITY DEFINER para lookup de auth.users por email
-- Necesaria porque auth.users no es accesible con el cliente anon key.
-- La API usa service_role, pero usamos una función para mantener el patrón consistente.
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Solo la función puede ser llamada desde service_role
REVOKE ALL ON FUNCTION get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO service_role;

-- 4. Nuevos event_type permitidos
-- Eliminar constraint anterior y recrear con los nuevos tipos incluidos
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'page_view','upload_start','upload_complete','copilot_query',
    'qr_scan','ocr_complete','cro_search','cro_view',
    'page_exit','study_moved','study_updated','support_query',
    'email_inbound_start','email_inbound_complete','email_inbound_failed'
  ));
