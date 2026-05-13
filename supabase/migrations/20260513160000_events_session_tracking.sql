-- ============================================================
-- Bresca — Tracking de sesión en tabla events
-- Agrega: session_id, duration_ms, eventos page_exit / support_query / study_moved
-- Nodo nuevo: 'support' (Asistente de Soporte XYZ)
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS session_id  uuid,
  ADD COLUMN IF NOT EXISTS duration_ms int;

-- Reemplazar CHECK de event_type con set ampliado
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'page_view', 'page_exit',
    'upload_start', 'upload_complete',
    'copilot_query', 'qr_scan', 'ocr_complete',
    'cro_search', 'cro_view',
    'support_query', 'study_moved'
  ));

-- Reemplazar CHECK de node con 'support' incluido
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_node_check;
ALTER TABLE public.events ADD CONSTRAINT events_node_check
  CHECK (node IN (
    'home', 'vault', 'upload', 'copilot',
    'qr', 'family', 'cro', 'api', 'onboarding', 'support'
  ));

-- Índices para análisis de sesión y journey
CREATE INDEX IF NOT EXISTS idx_events_session_id
  ON public.events(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_profile_session
  ON public.events(profile_id, session_id, created_at DESC)
  WHERE session_id IS NOT NULL;
