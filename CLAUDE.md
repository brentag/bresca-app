# Bresca — Claude Code Context

## Proyecto
**MVP en producción.** Plataforma two-sided de datos de salud en LATAM.
- **B2C `web-patient`:** health vault, DICOM viewer, OCR, copilot IA, QR sharing, familia, consentimiento
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
packages/shared                         → Supabase singleton, tipos TS, utils
supabase/                               → migraciones SQL, seed, Edge Functions
scripts/                                → post-deploy-qa.mjs y operacionales
.claude/                                → skills/, settings.json, hooks/, statusline-command.sh
```

## Stack

| Capa | Tech |
|---|---|
| Web B2C | React 18 + Vite 5 + TypeScript · puerto 5174 dev |
| Web CRO | React 18 + Vite 5 + TypeScript · puerto 5173 dev |
| Backend | Node.js 20 LTS + Express |
| DB | PostgreSQL 15 vía Supabase — project `mkacuagcvwxoduhdthwg` us-east-2 |
| Auth + Storage | Supabase (magic link OTP, RLS, bucket `studies`) |
| OCR | DeepSeek Vision + pdf-parse — Edge Function `process-study-draft` (async, no-verify-jwt) |
| AI Copilot + Soporte | DeepSeek `deepseek-chat` (API OpenAI-compatible) |
| Monitoring | Tabla `events` · `/admin/*` en API · `Admin.tsx` en web-cro |
| Deploy API | Render.com free tier (cold start ~30 s) |

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

CONSENTIMIENTO
- Ningún dato del vault puede fluir a CRO sin consent_audit verificable
- consent_audit es append-only: NUNCA UPDATE ni DELETE
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
```

---

## Patrones de código

```typescript
// Error handling — Result pattern, nunca throw en lógica de negocio
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E }

// Supabase imports
// apps/web-patient, apps/web-cro: import { supabase } from '../lib/supabase'
// apps/api:                       import { supabase } from '@bresca/shared/supabase'

// Commits
feat|fix|chore|docs|test(scope): descripción en español

// Eventos de monitoreo (fire-and-forget desde API)
import { emitEvent } from '../lib/emit-event';
emitEvent('upload_start', 'upload');

// Tracking de página (web-patient) — top de cada page component
useTrackNode('home');
```

---

## Migraciones SQL
- Formato: `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`
- Nunca editar migración existente — cambios en migración nueva
- RLS policies en la misma migración que la tabla
- Migraciones van ANTES del deploy del código que las usa

## Variables de entorno sensibles
```
SUPABASE_SERVICE_ROLE_KEY  → solo apps/api, nunca cliente
DEEPSEEK_API_KEY           → rotación mensual (OCR Vision + Copilot)
QR_TOKEN_SECRET            → rotación semestral
```

---

## Sistemas en producción

### Pipeline OCR
`study_drafts` INSERT → trigger pg_net → Edge Function `process-study-draft`  
Status: `pending → processing → completed | failed`  
Drafts expirados se limpian con pg_cron (cada hora, minuto :17).  
Edge Function auth: secret hardcodeado en función de trigger (no JWT de usuario).

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

### Funcionalidades próximas
- **Admin funnel:** métricas de sesión (`avg duration_ms por node`) — datos ya en DB, falta la vista en `Admin.tsx`
- **Copilot deep link:** cuando el asistente identifica un documento del vault del usuario, devuelve chip accionable "Ir al estudio →" (ruta interna `/app/vault/:id`). Requiere query a tabla `studies` filtrada por `profile_id` del JWT. Solo para documentos del usuario autenticado (no familiares sin consent en sesión).

---

## Documentación de referencia
```
docs/01_RFC-001_Bresca.md        RFC técnico inicial
docs/02_ADR_Bresca.md            Architecture Decision Records
docs/03_PRD_Bresca.md            Product Requirements
docs/04_TechSpec_Bresca.md       Especificación técnica
docs/05_SystemDesign_Bresca.md   Diseño de sistema
docs/06_Runbook_Bresca.md        Operaciones y runbook
docs/09_TestPlan_Bresca.md       Plan de pruebas
docs/10_TestResults_Bresca.md    Resultados de testing
docs/14_Security_Audit_2026-05-07.md  Auditoría de seguridad
docs/15_Incident_Response_Plan.md
docs/16_Prod_Setup_Guide.md
docs/17_PreLaunch_Checklist.md   24 ítems BLOQUEANTES para launch
docs/18_UserTestingChecklist.md  ~180 ítems con checkbox — pruebas de usuario completas
```

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

## Contexto de desarrollo
- Equipo: 1 dev + Claude Code como co-developer
- MVP funcional en producción — no prototipo, no enterprise
- El output de este MVP alimenta la siguiente etapa (código no descartable)
