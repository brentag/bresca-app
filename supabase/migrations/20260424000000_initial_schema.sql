-- ============================================================
-- Bresca — Migración inicial
-- Tablas: profiles, studies, study_drafts, qr_tokens, consent_audit
-- RLS activo en todas las tablas
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  birth_year   int,
  conditions   text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (user_id = auth.uid());

-- ── STUDIES ─────────────────────────────────────────────────
CREATE TABLE studies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  study_type       text NOT NULL,
  category         text NOT NULL,
  study_date       date NOT NULL,
  lab_name         text,
  extracted_fields jsonb NOT NULL DEFAULT '{}',
  confirmed        boolean NOT NULL DEFAULT false,
  storage_path     text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studies_owner" ON studies
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ── STUDY DRAFTS (TTL 24h) ───────────────────────────────────
CREATE TABLE study_drafts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_text         text NOT NULL,
  extracted_fields jsonb NOT NULL DEFAULT '{}',
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drafts_owner" ON study_drafts
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ── QR TOKENS ────────────────────────────────────────────────
CREATE TABLE qr_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  study_ids  uuid[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_owner" ON qr_tokens
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Rol anon puede leer token válido (vista médico)
CREATE POLICY "qr_public_read" ON qr_tokens
  FOR SELECT TO anon USING (
    expires_at > now()
    AND revoked_at IS NULL
  );

-- Médico con QR válido puede leer estudios específicos
-- (definida aquí porque referencia qr_tokens que ya existe)
CREATE POLICY "studies_qr_read" ON studies
  FOR SELECT USING (
    id IN (
      SELECT unnest(study_ids)
      FROM qr_tokens
      WHERE token = current_setting('app.qr_token', true)
        AND expires_at > now()
        AND revoked_at IS NULL
    )
  );

-- ── CONSENT AUDIT (append-only) ──────────────────────────────
CREATE TABLE consent_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  layer      text NOT NULL CHECK (layer IN ('research', 'therapeutic_area', 'specific_study')),
  area_id    text,
  study_id   uuid,
  granted    boolean NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_owner_insert" ON consent_audit
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "consent_owner_select" ON consent_audit
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger que bloquea UPDATE y DELETE (append-only enforced)
CREATE OR REPLACE FUNCTION block_consent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consent_audit es append-only — no se permiten UPDATE ni DELETE';
END;
$$;

CREATE TRIGGER consent_audit_no_update
  BEFORE UPDATE ON consent_audit
  FOR EACH ROW EXECUTE FUNCTION block_consent_mutation();

CREATE TRIGGER consent_audit_no_delete
  BEFORE DELETE ON consent_audit
  FOR EACH ROW EXECUTE FUNCTION block_consent_mutation();

-- ── VISTA DE ANONIMIZACIÓN CRO ───────────────────────────────
CREATE VIEW cro_anonymous_patients AS
SELECT
  md5(p.id::text)                            AS patient_hash,
  CASE
    WHEN p.birth_year IS NULL THEN NULL
    ELSE (date_part('year', now()) - p.birth_year)::int / 5 * 5
  END                                        AS age_range,
  array_agg(DISTINCT s.category)             AS study_categories,
  array_agg(DISTINCT s.study_type)           AS study_types,
  max(s.study_date)                          AS last_study_date
FROM profiles p
JOIN studies s ON s.profile_id = p.id AND s.confirmed = true
JOIN consent_audit ca
  ON ca.profile_id = p.id
  AND ca.layer = 'research'
  AND ca.granted = true
  AND ca.revoked_at IS NULL
GROUP BY p.id, p.birth_year
HAVING count(DISTINCT p.id) >= 5;  -- k-anonimato mínimo: NUNCA cambiar a < 5

-- Rol CRO solo ve la vista, nunca las tablas base
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cro_reader') THEN
    CREATE ROLE cro_reader;
  END IF;
END
$$;

GRANT SELECT ON cro_anonymous_patients TO cro_reader;
REVOKE ALL ON profiles, studies, study_drafts, qr_tokens, consent_audit FROM cro_reader;

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_studies_profile_id ON studies(profile_id);
CREATE INDEX idx_studies_confirmed ON studies(confirmed) WHERE confirmed = true;
CREATE INDEX idx_study_drafts_expires_at ON study_drafts(expires_at);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_consent_profile_layer ON consent_audit(profile_id, layer);
