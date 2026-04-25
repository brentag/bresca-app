# Skill: supabase-rls
> Cargar cuando: creás una tabla nueva, escribís una migración, debuggeás un error de permisos, o implementás cualquier feature que toque auth o acceso a datos.

## Modelo de acceso de Bresca

Existen 3 tipos de acceso distintos que interactúan entre sí:

```
Usuario B2C autenticado  → lee/escribe sus propios perfiles, estudios, consentimientos
Médico con QR            → lee estudios específicos vía token temporal (rol anon)
CRO investigador         → lee SOLO vistas anónimas (rol cro_reader)
```

Cada uno tiene su propio set de policies. **Un bug en la intersección de estos tres expone datos médicos.**

---

## RLS policies por tabla

### `users`
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Solo puede leer/editar su propio registro
CREATE POLICY "users_self" ON users
  FOR ALL USING (id = auth.uid());
```

### `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- El usuario ve y edita solo sus perfiles
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (user_id = auth.uid());

-- El rol cro_reader NO puede acceder a esta tabla directamente
-- Solo accede a través de la vista cro_anonymous_patients
```

### `studies`
```sql
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

-- El usuario accede solo a estudios de sus perfiles
CREATE POLICY "studies_owner" ON studies
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
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

### `consent_audit`
```sql
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

-- Solo INSERT — no UPDATE, no DELETE (append-only enforced)
CREATE POLICY "consent_owner_insert" ON consent_audit
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Solo el dueño puede leer sus consentimientos
CREATE POLICY "consent_owner_select" ON consent_audit
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- NOTA: no hay policy UPDATE ni DELETE — si alguien intenta, falla silenciosamente
-- Para reforzar: agregar trigger que hace RAISE EXCEPTION en UPDATE/DELETE
```

### `qr_tokens`
```sql
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- El usuario crea y gestiona sus propios tokens
CREATE POLICY "qr_owner" ON qr_tokens
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
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

### `study_embeddings`
```sql
ALTER TABLE study_embeddings ENABLE ROW LEVEL SECURITY;

-- Solo el backend (service_role) puede insertar
-- El usuario no necesita acceder directamente — el retrieval pasa por la API
CREATE POLICY "embeddings_service_only" ON study_embeddings
  FOR ALL TO service_role USING (true);
```

---

## Vista de anonimización CRO

```sql
-- Vista que el CRO Panel puede leer — sin PII
-- El rol cro_reader SOLO tiene acceso a esta vista, no a las tablas base
CREATE VIEW cro_anonymous_patients AS
SELECT
  md5(p.id::text)            AS patient_hash,
  CASE
    WHEN p.birth_year IS NULL THEN NULL
    ELSE (date_part('year', now()) - p.birth_year)::int / 5 * 5
  END                        AS age_range,
  array_agg(DISTINCT s.category)   AS study_categories,
  array_agg(DISTINCT s.study_type) AS study_types,
  max(s.study_date)          AS last_study_date
FROM profiles p
JOIN studies s ON s.profile_id = p.id AND s.confirmed = true
JOIN consent_audit ca
  ON ca.profile_id = p.id
  AND ca.layer = 'research'
  AND ca.granted = true
  AND ca.revoked_at IS NULL
GROUP BY p.id, p.birth_year
HAVING count(DISTINCT p.id) >= 5;  -- k-anonimato mínimo: NUNCA cambiar a < 5

-- Otorgar acceso solo a la vista, no a las tablas
GRANT SELECT ON cro_anonymous_patients TO cro_reader;
REVOKE ALL ON profiles, studies, users, consent_audit FROM cro_reader;
```

---

## Checklist para cada tabla nueva

Antes de hacer merge de cualquier migración que crea una tabla:

- [ ] `ALTER TABLE nombre ENABLE ROW LEVEL SECURITY;`
- [ ] Policy para el dueño del recurso definida
- [ ] Si contiene PII: verificar que `cro_reader` NO tiene acceso directo
- [ ] Si es append-only (como `consent_audit`): trigger que bloquea UPDATE/DELETE
- [ ] Si necesita ser accesible desde CRO: vista anónima correspondiente creada
- [ ] `supabase gen types typescript` corrido para actualizar `database.types.ts`

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
```

---

## Errores comunes de RLS

| Error | Causa | Fix |
|---|---|---|
| `new row violates row-level security policy` | INSERT sin cumplir la condición WITH CHECK | Verificar que el auth.uid() está en la condición |
| Query retorna array vacío inesperadamente | RLS activo pero el usuario no cumple la policy | Revisar que el token JWT está siendo enviado en la request |
| `permission denied for table` | El rol no tiene GRANT en la tabla/vista | Verificar GRANTs con `\dp nombre_tabla` en psql |
| El médico con QR no ve los estudios | `app.qr_token` no está seteado en la sesión | En la API, hacer `SET LOCAL app.qr_token = ?` antes de la query |
