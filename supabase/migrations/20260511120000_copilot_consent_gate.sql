-- ============================================================
-- Bresca — Copilot Consent Gate
-- Agrega capa 'ai_copilot' al sistema de consentimiento existente
-- ============================================================

-- ── 1. Ampliar capas válidas en consent_audit ─────────────────
ALTER TABLE consent_audit DROP CONSTRAINT IF EXISTS consent_audit_layer_check;
ALTER TABLE consent_audit ADD CONSTRAINT consent_audit_layer_check
  CHECK (layer IN (
    'research', 'therapeutic_area', 'specific_study',
    'tc', 'privacy', 'ai_copilot'
  ));

-- ── 2. Columna en proyección de estado ───────────────────────
ALTER TABLE user_consent_state
  ADD COLUMN IF NOT EXISTS has_accepted_ai_copilot BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_consent_state_ai_copilot
  ON user_consent_state(has_accepted_ai_copilot)
  WHERE has_accepted_ai_copilot = false;

-- ── 3. Reemplazar record_consent() con soporte para ai_copilot
CREATE OR REPLACE FUNCTION record_consent(
  p_profile_id  UUID,
  p_layer       TEXT,
  p_action      consent_action,
  p_document_id UUID    DEFAULT NULL,
  p_area_id     TEXT    DEFAULT NULL,
  p_study_id    UUID    DEFAULT NULL,
  p_ip_address  INET    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_id      UUID    := gen_random_uuid();
  v_granted BOOLEAN := (p_action = 'grant');
  v_hash    TEXT;
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM profiles p
  WHERE p.id = p_profile_id
    AND (p.user_id = auth.uid() OR p.owner_user_id = auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found_or_unauthorized';
  END IF;

  v_hash := encode(
    digest(
      v_id::text
      || p_profile_id::text
      || COALESCE(p_document_id::text, '')
      || p_action::text
      || now()::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO consent_audit (
    id, profile_id, layer, granted, action,
    document_id, area_id, study_id,
    ip_address, user_agent, integrity_hash
  ) VALUES (
    v_id, p_profile_id, p_layer, v_granted, p_action,
    p_document_id, p_area_id, p_study_id,
    p_ip_address, p_user_agent, v_hash
  );

  INSERT INTO user_consent_state (user_id, last_updated)
    VALUES (v_user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_updated = now();

  IF p_layer = 'tc' THEN
    UPDATE user_consent_state
    SET
      has_accepted_tc = v_granted,
      tc_document_id  = CASE WHEN v_granted THEN p_document_id ELSE NULL END,
      last_updated    = now()
    WHERE user_id = v_user_id;

  ELSIF p_layer = 'research' THEN
    UPDATE user_consent_state
    SET cro_research_allowed = v_granted, last_updated = now()
    WHERE user_id = v_user_id;

  ELSIF p_layer = 'specific_study' AND p_study_id IS NOT NULL THEN
    IF v_granted THEN
      UPDATE user_consent_state
      SET
        specific_studies_allowed = array_append(
          array_remove(specific_studies_allowed, p_study_id),
          p_study_id
        ),
        last_updated = now()
      WHERE user_id = v_user_id;
    ELSE
      UPDATE user_consent_state
      SET
        specific_studies_allowed = array_remove(specific_studies_allowed, p_study_id),
        last_updated = now()
      WHERE user_id = v_user_id;
    END IF;

  ELSIF p_layer = 'ai_copilot' THEN
    UPDATE user_consent_state
    SET has_accepted_ai_copilot = v_granted, last_updated = now()
    WHERE user_id = v_user_id;

  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION record_consent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_consent TO authenticated;
