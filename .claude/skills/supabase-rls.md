# Skill: supabase-rls
> Cargar cuando: creás una tabla nueva, escribís una migración, debuggeás un error de permisos, o implementás cualquier feature que toque auth o acceso a datos.

## Modelo de acceso de Bresca

Existen 3 tipos de acceso distintos que interactúan entre sí:

```
Usuario B2C autenticado  → lee/escribe sus propios perfiles, estudios, consentimientos
                           (incluyendo perfiles familiares que él administra)
Médico con QR            → lee estudios específicos vía token temporal (rol anon)
CRO investigador         → lee SOLO vistas anónimas (rol cro_reader)
```

Cada uno tiene su propio set de policies. **Un bug en la intersección de estos tres expone datos médicos.**

---

## Modelo de perfiles (propio + familiar)

```
Perfil propio:    profiles.user_id = auth.uid()  |  owner_user_id = NULL
Perfil familiar:  profiles.user_id = NULL         |  owner_user_id = auth.uid()

CONSTRAINT profiles_has_owner:
  CHECK (user_id IS NOT NULL OR owner_user_id IS NOT NULL)
```

Toda policy que toca `profiles` y tablas relacionadas debe usar el patrón OR:
```sql
WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
```

---

## RLS policies por tabla

### `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Dueño propio (user_id) O administrador del perfil familiar (owner_user_id)
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = owner_user_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = owner_user_id
  );

-- NOTA: Bresca usa auth.users de Supabase directamente — no hay tabla users propia
-- El rol cro_reader NO puede acceder a esta tabla directamente
-- Solo accede a través de la vista cro_anonymous_patients
```

### `studies`
```sql
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

-- El usuario accede a estudios de sus perfiles propios Y familiares
CREATE POLICY "studies_owner" ON studies
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- El médico con QR válido puede leer estudios específicos
-- (los study_ids incluidos en el qr_token)
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
```

### `study_drafts`
```sql
ALTER TABLE study_drafts ENABLE ROW LEVEL SECURITY;

-- Mismo patrón que studies — incluye perfiles familiares
CREATE POLICY "study_drafts_owner" ON study_drafts
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );
```

### `consent_audit`
```sql
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

-- Solo INSERT y SELECT — no UPDATE, no DELETE (append-only enforced)
-- NOTA: sin policy UPDATE/DELETE, PostgREST devuelve 200 con 0 rows en PATCH
-- El trigger enforce_consent_audit_append_only refuerza a nivel DB si llega por otro path

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

-- Valores válidos de consent_audit.layer:
-- 'research' | 'therapeutic_area' | 'specific_study'
-- NUNCA usar 'basic', 'product' u otros valores
```

### `qr_tokens`
```sql
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- El usuario crea y gestiona sus propios tokens (incluyendo los de perfiles familiares)
CREATE POLICY "qr_owner" ON qr_tokens
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- El rol anon puede leer un token válido (para la vista del médico)
-- SOLO los campos token, study_ids, expires_at — nunca profile_id
CREATE POLICY "qr_public_read" ON qr_tokens
  FOR SELECT TO anon USING (
    expires_at > now()
    AND revoked_at IS NULL
  );
```

---

## Vista de anonimización CRO

```sql
-- Vista que el CRO Panel puede leer — sin PII
-- El rol cro_reader SOLO tiene acceso a esta vista, no a las tablas base
CREATE VIEW cro_anonymous_patients AS
SELECT
  md5(p.id::text)                      AS patient_hash,   -- no reversible
  p.birth_year,
  CASE
    WHEN p.birth_year IS NULL THEN NULL
    ELSE (date_part('year', now()) - p.birth_year)::int / 5 * 5
  END                                  AS age_range,
  array_agg(DISTINCT s.category)       AS study_categories,
  array_agg(DISTINCT s.study_type)     AS study_types,
  max(s.study_date)                    AS last_study_date,
  bool_or(
    ca.layer = 'research' AND ca.granted AND ca.revoked_at IS NULL
  )                                    AS has_research_consent
FROM profiles p
JOIN studies s ON s.profile_id = p.id AND s.confirmed = true
LEFT JOIN consent_audit ca ON ca.profile_id = p.id
GROUP BY p.id, p.birth_year
HAVING count(DISTINCT p.id) >= 5;  -- k-anonimato mínimo: NUNCA cambiar a < 5

-- Otorgar acceso solo a la vista, no a las tablas
GRANT SELECT ON cro_anonymous_patients TO cro_reader;
REVOKE ALL ON profiles, studies, consent_audit FROM cro_reader;

-- REGLA ABSOLUTA: ningún endpoint CRO puede aceptar patient_hash como parámetro de entrada
-- patient_hash es solo output — nunca input (TS-023)
```

---

## Checklist para cada tabla nueva

Antes de hacer merge de cualquier migración que crea una tabla:

- [ ] `ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;`
- [ ] Policy para el dueño del recurso definida (con OR pattern si aplica perfiles familiares)
- [ ] Si contiene PII: verificar que `cro_reader` NO tiene acceso directo
- [ ] Si es append-only (como `consent_audit`): trigger que bloquea UPDATE/DELETE
- [ ] Si necesita ser accesible desde CRO: vista anónima correspondiente creada
- [ ] `supabase gen types typescript --project-ref mkacuagcvwxoduhdthwg > packages/shared/src/database.types.ts`

---

## Testing de RLS

```typescript
// tests/rls/profiles.test.ts
// Patrón: crear dos usuarios, verificar que uno no ve datos del otro

it('usuario B no puede leer perfiles de usuario A', async () => {
  const { data: userA } = await supabaseAdmin.auth.admin.createUser({...});
  const { data: userB } = await supabaseAdmin.auth.admin.createUser({...});

  // Crear perfil como userA
  const clientA = createClient(url, anonKey);
  await clientA.auth.signInWithPassword({ email: userA.email, password: '...' });
  const { data: profileA } = await clientA.from('profiles').insert({...}).select().single();

  // Intentar leer como userB
  const clientB = createClient(url, anonKey);
  await clientB.auth.signInWithPassword({ email: userB.email, password: '...' });
  const { data, error } = await clientB.from('profiles').select().eq('id', profileA.id);

  expect(data).toHaveLength(0); // RLS bloquea — no error, array vacío
});

it('RLS familiar — vault aislado por perfil', async () => {
  // userA crea un perfil familiar
  const { data: familyProfile } = await clientA.from('profiles')
    .insert({ display_name: 'Tomás', owner_user_id: userA.id })
    .select().single();

  // userB no debe ver ese perfil familiar
  const { data } = await clientB.from('profiles').select().eq('id', familyProfile.id);
  expect(data).toHaveLength(0);
});
```

---

## Errores comunes de RLS

| Error | Causa | Fix |
|---|---|---|
| `new row violates row-level security policy` | INSERT sin cumplir la condición WITH CHECK | Verificar que auth.uid() está en la condición |
| Query retorna array vacío inesperadamente | RLS activo pero el usuario no cumple la policy | Revisar que el token JWT está siendo enviado en la request |
| `permission denied for table` | El rol no tiene GRANT en la tabla/vista | Verificar GRANTs con `\dp nombre_tabla` en psql |
| El médico con QR no ve los estudios | `app.qr_token` no está seteado en la sesión | En la API, hacer `SET LOCAL app.qr_token = ?` antes de la query |
| PATCH devuelve 200 pero no actualiza | Sin policy UPDATE — PostgREST acepta pero 0 rows afectadas | Esperado en consent_audit (append-only). Para otras tablas: agregar policy UPDATE |
| Perfiles familiares no visibles | Policy usa solo `user_id = auth.uid()` sin OR | Agregar `OR owner_user_id = auth.uid()` a la policy |
