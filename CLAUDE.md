# Bresca — Claude Code Context

## Proyecto
**MVP en producción.** Plataforma two-sided de datos de salud en LATAM.
- **B2C `web-patient`:** health vault, DICOM viewer, OCR, copilot IA, QR sharing, familia, consentimiento, ingesta por email
- **B2B `web-cro`:** dashboard anónimo, cohortes (k-anon ≥5), matching, monitoring admin

---

## Comandos

```bash
# Desarrollo (Turborepo — nombres de paquete exactos)
pnpm dev                                  # todos los apps
pnpm dev --filter=@bresca/web-patient     # solo B2C  → localhost:5174
pnpm dev --filter=@bresca/web-cro         # solo CRO  → localhost:5173
pnpm dev --filter=@bresca/api             # solo API

# Supabase local
supabase start
supabase db reset --local
supabase gen types typescript --project-id mkacuagcvwxoduhdthwg \
  > packages/shared/src/database.types.ts

# Deploy
supabase db push --linked                 # NO usar --project-ref junto con --linked
supabase functions deploy process-study-draft \
  --no-verify-jwt --project-ref mkacuagcvwxoduhdthwg --use-api

# Tests y QA
pnpm test
npx jest --testPathPattern=rls
npx vitest run --reporter=verbose
node scripts/post-deploy-qa.mjs           # 14 tests — mínimo 12/14 aceptable

# Lint + tipos
npx eslint apps/
npx tsc --noEmit
```

---

## Monorepo

```
apps/web-patient   @bresca/web-patient  → React 18 + Vite 5 + TS  (Vercel: bresca-app-api.vercel.app)
apps/web-cro       @bresca/web-cro      → React 18 + Vite 5 + TS  (Vercel: bresca-cro.vercel.app)
apps/api           @bresca/api          → Node.js 20 + Express      (Render: bresca-api.onrender.com)
packages/shared                         → Supabase singleton, tipos TS, constants, Result<T,E>
supabase/                               → migraciones SQL, seed, Edge Functions Deno
agents/                                 → JOBDs Hermes (3 roles): founding-product-engineer,
                                          product-designer-mobile-first, compliance-privacy-drafter
scripts/                                → post-deploy-qa.mjs y operacionales
.claude/                                → skills/, settings.json, hooks/, statusline-command.sh
```

## Stack

| Capa | Tech |
|---|---|
| Web B2C | React 18 + Vite 5 + TypeScript · puerto 5174 dev |
| Web CRO | React 18 + Vite 5 + TypeScript · puerto 5173 dev |
| Backend | Node.js 20 LTS + Express + Helmet + CORS allowlist |
| DB | PostgreSQL 15 vía Supabase — project `mkacuagcvwxoduhdthwg` us-east-2 Ohio |
| Auth + Storage | Supabase (magic link OTP, RLS, bucket `studies`) |
| OCR | DeepSeek Vision + pdf-parse — Edge Function `process-study-draft` (async, no-verify-jwt) |
| Email-to-Vault | Postmark Inbound → `POST /inbound-email` → reusa pipeline OCR |
| AI Copilot + Soporte | DeepSeek `deepseek-chat` (API OpenAI-compatible) |
| Monitoring | Tabla `events` · `/admin/*` en API · `Admin.tsx` en web-cro · Recharts + Realtime |
| Deploy API | Render.com free tier (cold start ~30 s — pasar a Starter $7/mo pre-launch) |

---

## Reglas absolutas — nunca violar

```
SEGURIDAD
- NUNCA usar SUPABASE_SERVICE_ROLE_KEY en el cliente (solo en apps/api)
- NUNCA retornar extracted_fields crudo al cliente — filtrar contra allowlist
- NUNCA exponer profile_id real en respuestas del CRO Panel (usar anon_id)
- NUNCA aceptar patient_hash como parámetro de entrada en endpoints /cro/
- RLS debe estar activo en TODA tabla antes de hacer merge a main
- Cada tabla con PII necesita vista anónima antes de ser accesible desde CRO
- CORS_ORIGIN obligatorio en producción — el API hace process.exit(1) si está vacío en NODE_ENV=production

CONSENTIMIENTO
- Ningún dato del vault puede fluir a CRO sin consent_audit verificable
- consent_audit es append-only: NUNCA UPDATE ni DELETE (trigger block_consent_mutation)
- Minimum cohort size = 5 en todas las vistas CRO (k-anonimato mínimo)

OCR / EDGE FUNCTION
- NUNCA auto-commit de datos extraídos — siempre requiere confirmed=true del usuario
- study_drafts TTL 24 h — pg_cron cleanup a las :17 de cada hora
- OCR es async — frontend navega al Vault inmediatamente post-enqueue
- Edge Function con --no-verify-jwt; auth propia via UUID de draft

COPILOT / SOPORTE
- System prompt en COPILOT_SYSTEM_PROMPT_V1 (apps/api/src/copilot/system-prompt.ts)
- max_tokens: 1024 · Rate limit: 20 queries/usuario/hora (hardcodeado)
- NUNCA incluir PII del usuario en el contexto enviado a DeepSeek API

MONITORING / ADMIN
- /admin/* requiere JWT válido + email @bresca.io (middleware requireBrescaAdmin)
- Tab "Monitoring" en web-cro solo visible para isAdmin (email @bresca.io)
- events tabla: INSERT para todos autenticados, SELECT solo @bresca.io o service_role

EMAIL-TO-VAULT
- POST /inbound-email valida Authorization: Bearer <POSTMARK_INBOUND_SECRET> con timingSafeEqual
- Feature flag INBOUND_EMAIL_ENABLED=true requerido para procesar (sino 503)
- SSRF: descargas de links bloquean rangos privados RFC 1918/loopback/link-local/metadata + resuelven DNS antes de fetch (anti-rebinding)
- Detección de archivos SOLO por magic bytes (parser.ts detectMimeFromBuffer) — Content-Type del remitente no es confiable
- Rate limit en DB (tabla inbound_email_log), no en memoria — sobrevive a restarts de Render
- Webhook responde 200 siempre (incluso en rechazos) para evitar retries de Postmark
```

---

## Patrones de código

```typescript
// Error handling — Result pattern, nunca throw en lógica de negocio
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E }

// Supabase imports
// apps/web-patient, apps/web-cro: import { supabase } from '../lib/supabase'
// apps/api:                       import { supabase } from './lib/supabase' (service_role)

// Commits
feat|fix|chore|docs|test(scope): descripción en español

// Eventos de monitoreo (fire-and-forget desde API)
import { emitEvent } from '../lib/emit-event';
emitEvent('upload_start', 'upload');
// Tipos válidos: page_view, upload_start, upload_complete, copilot_query,
// qr_scan, ocr_complete, cro_search, cro_view, page_exit, study_moved,
// study_updated, support_query, email_inbound_start, email_inbound_complete,
// email_inbound_failed

// Tracking de página (web-patient) — top de cada page component
useTrackNode('home');
```

---

## Módulos del API (apps/api/src/index.ts)

```
/health             → liveness probe — { status: 'ok', ts }
/copilot            → copilotRouter   — chat con DeepSeek, rate limit 20/h, system prompt V1
/qr                 → qrRouter        — generar/leer tokens HMAC con SAFE_FIELDS allowlist
/cro                → croRouter       — búsqueda de cohortes anónimas (k-anon ≥5)
/extract            → extractRouter   — endpoints OCR (status, draft fetch, sanitization)
/account            → accountRouter   — borrado de cuenta (handle_account_deletion)
/admin              → adminRouter     — /metrics, /live — solo email @bresca.io
/studies            → studiesRouter   — CRUD studies del usuario autenticado
/support            → supportRouter   — soporte conversacional (DeepSeek)
/inbound-email      → inboundEmailRouter — webhook Postmark Email-to-Vault
```

Middleware global: `helmet` con CSP `default-src 'none'` + `frameAncestors 'none'`, `cors` con allowlist `CORS_ORIGIN` (split por coma), access log JSON con `sanitizePath` (oculta tokens QR y UUIDs).

---

## Migraciones SQL
- Formato: `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`
- Nunca editar migración existente — cambios en migración nueva
- RLS policies en la misma migración que la tabla
- Migraciones van ANTES del deploy del código que las usa

## Variables de entorno sensibles
```
SUPABASE_SERVICE_ROLE_KEY    → solo apps/api, nunca cliente
SUPABASE_URL                 → URL del project Supabase
SUPABASE_ANON_KEY            → cliente público (web-patient / web-cro)
DEEPSEEK_API_KEY             → rotación mensual (OCR Vision + Copilot + Support)
QR_TOKEN_SECRET              → rotación semestral (HMAC de tokens QR)
CORS_ORIGIN                  → obligatorio en producción, lista separada por coma
CRO_ALLOWED_EMAILS           → emails habilitados para panel CRO, vacío = sin restricción (dev only)
POSTMARK_INBOUND_SECRET      → token Bearer del webhook Postmark (Email-to-Vault)
INBOUND_EMAIL_ENABLED        → feature flag string 'true' (default false)
INBOUND_EMAIL_MAX_PER_DAY    → rate limit por usuario (default 10)
INBOUND_EMAIL_MAX_SIZE_MB    → tamaño máx por adjunto/descarga (default 25)
```

---

## Sistemas en producción

### Pipeline OCR
`study_drafts` INSERT → trigger pg_net → Edge Function `process-study-draft`
Status: `pending → processing → completed | failed`
Drafts expirados se limpian con pg_cron (cada hora, minuto :17).
Edge Function auth: secret hardcodeado en función de trigger (no JWT de usuario).
Columna `source` en `study_drafts` y `studies`: `upload | email | transfer`.

### DICOM Viewer + Upload
**Detección:** por magic bytes — `DICM` en offset 128-131 (`isDicomBuffer()`). No se usa la extensión del archivo. Archivos sin extensión (Linux/Mac) son válidos.

**Transfer Syntax soportados:**
- Uncompressed: Implicit LE · Explicit LE · Explicit BE
- `1.2.840.10008.1.2.4.50` JPEG Baseline (browser native)
- `1.2.840.10008.1.2.4.80/81` JPEG-LS (CharLS WASM `/wasm/charlswasm_decode.js`)
- `1.2.840.10008.1.2.4.90/91` JPEG 2000 (OpenJPEG WASM `/wasm/openjpegwasm_decode.js`)
- `1.2.840.10008.1.2.5` RLE Lossless (pure JS, sin WASM)

**Windowing:** percentiles p2–p98 muestreando desde el cuarto medio de la serie (frames con señal, no aire). Fallback a presets clínicos por modalidad si WW < 50: CT(40/400), MR(500/1000), CR/DX(128/256), MG(2048/4096).

**Límites:** MAX_FRAMES = 200 slices en viewer · MAX_SERIES_FILES = 200 archivos por carpeta.

**Upload carpeta:** `addFolderFiles` acepta cualquier archivo sin filtro de extensión. `isDicomBuffer(files[0])` decide si tomar el path DICOM (sin OCR) o el path OCR. Archivos sin extensión se guardan sin sufijo en storage.

### Email-to-Vault (`apps/api/src/inbound-email/`)
Webhook Postmark Inbound → `POST /inbound-email`. Pipeline:
1. **router.ts** — valida `Authorization: Bearer POSTMARK_INBOUND_SECRET`, crea `inbound_email_log`, lookup user → profile → rate limit → procesa.
2. **parser.ts** — `parseAttachments` (whitelist MIME + magic bytes), `parseLinks` (scoring médico LATAM en HTML/text body).
3. **downloader.ts** — `isSafeUrl` + `isDnsResolutionSafe` (anti-SSRF + anti-DNS-rebinding), descarga con `Content-Length` check, timeout 15s.
4. **enqueuer.ts** — sube a Storage en `{userId}/{uuid}{ext}`, crea `study_drafts` con `source='email'` — el trigger `pg_net` dispara la misma Edge Function OCR.
5. **validator.ts** — `lookupUserByEmail` via RPC `get_user_id_by_email` (SECURITY DEFINER), `getOwnProfile` (owner_user_id IS NULL), `checkRateLimit` contra `inbound_email_log` de últimas 24h.

Tabla `inbound_email_log`: métricas (`parse_duration_ms`, `upload_duration_ms`, `download_duration_ms`, `total_duration_ms`), status (`queued|processing|completed|failed|rejected`), `rejection_reason` (`unknown_sender|no_profile|rate_limited|no_content|invalid_attachment|file_too_large|download_failed`). RLS service_role only.

MAX_FILES_PER_EMAIL = 10 · MAX_LINKS_TO_TRY = 3 · MAX_SIZE_BYTES = 25 MB.

### Monitoring
- `apps/api/src/lib/emit-event.ts` — helper fire-and-forget
- `GET /admin/metrics?period=day|week|month` · `GET /admin/live`
- `apps/web-cro/src/pages/Admin.tsx` — Recharts + KPI cards + Supabase Realtime
- `get_kpis(period TEXT)` — función SQL SECURITY DEFINER

### Auth / Redirect URLs
- Supabase Site URL → web-patient (B2C)
- web-cro login usa `emailRedirectTo: window.location.origin`
- `http://localhost:5173` debe estar en Supabase Auth → Redirect URLs (testing local)

---

## Backlog

### Fixes pendientes
| Item | Severidad | Estado |
|---|---|---|
| `Menu.tsx` — reemplazar número WA placeholder `5491100000000` | 🔴 | ⏸️ Bloqueado — número real pendiente |
| Nombre del Asistente Soporte (placeholder "XYZ") | 🔴 | ⏸️ Bloqueado — decisión de branding |
| Dark mode en `ConsentCenter.tsx` | 🟡 | ⏳ Pendiente diseño |
| Dark mode auth/onboarding (`Welcome`, `Email`, `Verify`) | 🔵 | 📋 Backlog |
| Activar `INBOUND_EMAIL_ENABLED=true` en Render | 🟡 | ⏳ Pendiente MX + Postmark config |

### Funcionalidades próximas
- **Admin funnel:** métricas de sesión (`avg duration_ms por node`) — datos ya en DB, falta la vista en `Admin.tsx`
- **Copilot deep link:** cuando el asistente identifica un documento del vault del usuario, devuelve chip accionable "Ir al estudio →" (ruta interna `/app/vault/:id`). Requiere query a tabla `studies` filtrada por `profile_id` del JWT. Solo para documentos del usuario autenticado (no familiares sin consent en sesión).
- **P2P Vault Transfer** (Fase 4 roadmap): transferencia de estudios entre usuarios con doble consentimiento.
- **ChatGPT Health handoff** (Fase 5 roadmap): export controlado de fragmentos de vault a ChatGPT con disclaimer legal.

### Completado recientemente
- ✅ **Email-to-Vault** (2026-05-18): módulo completo `apps/api/src/inbound-email/`, migración `20260518120000`, tabla `inbound_email_log`, función `get_user_id_by_email`, 3 nuevos event types. Feature flag off por default — falta DNS MX en Postmark.

---

## Documentación de referencia

El vault Obsidian tiene root en `docs/`. Todos los wikilinks omiten el prefijo `docs/` y la extensión `.md`.

**Índice maestro:** [[00_INDEX|00_INDEX — índice maestro del vault]]

**Producto y arquitectura (canon)**
- [[01_RFC-001_Bresca|RFC-001 — Problema y propuesta]]
- [[02_ADR_Bresca|ADR — Decisiones de arquitectura inmutables]]
- [[03_PRD_Bresca|PRD — Product Requirements (F-001..F-009)]]
- [[04_TechSpec_Bresca|Tech Spec — stack, schema, RLS]]
- [[05_SystemDesign_Bresca|System Design — diagramas, flujos, escalabilidad]]
- [[08_SystemPromptSpec_Bresca|System Prompt Spec — Copilot + Soporte]]

**Operaciones**
- [[06_Runbook_Bresca|Runbook — procedimientos, entornos, incidentes]]
- [[07_PostMortem_Bresca|Post-Mortem template]]
- [[15_Incident_Response_Plan|Plan de respuesta a incidentes]]
- [[16_Prod_Setup_Guide|Guía de setup de producción]]
- [[20_ObservabilityPlan_Bresca|Plan de Observabilidad, Resiliencia & SRE]]

**Testing y QA**
- [[09_TestPlan_Bresca|Test Plan — 26 escenarios simulados]]
- [[10_TestResults_Bresca|Test Results — ejecución Haiku]]
- [[18_UserTestingChecklist|Checklist Pruebas de Usuario (~180 ítems)]]

**Seguridad**
- [[14_Security_Audit_2026-05-07|Auditoría de Seguridad — 15 hallazgos]]

**Estrategia, equipo y lanzamiento**
- [[00_bresca_mvp_plan|Plan MVP — 13 semanas, 5 fases]]
- [[000_Plan de Lanzamiento|Análisis pre-lanzamiento + Beta 200 usuarios]]
- [[11_Roadmap_PostMVP|Roadmap Post-MVP — fases 1 a 5]]
- [[12_Bresca_Plan_Marketing_2026|Plan de Marketing v1]]
- [[12.1_Bresca_Plan_Marketing_2026|Plan de Lanzamiento y Marketing v2]]
- [[13_Analisis de Codigo y Arquitectura|Análisis de código y arquitectura — propuestas async]]
- [[17_PreLaunch_Checklist|Checklist Pre-Lanzamiento — 24 BLOQUEANTES]]
- [[19_TEAM_ROLES|Definición de equipo y roles recomendados]]
- [[CTO_CEO_Briefing_Bresca|Briefing CTO → CEO]]

**Research técnico**
- [[21_DICOM_Viewer_Research|DICOM Viewer en el Browser — research exhaustivo]]

**Módulos técnicos**
- [[22_EmailToVault_Spec|Email-to-Vault — spec del módulo]]

**Agentes Hermes (JOBDs en `agents/`)**
- `agents/founding-product-engineer/` — par técnico del CTO, owner co-OCR/DICOM/RLS
- `agents/product-designer-mobile-first/` — Design System + UX writing + curaduría landings
- `agents/compliance-privacy-drafter/` — drafts AAIP, política de privacidad, INC-005

## Design System
```
Design System/Bresca App Prototype.html  → prototipo completo
Design System/colors_and_type.css        → tokens de color, tipografía, spacing
Design System/assets/                    → logos en todos los formatos
Design System/README.md                  → voice & tone, iconografía (Lucide)
```

---

## Comportamiento del agente
Ver `AGENTS.md` para zonas de autonomía completas.
- UI + lógica de negocio → autonomía total
- Migraciones SQL, RLS policies, system prompt Copilot → confirmación previa
- `.env*`, `git push --force`, reducir `MINIMUM_COHORT_SIZE` < 5 → prohibido

Los JOBDs en `agents/` describen tres roles humanos especializados (Founding Product Engineer, Product Designer, Compliance & Privacy Drafter) que se invocan como personas en sesiones específicas — no son agentes autónomos automáticos.

## Contexto de desarrollo
- Equipo: 1 dev + Claude Code como co-developer
- MVP funcional en producción — no prototipo, no enterprise
- El output de este MVP alimenta la siguiente etapa (código no descartable)
- Target inmediato: 50–100 usuarios B2C activos en 90d con NSM "3+ estudios cargados en 30d"
