# Skill: consent-system
> Cargar cuando: trabajás en cualquier feature de consentimiento, modificás `consent_audit`, implementás el Centro de Consentimiento, o conectás el flujo de invitación CRO.

## Schema append-only

```sql
-- REGLA: NUNCA UPDATE ni DELETE en esta tabla
-- Cada cambio de consentimiento es un INSERT nuevo
CREATE TABLE consent_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id) NOT NULL,
  layer       TEXT CHECK(layer IN ('product','research','therapeutic_area')) NOT NULL,
  area_code   TEXT,         -- NULL para capas 1 y 2; requerido para capa 3
  granted     BOOLEAN NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,  -- NULL = activo; NOT NULL = revocado
  tos_version TEXT NOT NULL,
  ip_address  INET,
  user_agent  TEXT
);

-- Trigger que bloquea UPDATE y DELETE
CREATE OR REPLACE FUNCTION prevent_consent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'consent_audit is append-only. Use INSERT to record changes.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_audit_immutable
  BEFORE UPDATE OR DELETE ON consent_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_consent_mutation();
```

## Las 3 capas

| Capa | `layer` | `area_code` | Significado |
|---|---|---|---|
| 1 | `product` | NULL | Términos de uso. Requerido para usar la app. |
| 2 | `research` | NULL | Acepta ser contactado para estudios clínicos en general. |
| 3 | `therapeutic_area` | `'diabetes'` / `'oncologia'` / `'cardiologia'` / `'salud_mental'` | Granular por área. |

## Vista de consentimiento activo

```sql
-- El estado actual de consentimiento de un perfil
-- Es la fila más reciente por (profile_id, layer, area_code)
CREATE VIEW consent_active AS
SELECT DISTINCT ON (profile_id, layer, area_code)
  profile_id, layer, area_code, granted, granted_at, revoked_at, tos_version
FROM consent_audit
ORDER BY profile_id, layer, area_code, granted_at DESC;
```

## Insertar consentimiento

```typescript
// apps/api/src/routes/consent.ts
async function grantConsent(
  profileId: string,
  layer: ConsentLayer,
  areaCode: string | null,
  tosVersion: string,
  ipAddress: string,
  userAgent: string
): Promise<Result<void>> {
  const { error } = await supabase.from('consent_audit').insert({
    profile_id:  profileId,
    layer,
    area_code:   areaCode,
    granted:     true,
    tos_version: tosVersion,
    ip_address:  ipAddress,
    user_agent:  userAgent,
  });
  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, data: undefined };
}

// Revocar = INSERT con granted: false (NO actualizar la fila existente)
async function revokeConsent(profileId: string, layer: ConsentLayer, areaCode: string | null) {
  return grantConsent(profileId, layer, areaCode, currentTosVersion, ip, ua);
  // Solo cambia: granted: false, granted_at: now()
}
```

## Verificación para el CRO

```typescript
// Antes de incluir un paciente en matching: verificar consent activo
async function hasActiveResearchConsent(profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from('consent_active')
    .select('granted')
    .eq('profile_id', profileId)
    .eq('layer', 'research')
    .is('area_code', null)
    .single();
  return data?.granted === true;
}
```
