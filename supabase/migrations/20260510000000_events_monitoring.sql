-- ============================================================
-- Bresca — Tabla de eventos para monitoreo operacional
-- Registra actividad por nodo del sistema (sin PII)
-- TTL 90 días via pg_cron
-- ============================================================

CREATE TABLE public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL CHECK (event_type IN (
                'page_view', 'upload_start', 'upload_complete',
                'copilot_query', 'qr_scan', 'ocr_complete',
                'cro_search', 'cro_view'
              )),
  node        text        NOT NULL CHECK (node IN (
                'home', 'vault', 'upload', 'copilot',
                'qr', 'family', 'cro', 'api', 'onboarding'
              )),
  profile_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_node_created_at ON public.events (node, created_at DESC);
CREATE INDEX idx_events_created_at      ON public.events (created_at DESC);
CREATE INDEX idx_events_event_type      ON public.events (event_type, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden insertar sus propios eventos (page_view, etc.)
CREATE POLICY "events_authenticated_insert" ON public.events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Solo service_role puede leer (backend + admin API)
CREATE POLICY "events_service_role_select" ON public.events
  FOR SELECT TO service_role USING (true);

-- Usuarios @bresca.io pueden leer para el panel de monitoreo
CREATE POLICY "events_bresca_admin_select" ON public.events
  FOR SELECT TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@bresca.io'
  );

-- pg_cron: purge de eventos con más de 90 días — diario a las 03:00 UTC
SELECT cron.schedule(
  'events-ttl-cleanup',
  '0 3 * * *',
  $$DELETE FROM public.events WHERE created_at < NOW() - INTERVAL '90 days'$$
);
