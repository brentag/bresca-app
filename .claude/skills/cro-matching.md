# Skill: cro-matching
> Cargar cuando: trabajás en el panel CRO, implementás el fit score, tocás las vistas anónimas, o construís el flujo de invitación a estudio.

## Principio de anonimización

El CRO **nunca** recibe datos identificables. La identidad del paciente se revela **solo** si el paciente acepta la invitación voluntariamente. Hasta ese momento, el CRO solo ve `patient_hash = md5(profile_id)`.

```
profile_id (UUID real)
  → md5(profile_id) = patient_hash (PAC-XXXX en UI)
  → No hay tabla de lookup accesible para el rol cro_reader
  → La API traduce patient_hash → profile_id SOLO para enviar la invitación
  → Esa traducción ocurre en el backend, nunca se expone al cliente CRO
```

## Estructura de criterios de un estudio

```typescript
// El investigador define los criterios en el panel CRO
interface StudyCriteria {
  required_study_types?: string[];          // ['laboratorio']
  required_categories?: string[];           // ['metabolismo_glucosa']
  field_conditions?: FieldCondition[];
}

interface FieldCondition {
  field: keyof typeof CLINICAL_FIELDS_ALLOWLIST;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
  recency_days?: number;  // ej: "en los últimos 180 días"
}

// Ejemplo: estudio de diabetes tipo 2
const diabetesCriteria: StudyCriteria = {
  required_categories: ['metabolismo_glucosa'],
  field_conditions: [
    { field: 'hba1c_percent', operator: 'gte', value: 6.5 },
    { field: 'glucose_mgdl',  operator: 'gte', value: 126, recency_days: 180 },
  ]
};
```

## Cálculo del fit score

```typescript
// apps/api/src/routes/cro/matching.ts
// El score se calcula en el backend — el CRO solo ve el número final

export function calculateFitScore(
  patientFields: Record<string, StudyFieldValue>,
  criteria: StudyCriteria
): number {
  let score = 0;
  let maxScore = 0;

  // Puntaje por tipo/categoría de estudio disponible
  if (criteria.required_categories) {
    for (const cat of criteria.required_categories) {
      maxScore += 20;
      if (patientFields[`has_${cat}`]) score += 20;
    }
  }

  // Puntaje por condiciones de campo
  if (criteria.field_conditions) {
    for (const condition of criteria.field_conditions) {
      maxScore += 20;
      const patientValue = patientFields[condition.field];
      if (patientValue !== undefined && evaluateCondition(patientValue, condition)) {
        score += 20;
      }
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}
```

## Vista anónima con score pre-calculado

```sql
-- La función de scoring corre en SQL para no exponer datos
-- El CRO solo hace SELECT sobre esta función con los criterios del estudio
CREATE OR REPLACE FUNCTION get_anonymous_matches(
  p_criteria JSONB,
  p_min_score INT DEFAULT 60
)
RETURNS TABLE (
  patient_hash TEXT,
  age_range INT,
  study_categories TEXT[],
  fit_score INT
)
LANGUAGE plpgsql SECURITY DEFINER  -- corre como superuser, no expone datos
AS $$
BEGIN
  RETURN QUERY
  SELECT
    md5(p.id::text) AS patient_hash,
    (date_part('year', now()) - p.birth_year)::int / 5 * 5 AS age_range,
    array_agg(DISTINCT s.category) AS study_categories,
    calculate_fit_score(p.id, p_criteria) AS fit_score
  FROM profiles p
  JOIN studies s ON s.profile_id = p.id AND s.confirmed = true
  JOIN consent_audit ca ON ca.profile_id = p.id
    AND ca.layer = 'research' AND ca.granted = true AND ca.revoked_at IS NULL
  GROUP BY p.id, p.birth_year
  HAVING
    count(DISTINCT p.id) >= 5  -- k-anonimato mínimo
    AND calculate_fit_score(p.id, p_criteria) >= p_min_score
  ORDER BY fit_score DESC;
END;
$$;

-- Solo cro_reader puede llamar esta función
GRANT EXECUTE ON FUNCTION get_anonymous_matches TO cro_reader;
```

## Flujo de invitación

```typescript
// apps/api/src/routes/cro/invite.ts

// Paso 1: CRO envía lista de patient_hashes a invitar
// Paso 2: Backend traduce hash → profile_id (SOLO en backend)
// Paso 3: Verifica consent activo
// Paso 4: Inserta en study_invitations
// Paso 5: Envía push notification al paciente
// El CRO no sabe a quién invitó — solo ve "N invitaciones enviadas"

async function sendStudyInvitations(
  cro_study_id: string,
  patient_hashes: string[]  // md5 hashes del CRO
) {
  for (const hash of patient_hashes) {
    // Traducción hash → real_id (SOLO en backend, nunca expuesto)
    const profile = await getProfileByHash(hash);
    if (!profile) continue;

    // Verificar consent vigente
    const hasConsent = await hasActiveResearchConsent(profile.id);
    if (!hasConsent) continue;

    // INSERT invitation
    await supabase.from('study_invitations').insert({
      cro_study_id,
      profile_id: profile.id,
      status: 'sent',
    });

    // Push notification
    await sendPushNotification(profile.id, {
      title: 'Tenés una invitación a un estudio clínico',
      body: 'Abrí Bresca para ver los detalles.',
      data: { type: 'study_invitation', cro_study_id },
    });
  }
}
```
