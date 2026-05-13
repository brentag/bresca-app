-- ============================================================
-- Bresca — Notificaciones de vencimiento de recetas
-- Agrega: tipo 'prescription_expiring' a notifications
-- Función: notify_expiring_prescriptions()
-- pg_cron: diario 09:00 UTC
-- ============================================================

-- Ampliar CHECK de notifications.type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'study_processed', 'ocr_low_quality',
    'invitation_accepted', 'system',
    'prescription_expiring'
  ));

-- Función que inserta notificaciones para recetas próximas a vencer
CREATE OR REPLACE FUNCTION notify_expiring_prescriptions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec         RECORD;
  expiry_date DATE;
  days_until  INT;
BEGIN
  FOR rec IN
    SELECT s.id, s.profile_id, s.study_type, s.extracted_fields
    FROM   public.studies s
    WHERE  s.category  = 'receta'
      AND  s.confirmed = true
      AND  (s.extracted_fields->>'Válida hasta') IS NOT NULL
  LOOP
    BEGIN
      expiry_date := to_date(rec.extracted_fields->>'Válida hasta', 'YYYY-MM-DD');
      days_until  := expiry_date - CURRENT_DATE;

      IF days_until BETWEEN 1 AND 7 THEN
        -- Evitar notificación duplicada en la última semana
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE  n.profile_id = rec.profile_id
            AND  n.type       = 'prescription_expiring'
            AND  n.metadata->>'study_id' = rec.id::text
            AND  n.created_at > NOW() - INTERVAL '7 days'
        ) THEN
          INSERT INTO public.notifications (profile_id, type, title, body, metadata)
          VALUES (
            rec.profile_id,
            'prescription_expiring',
            'Receta por vencer',
            rec.study_type || ' vence en ' || days_until ||
              CASE WHEN days_until = 1 THEN ' día' ELSE ' días' END,
            jsonb_build_object('study_id', rec.id, 'days_until', days_until)
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fecha no parseable, saltar
    END;
  END LOOP;
END;
$$;

-- pg_cron: correr diariamente a las 09:00 UTC
SELECT cron.schedule(
  'prescription-expiry-notify',
  '0 9 * * *',
  $$SELECT notify_expiring_prescriptions()$$
);
