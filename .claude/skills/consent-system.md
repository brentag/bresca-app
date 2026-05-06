# Skill: consent-system
> Cargar cuando: trabajás en cualquier feature de consentimiento, modificás `consent_audit`, implementás el Centro de Consentimiento, o conectás el flujo de invitación CRO.

## Schema append-only (producción)

```sql
-- REGLA: NUNCA UPDATE ni DELETE en esta tabla
-- Cada cambio de consentimiento es un INSERT nuevo
-- Triggers de DB bloquean UPDATE y DELETE a nivel de base de datos

CREATE TABLE consent_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  layer      text NOT NULL CHECK (layer IN ('research', 'therapeutic_area', 'specific_study')),
  area_id    text,        -- NULL para layer='research'; área temática para 'therapeutic_area'
  study_id   uuid,        -- solo para layer='specific_study'
  granted    boolean NOT NULL,
  revoked_at timestamptz, -- NULL = activo; NOT NULL = revocado (pero la fila es INMUTABLE)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers que bloquean UPDATE y DELETE
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
```

## Las 3 capas

| Capa | `layer` | `area_id` / `study_id` | Significado |
|---|---|---|---|
| 1 | `research` | NULL | Acepta ser contactado para estudios clínicos en general. |
| 2 | `therapeutic_area` | `area_id='diabetes'` etc. | Granular por área terapéutica. |
| 3 | `specific_study` | `study_id=<uuid>` | Consentimiento para un estudio específico. |

**Valores válidos de `layer`:** `'research'` | `'therapeutic_area'` | `'specific_study'`
**NUNCA usar:** `'product'`, `'basic'`, `'general'` u otros valores no listados arriba.

## Vista de consentimiento activo

```sql
-- El estado actual de consentimiento de un perfil
-- Es la fila más reciente por (profile_id, layer, area_id)
CREATE VIEW consent_active AS
SELECT DISTINCT ON (profile_id, layer, area_id)
  profile_id, layer, area_id, study_id, granted, revoked_at, created_at
FROM consent_audit
ORDER BY profile_id, layer, area_id, created_at DESC;
```

## Insertar consentimiento

```typescript
// apps/api/src/consent/router.ts
async function grantConsent(
  profileId: string,
  layer: 'research' | 'therapeutic_area' | 'specific_study',
  areaId: string | null,
  studyId: string | null,
): Promise<Result<void>> {
  const { error } = await supabase.from('consent_audit').insert({
    profile_id: profileId,
    layer,
    area_id:   areaId,
    study_id:  studyId,
    granted:   true,
  });
  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, data: undefined };
}

// Revocar = INSERT con granted: false (NO actualizar la fila existente)
async function revokeConsent(
  profileId: string,
  layer: 'research' | 'therapeutic_area' | 'specific_study',
  areaId: string | null,
) {
  return grantConsent(profileId, layer, areaId, null);
  // Solo cambia: granted: false, created_at: now()
}
```

## Verificación para el CRO

```typescript
// Antes de incluir un paciente en matching: verificar consent activo
async function hasActiveResearchConsent(profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from('consent_audit')
    .select('granted')
    .eq('profile_id', profileId)
    .eq('layer', 'research')
    .is('area_id', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.granted === true;
}
```

## RLS policies (actualizadas con OR pattern para perfiles familiares)

```sql
-- Solo INSERT y SELECT — no hay policy UPDATE ni DELETE
CREATE POLICY "consent_owner_insert" ON consent_audit
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

CREATE POLICY "consent_owner_select" ON consent_audit
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- NOTA: PostgREST devuelve 200 con 0 rows en un PATCH sin policy UPDATE
-- No confundir con éxito — verificar que los datos no cambiaron
```

## Invariantes del sistema

- Cada perfil (propio o familiar) tiene su propia historia de consentimientos en `consent_audit`
- El consentimiento de un perfil NO se hereda ni propaga a otros perfiles del mismo usuario
- Para menores (perfiles familiares): el consentimiento lo otorga el `owner_user_id` (padre/tutor)
- La vista `cro_anonymous_patients` filtra pacientes por `ca.layer = 'research' AND ca.granted = true AND ca.revoked_at IS NULL`
