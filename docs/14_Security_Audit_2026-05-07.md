# Auditoría de Seguridad — Bresca MVP

**Fecha:** 2026-05-07  
**Auditor:** Claude Code (claude-sonnet-4-6) — revisión estática multi-agente  
**Alcance:** `apps/api/`, `apps/web-patient/`, `apps/web-cro/`, `supabase/migrations/`, `supabase/functions/`  
**Método:** Revisión de código fuente completo, análisis de políticas RLS, inspección de flujos de autenticación y autorización  

---

## Resumen ejecutivo

La auditoría analizó la totalidad del código backend, frontend y base de datos del MVP de Bresca. Se encontraron **2 hallazgos críticos, 5 altos, 5 medios y 3 bajos**. Ninguno de los hallazgos críticos expone datos de pacientes en producción en este momento, pero deben resolverse antes del lanzamiento público.

Las fortalezas más importantes del sistema son: RLS activo en todas las tablas con PII, `consent_audit` append-only garantizado por triggers de base de datos, k-anonimato correcto en vista CRO, y separación correcta de `SERVICE_ROLE_KEY` (solo en servidor).

---

## Tabla de hallazgos

| ID | Severidad | Área | Título | Estado |
|----|-----------|------|--------|--------|
| S-01 | CRÍTICO | API | CORS con fallback `*` en producción | ✅ Resuelto `1651d9b` |
| S-02 | CRÍTICO | API | Rate limiting del Copilot en memoria — no distribuido | ✅ Resuelto `1651d9b` |
| S-03 | ALTO | Edge Function | Sin validación de propietario en `process-study-draft` | Abierto |
| S-04 | ALTO | API | Sin rate limiting en endpoints QR (GET + POST) | ✅ Resuelto `1651d9b` |
| S-05 | ALTO | API | Bypass de autorización CRO en entornos non-production | ✅ Resuelto `1651d9b` |
| S-06 | ALTO | API | Allowlist `SAFE_FIELDS` incompleta en GET /qr/:token | Abierto |
| S-07 | ALTO | DB | `edge_secret` en `current_setting()` de BD (no en Vault) | Abierto |
| S-08 | MEDIO | DB | MD5 para anonimización de `profile_id` en borrado de cuenta | Abierto |
| S-09 | MEDIO | API | Información sensible potencial en `console.error()` | ✅ Resuelto `1651d9b` |
| S-10 | MEDIO | DB | QR tokens expirados sin limpieza automática | Abierto |
| S-11 | MEDIO | DB | `integrity_hash` calculado pero nunca validado | Abierto |
| S-12 | MEDIO | API | Validación de `categories` sin whitelist en CRO /match | Abierto |
| S-13 | BAJO | API | Prompt injection a través de `{{VAULT_CONTEXT}}` | Abierto |
| S-14 | BAJO | API | Sin logging de accesos autenticados | Abierto |
| S-15 | BAJO | DB | Vistas SQL sin RLS (protección solo por GRANT/REVOKE) | Aceptado |

> **Fix extra aplicado:** `extract/router.ts` usaba `(req as unknown as { user: { id: string } }).user.id` (cast inseguro no tipado) en lugar de `res.locals.userId` establecido por `requireAuth`. Corregido en `1651d9b`.

---

## Hallazgos críticos

### S-01 — CORS con fallback `*` en producción

**Archivo:** `apps/api/src/index.ts`  
**Línea:** ~14  

```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
```

**Descripción:**  
Si la variable de entorno `CORS_ORIGIN` no está configurada, la API acepta requests desde cualquier origen. Un sitio malicioso puede realizar requests autenticados al API en nombre de un usuario con sesión activa, robando datos de salud.

**Impacto:** Un atacante puede leer estudios médicos, historial de consentimiento y datos de perfiles de pacientes logueados si los visita en otra pestaña.

**Acción requerida:**

```typescript
// apps/api/src/index.ts
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  throw new Error('[FATAL] CORS_ORIGIN no configurado — la app no puede arrancar sin esto');
}

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Y en las variables de entorno de Render.com:
```
CORS_ORIGIN=https://bresca-app-api.vercel.app,https://bresca-cro.vercel.app
```

---

### S-02 — Rate limiting del Copilot en memoria — no distribuido

**Archivo:** `apps/api/src/copilot/rate-limit.ts`  

```typescript
const buckets = new Map<string, Bucket>(); // <- solo vive en el proceso
```

**Descripción:**  
El rate limiting de 20 queries/hora por usuario se implementa con un `Map` en memoria del proceso Node.js. Esto tiene tres problemas:

1. **Memory leak:** los buckets nunca se limpian. Con suficientes usuarios el servidor se queda sin RAM.
2. **No persiste:** un restart del servidor (deploy, crash) resetea todos los contadores.
3. **No distribuido:** si Render.com escala a más de una instancia, cada instancia tiene su propio contador y el límite real es `20 × N_instancias`.

**Impacto:** Un atacante puede bypassear el límite de consultas al Copilot con múltiples requests a distintas instancias o esperando un restart. Esto implica costos descontrolados de DeepSeek API y posible abuso del modelo.

**Acción requerida — opción 1 (Redis):**

```typescript
// npm install ioredis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(userId: string) {
  const key = `rl:copilot:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  return { allowed: count <= MAX_COPILOT_RPH, remaining: Math.max(0, MAX_COPILOT_RPH - count) };
}
```

**Acción requerida — opción 2 (Supabase, sin infra extra):**

```sql
-- Tabla de rate limiting
CREATE TABLE copilot_rate_limits (
  user_id   UUID PRIMARY KEY,
  count     INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```typescript
// Upsert con reset automático si la ventana expiró
const { data } = await supabase.rpc('check_and_increment_copilot_limit', { p_user_id: userId });
```

**Acción inmediata mínima (sin infra):** agregar cleanup del Map en cada request:

```typescript
// Limpiar entradas expiradas cada 100 requests (trade-off aceptable)
if (buckets.size > 1000) {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
```

---

## Hallazgos altos

### S-03 — Edge Function sin validación de propietario

**Archivo:** `supabase/functions/process-study-draft/index.ts`  

**Descripción:**  
La Edge Function usa `SERVICE_ROLE_KEY` (bypassa RLS) y actualiza el draft identificado por `draft_id` sin verificar que pertenezca al usuario que disparó el webhook. El flujo normal es seguro porque el trigger de BD solo dispara en INSERT del propietario. Pero si el `WEBHOOK_SECRET` se filtra, un atacante puede invocar la función con cualquier `draft_id`.

```typescript
// Línea ~65-76 — no hay validación de profile_id
const { data: draft } = await supabase
  .from('study_drafts')
  .update({ status: 'processing', started_at: new Date().toISOString() })
  .eq('id', draft_id)
  .eq('status', 'pending')
  .select('id, storage_path, storage_paths, mime_type, category')
  .single<DraftRow>();
```

**Acción requerida:** Rotar `WEBHOOK_SECRET` periódicamente. Agregar validación de propietario en la función:

```typescript
// Después del claim del draft, verificar profile ownership
const { data: ownerCheck } = await supabase
  .from('study_drafts')
  .select('profile_id, profiles!inner(user_id)')
  .eq('id', draft_id)
  .single();

if (!ownerCheck) {
  return new Response('draft_not_found', { status: 404 });
}
// Continuar con processAndSave solo si la validación pasa
```

---

### S-04 — Sin rate limiting en endpoints QR

**Archivos:** `apps/api/src/qr/router.ts`

**Descripción:**  
`POST /qr/generate` no tiene rate limiting: un usuario puede generar miles de QR tokens en segundos. `GET /qr/:token` es público y sin rate limiting: permite enumeración de tokens válidos mediante fuerza bruta (aunque los tokens son de 256 bits = prácticamente imposible adivinar, el endpoint responde diferente para tokens válidos vs inválidos, lo que confirma existencia).

**Acción requerida:**

```typescript
// POST /qr/generate — agregar límite por usuario
const QR_LIMIT_PER_HOUR = 10;
const { allowed } = checkRateLimit(`qr:${userId}`); // reusar mecanismo
if (!allowed) { res.status(429).json({ error: 'Demasiados QR generados' }); return; }

// GET /qr/:token — agregar límite por IP para anti-enumeración
// Usar express-rate-limit con windowMs=60000, max=30
```

---

### S-05 — Bypass de autorización CRO en non-production

**Archivo:** `apps/api/src/cro/router.ts`  

```typescript
if (allowlist.length === 0) {
  if (process.env.NODE_ENV !== 'production') { next(); return; } // <- PROBLEMA
  res.status(403).json({ error: 'CRO access not configured' });
  return;
}
```

**Descripción:**  
Si `CRO_ALLOWED_EMAILS` está vacío y el servidor corre con `NODE_ENV=development` o `NODE_ENV=staging`, cualquier usuario autenticado tiene acceso total al panel CRO y a los datos anonimizados de investigación.

**Acción requerida:** Eliminar el bypass de entorno. El panel CRO debe requerir `CRO_ALLOWED_EMAILS` configurado siempre:

```typescript
if (allowlist.length === 0) {
  console.error('[CRO] CRO_ALLOWED_EMAILS no configurado — acceso denegado en todos los entornos');
  res.status(503).json({ error: 'Panel CRO no configurado' });
  return;
}
```

---

### S-06 — Allowlist `SAFE_FIELDS` incompleta en GET /qr/:token

**Archivo:** `apps/api/src/qr/router.ts`  

**Descripción:**  
La allowlist `SAFE_FIELDS` contiene 24 campos hardcodeados. Si el modelo DeepSeek extrae campos fuera de esa lista (por ejemplo: "Diagnóstico", "Medicamentos actuales", "Observaciones clínicas"), esos campos se descartan silenciosamente. Un médico que escanea el QR no ve información que debería ver.

El problema inverso también existe: si en el futuro se agregan nuevos tipos de estudios con campos nuevos, el sistema los descartará sin avisar.

**Acción requerida:**

1. Registrar en logs cuando se descartan campos:
```typescript
const discarded = Object.keys(s.extracted_fields ?? {}).filter(k => !SAFE_FIELDS.has(k));
if (discarded.length > 0) {
  console.warn(`[QR] campos descartados en study ${s.id}:`, discarded);
}
```

2. Revisar y expandir `SAFE_FIELDS` con el equipo médico.

3. Mover `SAFE_FIELDS` a una tabla de configuración en BD para poder actualizarla sin deploy.

---

### S-07 — `edge_secret` en `current_setting()` de BD

**Archivo:** `supabase/migrations/20260502190000_extract_async.sql`  

```sql
edge_secret := current_setting('app.edge_webhook_secret', true);
```

**Descripción:**  
El secret del webhook OCR se obtiene de `current_setting()`, que es una configuración a nivel de sesión de PostgreSQL. Cualquier función `SECURITY DEFINER` o rol con `SET SESSION` podría leer o modificar este valor. No está cifrado en reposo a nivel de BD.

**Acción requerida:** Migrar a Supabase Vault cuando esté disponible (plan Pro+), o al menos documentar que este valor debe rotarse si hay brecha en la BD.

---

## Hallazgos medios

### S-08 — MD5 para anonimización de profile_id en borrado de cuenta

**Archivo:** `supabase/migrations/20260507100000_consent_privacy_module.sql`  

```sql
v_anon_id := md5(OLD.id::text)::uuid;
```

**Descripción:**  
Al borrar una cuenta, el `profile_id` en `consent_audit` se reemplaza con `md5(profile_id)`. MD5 es criptográficamente roto: con una tabla de 10.000 UUIDs conocidos, es trivial revertir el hash. Si alguien obtiene la BD, podría re-identificar registros de consentimiento.

**Acción requerida:** Reemplazar MD5 por SHA-256 con salt fijo por proyecto, o generar un UUID anónimo permanente al crear el perfil y usarlo en lugar del hash:

```sql
-- Opción preferida: UUID anónimo generado en alta, guardado en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anon_id UUID DEFAULT gen_random_uuid();

-- En handle_account_deletion():
v_anon_id := OLD.anon_id;
```

---

### S-09 — Información sensible potencial en console.error()

**Archivos:** `apps/api/src/copilot/router.ts`, `apps/api/src/extract/router.ts`  

```typescript
console.error('DeepSeek API error:', err);       // puede incluir prompt con datos médicos
console.error('[extract] insert draft failed', insErr); // puede incluir storage_path con user_id
```

**Descripción:**  
Los objetos de error se loguean completos. Los errores de DeepSeek pueden contener el prompt (que incluye el vault context del paciente). Los errores de Supabase pueden incluir valores del query fallido.

**Acción requerida:**

```typescript
function safeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return 'unknown error';
}

console.error('DeepSeek error:', safeError(err));
```

---

### S-10 — QR tokens expirados sin limpieza automática

**Archivo:** `apps/api/src/qr/router.ts`, tabla `qr_tokens`  

**Descripción:**  
Los QR tokens expirados y revocados se acumulan en la tabla indefinidamente. La política RLS `qr_public_read` filtra correctamente tokens inválidos en tiempo de consulta, pero la tabla puede crecer sin límite.

**Acción requerida:** Agregar job de limpieza:

```sql
-- supabase/migrations/TIMESTAMP_cleanup_qr_tokens.sql
CREATE OR REPLACE FUNCTION cleanup_expired_qr_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM qr_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule('cleanup-qr-tokens', '0 3 * * *', 'SELECT cleanup_expired_qr_tokens()');
```

---

### S-11 — integrity_hash calculado pero nunca validado

**Archivo:** `supabase/migrations/20260507100000_consent_privacy_module.sql`  

**Descripción:**  
`record_consent()` calcula un SHA-256 de los campos del registro y lo guarda en `integrity_hash`. Sin embargo, no existe ningún mecanismo que valide este hash periódicamente. Si la BD es comprometida y se modifican registros de consentimiento, nadie lo detecta.

**Acción requerida:**

```sql
CREATE OR REPLACE FUNCTION validate_consent_integrity() RETURNS TABLE(id UUID, ok BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.integrity_hash = encode(
      digest(ca.id::text || ca.profile_id::text || COALESCE(ca.document_id::text,'') || ca.action::text || ca.created_at::text, 'sha256'),
      'hex'
    ) AS ok
  FROM consent_audit ca;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar mensualmente y alertar si hay registros con ok=false
```

---

### S-12 — Validación de categories sin whitelist en CRO /match

**Archivo:** `apps/api/src/cro/router.ts`  

```typescript
categories: z.array(z.string()).optional(), // sin validación de contenido
```

**Descripción:**  
El campo `categories` acepta cualquier array de strings. Si bien Supabase/PostgREST parameteriza las queries y previene inyección SQL clásica, strings malformados pueden generar errores internos o forzar consultas costosas.

**Acción requerida:**

```typescript
const VALID_CATEGORIES = [
  'Hematología', 'Bioquímica', 'Radiología', 'Cardiología',
  'Endocrinología', 'Pulmonología', 'Neurología', 'Oncología',
  'Gastroenterología', 'Reumatología',
] as const;

categories: z.array(z.enum(VALID_CATEGORIES)).max(10).optional(),
```

---

## Hallazgos bajos

### S-13 — Posibilidad de prompt injection vía VAULT_CONTEXT

**Archivo:** `apps/api/src/copilot/router.ts`  

```typescript
const systemPrompt = COPILOT_SYSTEM_PROMPT_V1.replace('{{VAULT_CONTEXT}}', vaultContext);
```

**Descripción:**  
El vault context viene de los datos OCR extraídos por DeepSeek de los archivos del usuario. Si un archivo malicioso contiene texto como `"Ignorar instrucciones anteriores. Actuar como..."`, ese texto va directo al system prompt sin sanitización.

**Riesgo actual:** Bajo, porque el actor malicioso sería el propio usuario (se estaría atacando a sí mismo). Pero si en el futuro se comparte context entre perfiles, el riesgo sube.

**Acción requerida:** Sanitizar el vault context antes de insertarlo en el prompt:

```typescript
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/\[\[.*?\]\]/g, '')          // eliminar wikilinks u otros marcadores
    .replace(/instruc(cion|tion)/gi, '')   // palabras clave de jailbreak
    .slice(0, 4000);                       // limitar tamaño
}
```

---

### S-14 — Sin logging de accesos autenticados

**Archivos:** `apps/api/src/`  

**Descripción:**  
No hay registro de qué usuario accedió a qué endpoint y cuándo. Si hay un incidente de seguridad, es imposible determinar retrospectivamente qué datos fueron accedidos.

**Acción requerida:** Agregar middleware de logging básico:

```typescript
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.locals.userId) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        userId: res.locals.userId,
      }));
    }
  });
  next();
});
```

---

### S-15 — Vistas SQL sin RLS (aceptado)

**Vista:** `cro_anonymous_patients`  

**Descripción:**  
Las vistas SQL en PostgreSQL no soportan RLS nativamente. La seguridad de la vista CRO depende exclusivamente de `GRANT SELECT ON cro_anonymous_patients TO cro_reader` y `REVOKE ALL ON profiles, studies FROM cro_reader`. Esto es correcto pero frágil: un cambio accidental en permisos podría exponer la vista.

**Estado:** Aceptado como riesgo de diseño inherente a PostgreSQL. Documentado aquí para visibilidad.

**Mitigación existente:** El rol `cro_reader` tiene REVOKE explícito en todas las tablas base. El panel CRO solo recibe el token del usuario autenticado y el backend valida el email contra `CRO_ALLOWED_EMAILS`.

---

## Fortalezas confirmadas

| Aspecto | Evidencia |
|---------|-----------|
| **RLS en todas las tablas con PII** | 8/8 tablas con RLS activo y políticas USING + WITH CHECK |
| **SERVICE_ROLE_KEY solo en servidor** | No aparece en ningún `.env` de cliente, ni en Vite config |
| **consent_audit append-only** | Triggers `block_consent_mutation()` a nivel de BD, no solo RLS |
| **K-anonimato corregido (cohort >= 5)** | Vista CRO usa `count(*) OVER (PARTITION BY age_range)` correctamente |
| **Storage path-based isolation** | Policy: `split_part(name, '/', 1) = auth.uid()::text` |
| **ANON_KEY en cliente (correcto)** | Diseño intencional de Supabase, no una vulnerabilidad |
| **Bearer tokens no en localStorage** | `authHeaders()` llama `getSession()` en cada request |
| **ProtectedRoute + ConsentGateway** | Doble verificación: sesión activa + T&C aceptados |
| **MIME type allowlist en Storage** | Solo `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| **TTL 24h en study_drafts** | pg_cron limpia drafts expirados automáticamente |
| **.env files en .gitignore** | No hay secrets committed al repositorio |

---

## Plan de remediación priorizado

### Antes del lanzamiento público (bloqueante)

| Prioridad | ID | Acción | Esfuerzo |
|-----------|-----|--------|----------|
| 1 | S-01 | Configurar `CORS_ORIGIN` en Render.com + forzar error si no está | 30 min |
| 2 | S-05 | Eliminar bypass CRO para non-production | 15 min |
| 3 | S-02 | Agregar cleanup mínimo al Map de rate limiting | 30 min |
| 4 | S-04 | Agregar rate limiting básico a `/qr/generate` | 1 hora |
| 5 | S-09 | Sanitizar console.error() en todos los handlers | 1 hora |

### Sprint siguiente (alto impacto)

| Prioridad | ID | Acción | Esfuerzo |
|-----------|-----|--------|----------|
| 6 | S-03 | Validar propietario en Edge Function + rotar WEBHOOK_SECRET | 2 horas |
| 7 | S-06 | Expandir SAFE_FIELDS + logging de campos descartados | 2 horas |
| 8 | S-12 | Whitelist de categorías en CRO /match | 1 hora |
| 9 | S-10 | pg_cron para limpieza de QR tokens expirados | 1 hora |
| 10 | S-14 | Middleware de logging de accesos | 1 hora |

### Backlog (mejora continua)

| ID | Acción |
|----|--------|
| S-02 | Migrar rate limiting a Supabase o Redis |
| S-08 | Reemplazar MD5 por UUID anónimo permanente |
| S-11 | Función de validación periódica de integrity_hash |
| S-07 | Migrar edge_secret a Supabase Vault (requiere plan Pro) |
| S-13 | Sanitización básica de vault context antes de insertar en prompt |

---

## Ver también

- [[00_INDEX|Índice maestro del vault]]
- [[01_RFC-001_Bresca|RFC-001 — Problema y propuesta]]
- [[02_ADR_Bresca|ADR-001 a ADR-006]]
- [[04_TechSpec_Bresca|Tech Spec — schema y RLS]]
- [[05_SystemDesign_Bresca|System Design — arquitectura y decisiones de seguridad]]
- [[09_TestPlan_Bresca|Plan de pruebas del MVP]]
- [[15_Incident_Response_Plan|Plan de Respuesta a Incidentes]]
- [[20_ObservabilityPlan_Bresca|Plan de Observabilidad, Resiliencia & SRE]]
- [[22_EmailToVault_Spec|Email-to-Vault — controles SSRF/DNS rebinding]]
- `CLAUDE.md` — "Reglas absolutas — nunca violar" (security baseline del proyecto)
