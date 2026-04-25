-- Corrige cro_anonymous_patients: k-anonimato vía window function
-- El HAVING count(DISTINCT p.id) >= 5 anterior era incorrecto (siempre 1 por grupo).
-- Ahora se cuenta cuántos pacientes comparten el mismo age_range bucket.

DROP VIEW IF EXISTS cro_anonymous_patients;

CREATE VIEW cro_anonymous_patients AS
WITH eligible AS (
  SELECT
    p.id,
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
  GROUP BY p.id, p.birth_year
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
  md5(id::text)    AS patient_hash,
  age_range,
  study_categories,
  study_types,
  last_study_date
FROM with_cohort
WHERE cohort_size >= 5;  -- k-anonimato mínimo: NUNCA cambiar a < 5

GRANT SELECT ON cro_anonymous_patients TO cro_reader;
