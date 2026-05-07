-- ============================================================
-- Bresca — Módulo Consentimiento, Feedback y Privacidad
-- Fase 1: DB Hardening
--
-- Cambios:
--   1. ENUMs: consent_action, feedback_context
--   2. Tabla nueva: legal_documents (versionado de T&C/Privacy)
--   3. Extender consent_audit: document_id, ip_address, user_agent,
--      integrity_hash, action. Elimina FK para permitir anonimización.
--      Agrega capas 'tc' y 'privacy' al CHECK constraint.
--   4. Tabla nueva: user_consent_state (proyección de estado rápida)
--   5. Tabla nueva: user_feedback (MVT — Capas A/B/C)
--   6. Trigger handle_account_deletion: anonimiza consent_audit
--      al borrar perfil (profile_id → md5-uuid, ip → 0.0.0.0)
--   7. RPC record_consent(): única vía de escritura en consent_audit
-- ============================================================

-- ── 1. ENUMs ─────────────────────────────────────────────────
CREATE TYPE consent_action AS ENUM ('grant', 'revoke');
CREATE TYPE feedback_context AS ENUM ('post_ocr', 'retention_check', 'fake_door_click');

-- ── 2. MAESTRO LEGAL (versionado) ───────────────────────────
CREATE TABLE legal_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL CHECK (type IN ('tc', 'privacy', 'research_cro')),
  version     TEXT        NOT NULL,
  content_url TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, version)
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_docs_authenticated_read" ON legal_documents
  FOR SELECT TO authenticated USING (is_active = true);

INSERT INTO legal_documents (type, version, content_url) VALUES
  ('tc',           '1.0', 'https://bresca.io/legal/tc-v1.0'),
  ('privacy',      '1.0', 'https://bresca.io/legal/privacy-v1.0'),
  ('research_cro', '1.0', 'https://bresca.io/legal/research-cro-v1.0');

-- ── 3. EXTENDER consent_audit ────────────────────────────────

-- Ampliar capas válidas para incluir aceptación de T&C y Privacy
ALTER TABLE consent_audit DROP CONSTRAINT IF EXISTS consent_audit_layer_check;
ALTER TABLE consent_audit ADD CONSTRAINT consent_audit_layer_check
  CHECK (layer IN ('research', 'therapeutic_area', 'specific_study', 'tc', 'privacy'));

-- Eliminar FK para permitir que el trigger de anonimización
-- sobrescriba profile_id sin violar integridad referencial
ALTER TABLE consent_audit DROP CONSTRAINT IF EXISTS consent_audit_profile_id_fkey;

ALTER TABLE consent_audit
  ADD COLUMN IF NOT EXISTS document_id     UUID REFERENCES legal_documents(id),
  ADD COLUMN IF NOT EXISTS ip_address      INET,
  ADD COLUMN IF NOT EXISTS user_agent      TEXT,
  ADD COLUMN IF NOT EXISTS integrity_hash  TEXT,
  ADD COLUMN IF NOT EXISTS action          consent_action;

-- ── 4. PROYECCIÓN DE ESTADO ───────────────────────────────────
CREATE TABLE user_consent_state (
  user_id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_accepted_tc          BOOLEAN     NOT NULL DEFAULT false,
  tc_document_id           UUID        REFERENCES legal_documents(id),
  cro_research_allowed     BOOLEAN     NOT NULL DEFAULT false,
  specific_studies_allowed UUID[]      NOT NULL DEFAULT '{}',
  last_updated             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_consent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_state_owner" ON user_consent_state
  FOR ALL USING (user_id = auth.uid());

-- Seed desde consent_audit existente (usuarios ya en producción).
-- has_accepted_tc = false para todos: deberán aceptar en el próximo
-- acceso cuando se active el Gateway de Consentimiento en el frontend.
-- Solo perfiles primarios (user_id IS NOT NULL); los perfiles de familia
-- no tienen auth.user propio, su consentimiento lo gestiona el owner.
INSERT INTO user_consent_state (user_id, cro_research_allowed, last_updated)
SELECT
  p.user_id,
  COALESCE((
    SELECT ca.granted
    FROM consent_audit ca
    WHERE ca.profile_id = p.id AND ca.layer = 'research'
    ORDER BY ca.created_at DESC
    LIMIT 1
  ), false),
  now()
FROM profiles p
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ── 5. MÓDULO DE FEEDBACK ─────────────────────────────────────
CREATE TABLE user_feedback (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  context    feedback_context NOT NULL,
  rating     INTEGER          CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  metadata   JSONB            NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_owner_insert" ON user_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_owner_select" ON user_feedback
  FOR SELECT USING (user_id = auth.uid());

-- ── 6. TRIGGER DE ANONIMIZACIÓN ──────────────────────────────

-- Permite que el trigger de borrado actualice consent_audit
-- a pesar del bloqueo append-only existente.
CREATE OR REPLACE FUNCTION block_consent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.anonymizing', true) = 'true' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'consent_audit es append-only — no se permiten UPDATE ni DELETE';
END;
$$;

CREATE OR REPLACE FUNCTION handle_account_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_anon_id UUID;
BEGIN
  -- UUID anónimo estable: md5 del profile_id original.
  -- Anónimo (no reversible) pero único por perfil, auditable por período.
  v_anon_id := md5(OLD.id::text)::uuid;

  PERFORM set_config('app.anonymizing', 'true', true);

  UPDATE consent_audit
  SET
    profile_id  = v_anon_id,
    ip_address  = '0.0.0.0'::inet,
    user_agent  = '[account_deleted]'
  WHERE profile_id = OLD.id;

  PERFORM set_config('app.anonymizing', 'false', true);

  RETURN OLD;
END;
$$;

CREATE TRIGGER profiles_before_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_account_deletion();

-- ── 7. RPC record_consent() ───────────────────────────────────
-- Única vía válida de escritura en consent_audit.
-- Computa integrity_hash, actualiza user_consent_state, retorna el id del registro.
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
  -- Verifica que el perfil pertenece al usuario autenticado (incluye familia)
  SELECT p.user_id INTO v_user_id
  FROM profiles p
  WHERE p.id = p_profile_id
    AND (p.user_id = auth.uid() OR p.owner_user_id = auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found_or_unauthorized';
  END IF;

  -- Integrity hash: SHA256 de los campos clave del registro
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

  -- Inserción en el log inmutable
  INSERT INTO consent_audit (
    id, profile_id, layer, granted, action,
    document_id, area_id, study_id,
    ip_address, user_agent, integrity_hash
  ) VALUES (
    v_id, p_profile_id, p_layer, v_granted, p_action,
    p_document_id, p_area_id, p_study_id,
    p_ip_address, p_user_agent, v_hash
  );

  -- Actualizar proyección de estado según capa
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
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION record_consent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_consent TO authenticated;

-- ── ÍNDICES ───────────────────────────────────────────────────
CREATE INDEX idx_user_feedback_user_id  ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_context  ON user_feedback(context);
CREATE INDEX idx_consent_state_tc       ON user_consent_state(has_accepted_tc) WHERE has_accepted_tc = false;
CREATE INDEX idx_consent_state_cro      ON user_consent_state(cro_research_allowed) WHERE cro_research_allowed = true;
