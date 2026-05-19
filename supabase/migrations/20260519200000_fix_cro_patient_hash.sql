-- S-C1 + S-A2: cro_anonymous_patients usa anon_id (UUID aleatorio, no derivable
-- del id original) y deja de estar expuesto a roles 'authenticated' o 'anon'.
-- Reemplaza md5(p.id::text) — reversible si se conoce el UUID — por p.anon_id (UUID irreversible).
-- profiles.anon_id ya existe desde 20260508120000_anon_id_profiles.sql.

DROP VIEW IF EXISTS cro_anonymous_patients;

CREATE VIEW cro_anonymous_patients
WITH (security_invoker = true) AS
WITH eligible AS (
  SELECT
    p.id,
    p.anon_id,
    p.birth_year,
    array_agg(DISTINCT s.category)   AS study_categories,
    array_agg(DISTINCT s.study_type) AS study_types,
    max(s.study_date)                AS last_study_date
  FROM profiles p
  JOIN studies s
    ON s.profile_id = p.id AND s.confirmed = true
  JOIN consent_audit ca
    ON ca.profile_id = p.id
   AND ca.layer = 'research'
   AND ca.granted = true
   AND ca.revoked_at IS NULL
  GROUP BY p.id, p.anon_id, p.birth_year
),
with_cohort AS (
  SELECT
    *,
    CASE
      WHEN birth_year IS NULL THEN NULL
      ELSE (date_part('year', now()) - birth_year)::int / 5 * 5
    END AS age_range,
    count(*) OVER (
      PARTITION BY
        CASE
          WHEN birth_year IS NULL THEN NULL
          ELSE (date_part('year', now()) - birth_year)::int / 5 * 5
        END
    ) AS cohort_size
  FROM eligible
)
SELECT
  anon_id::text     AS patient_hash,  -- UUID aleatorio (no derivable de p.id)
  age_range,
  study_categories,
  study_types,
  last_study_date
FROM with_cohort
WHERE cohort_size >= 5;  -- k-anonimato mínimo: NUNCA cambiar a < 5

-- Revocar acceso a roles no autorizados.
-- Antes 'authenticated' (cualquier usuario logueado) podía leer la vista directamente.
-- Ahora solo service_role (apps/api con CRO allowlist) y cro_reader (si existe).
REVOKE ALL ON cro_anonymous_patients FROM authenticated, anon, PUBLIC;
GRANT SELECT ON cro_anonymous_patients TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cro_reader') THEN
    GRANT SELECT ON cro_anonymous_patients TO cro_reader;
  END IF;
END $$;
