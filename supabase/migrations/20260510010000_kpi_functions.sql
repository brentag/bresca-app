-- ============================================================
-- Bresca — Función get_kpis para panel de monitoreo interno
-- Devuelve métricas acumuladas con comparación al período anterior
-- Uso: SELECT get_kpis('day' | 'week' | 'month')
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_kpis(period TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  int_current  INTERVAL;
  t_curr_start TIMESTAMPTZ;
  t_prev_start TIMESTAMPTZ;
  t_prev_end   TIMESTAMPTZ;

  v_users_curr   INT;
  v_users_prev   INT;
  v_upload_curr  INT;
  v_upload_prev  INT;
  v_copilot_curr INT;
  v_copilot_prev INT;
  v_qr_curr      INT;
  v_qr_prev      INT;
  v_ocr_curr     NUMERIC;
  v_ocr_prev     NUMERIC;
BEGIN
  CASE period
    WHEN 'day'   THEN int_current := INTERVAL '1 day';
    WHEN 'week'  THEN int_current := INTERVAL '7 days';
    WHEN 'month' THEN int_current := INTERVAL '30 days';
    ELSE RAISE EXCEPTION 'Invalid period: %. Use day | week | month', period;
  END CASE;

  t_curr_start := NOW() - int_current;
  t_prev_start := NOW() - (int_current * 2);
  t_prev_end   := t_curr_start;

  -- Nuevos usuarios — perfiles titulares (owner_user_id IS NULL)
  SELECT COUNT(*) INTO v_users_curr
    FROM profiles WHERE created_at >= t_curr_start AND owner_user_id IS NULL;
  SELECT COUNT(*) INTO v_users_prev
    FROM profiles WHERE created_at BETWEEN t_prev_start AND t_prev_end AND owner_user_id IS NULL;

  -- Estudios confirmados subidos
  SELECT COUNT(*) INTO v_upload_curr
    FROM studies WHERE confirmed = true AND created_at >= t_curr_start;
  SELECT COUNT(*) INTO v_upload_prev
    FROM studies WHERE confirmed = true AND created_at BETWEEN t_prev_start AND t_prev_end;

  -- Consultas al Copilot (vía events)
  SELECT COUNT(*) INTO v_copilot_curr
    FROM events WHERE event_type = 'copilot_query' AND created_at >= t_curr_start;
  SELECT COUNT(*) INTO v_copilot_prev
    FROM events WHERE event_type = 'copilot_query' AND created_at BETWEEN t_prev_start AND t_prev_end;

  -- Scans de QR
  SELECT COUNT(*) INTO v_qr_curr
    FROM events WHERE event_type = 'qr_scan' AND created_at >= t_curr_start;
  SELECT COUNT(*) INTO v_qr_prev
    FROM events WHERE event_type = 'qr_scan' AND created_at BETWEEN t_prev_start AND t_prev_end;

  -- Tasa de éxito OCR (score >= 70 sobre total confirmados con score)
  SELECT COALESCE(
    ROUND(100.0 * COUNT(*) FILTER (WHERE ocr_score >= 70) / NULLIF(COUNT(*) FILTER (WHERE ocr_score IS NOT NULL), 0), 1),
    0
  ) INTO v_ocr_curr
    FROM studies WHERE confirmed = true AND created_at >= t_curr_start;

  SELECT COALESCE(
    ROUND(100.0 * COUNT(*) FILTER (WHERE ocr_score >= 70) / NULLIF(COUNT(*) FILTER (WHERE ocr_score IS NOT NULL), 0), 1),
    0
  ) INTO v_ocr_prev
    FROM studies WHERE confirmed = true AND created_at BETWEEN t_prev_start AND t_prev_end;

  RETURN jsonb_build_object(
    'period', period,
    'new_users', jsonb_build_object(
      'current',    v_users_curr,
      'previous',   v_users_prev,
      'pct_change', CASE WHEN v_users_prev = 0 THEN NULL
                         ELSE ROUND(100.0 * (v_users_curr - v_users_prev) / v_users_prev, 1)
                    END
    ),
    'uploads', jsonb_build_object(
      'current',    v_upload_curr,
      'previous',   v_upload_prev,
      'pct_change', CASE WHEN v_upload_prev = 0 THEN NULL
                         ELSE ROUND(100.0 * (v_upload_curr - v_upload_prev) / v_upload_prev, 1)
                    END
    ),
    'copilot_queries', jsonb_build_object(
      'current',    v_copilot_curr,
      'previous',   v_copilot_prev,
      'pct_change', CASE WHEN v_copilot_prev = 0 THEN NULL
                         ELSE ROUND(100.0 * (v_copilot_curr - v_copilot_prev) / v_copilot_prev, 1)
                    END
    ),
    'qr_scans', jsonb_build_object(
      'current',    v_qr_curr,
      'previous',   v_qr_prev,
      'pct_change', CASE WHEN v_qr_prev = 0 THEN NULL
                         ELSE ROUND(100.0 * (v_qr_curr - v_qr_prev) / v_qr_prev, 1)
                    END
    ),
    'ocr_success_rate', jsonb_build_object(
      'current',    v_ocr_curr,
      'previous',   v_ocr_prev,
      'pct_change', CASE WHEN v_ocr_prev = 0 THEN NULL
                         ELSE ROUND(v_ocr_curr - v_ocr_prev, 1)
                    END
    )
  );
END;
$$;

-- Solo service_role puede ejecutar la función desde el admin router
REVOKE EXECUTE ON FUNCTION public.get_kpis(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_kpis(TEXT) TO service_role;
