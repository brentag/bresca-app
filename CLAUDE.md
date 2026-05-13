# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bresca — Claude Code Context

## Estado del proyecto
**Fase actual: MVP en producción.** web-patient + API + web-cro live. Mobile no iniciado.

## Producto
Plataforma two-sided de datos de salud en LATAM.
- **B2C:** web app pacientes (health vault, copilot IA, QR sharing, familia, consentimiento)
- **B2B:** panel CRO (dashboard, matching anónimo, funnel de estudios clínicos, monitoring)

## Comandos

```bash
# Desarrollo
pnpm dev                          # Levanta todos los apps (Turborepo)
pnpm dev --filter=web-cro         # Solo panel CRO
pnpm dev --filter=api             # Solo backend

# Supabase local
supabase start
supabase db reset --local         # Reset completo + seed
supabase gen types typescript --project-id mkacuagcvwxoduhdthwg \
  > packages/shared/src/database.types.ts

# Deploy
supabase db push --linked         # Aplica migraciones pendientes al remoto
supabase functions deploy process-study-draft \
  --no-verify-jwt --project-ref mkacuagcvwxoduhdthwg --use-api

# Tests y QA
pnpm test
npx jest --testPathPattern=rls
npx vitest run --reporter=verbose
node scripts/post-deploy-qa.mjs   # 14 tests — mínimo 12/14 aceptable

# Lint + tipos
npx eslint apps/
npx tsc --noEmit
```

## Monorepo
```
apps/web-patient  → React + Vite — app paciente B2C (Vercel: bresca-app-api.vercel.app)
apps/web-cro      → React + Vite — panel investigador B2B (Vercel: bresca-cro.vercel.app)
apps/api          → Node.js + Express — backend REST (Render: bresca-api.onrender.com)
packages/shared   → Supabase singleton, tipos TS, utils
supabase/         → migraciones SQL, seed, Edge Functions
scripts/          → post-deploy-qa.mjs y otros scripts operacionales
.claude/          → commands/, skills/, settings.json, hooks/
```

## Stack
| Capa | Tech |
|---|---|
| Web B2C (paciente) | React 18 + Vite 5 + TypeScript — puerto 5174 dev |
| Web CRO | React 18 + Vite 5 + TypeScript — puerto 5173 dev |
| Backend | Node.js 20 LTS + Express |
| DB | PostgreSQL 15 vía Supabase (project: `mkacuagcvwxoduhdthwg` us-east-2) |
| Auth + Storage | Supabase (anon sign-in, RLS, buckets) |
| OCR | DeepSeek Vision + pdf-parse — Edge Function `process-study-draft` (async, no-verify-jwt) |
| AI Copilot | DeepSeek `deepseek-chat` (API OpenAI-compatible) |
| Monitoring | Tabla `events` + `/admin/*` en API + `Admin.tsx` en web-cro |
| Deploy API | Render.com free tier (cold start ~30s — upgrade a Starter $7/mo pendiente) |

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
- study_drafts tiene TTL de 24h — pg_cron cleanup a las :17 de cada hora
- OCR es async — el frontend navega al Vault inmediatamente post-enqueue
- Edge Function deployada con --no-verify-jwt (auth propia por UUID de draft)

COPILOT
- System prompt en COPILOT_SYSTEM_PROMPT_V1 (apps/api/src/copilot/system-prompt.ts)
- max_tokens: 1024
- Rate limit: 20 queries/usuario/hora — hardcodeado, no configurable
- NUNCA incluir PII del usuario en el contexto enviado a DeepSeek API

MONITORING / ADMIN
- /admin/* requiere JWT válido + email @bresca.io (middleware requireBrescaAdmin)
- Tab "Monitoring" en web-cro solo visible para isAdmin (email @bresca.io)
- events tabla: INSERT para todos autenticados, SELECT solo @bresca.io o service_role
```

## Patrones de código

```typescript
// Error handling — Result pattern, nunca throw en lógica de negocio
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E }

// Supabase — singleton, pero web-patient importa local (no @bresca/shared/supabase)
// apps/web-patient y apps/web-cro: import { supabase } from '../lib/supabase'
// apps/api:                        import { supabase } from '@bresca/shared/supabase'

// Commits
feat|fix|chore|docs|test(scope): descripción en español

// Eventos de monitoreo (fire-and-forget desde API)
import { emitEvent } from '../lib/emit-event';
emitEvent('upload_start', 'upload');   // no bloquea el response

// Tracking de página (web-patient)
useTrackNode('home');  // en el top de cada page component
```

## Migraciones SQL
- Formato: `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`
- Nunca editar migración existente — cambios en migración nueva
- RLS policies en la misma migración que la tabla
- Migraciones van ANTES del deploy del código que las usa
- Aplicar: `supabase db push --linked`  ← NO usar `--project-ref` con `--linked`

## Variables de entorno sensibles
```
SUPABASE_SERVICE_ROLE_KEY  → solo apps/api, nunca cliente
DEEPSEEK_API_KEY           → rotación mensual (OCR Vision + Copilot)
QR_TOKEN_SECRET            → rotación semestral
```

## Sistemas activos en producción

### Pipeline OCR
- INSERT en `study_drafts` → trigger pg_net → Edge Function `process-study-draft`
- La Edge Function usa `--no-verify-jwt`; la auth la hace el trigger con un secret hardcodeado en la función del trigger
- Status pipeline: `pending → processing → completed | failed`
- Drafts expirados/fallidos se limpian con pg_cron (cada hora, minuto :17)

### Monitoring
- `apps/api/src/lib/emit-event.ts` — helper fire-and-forget
- `apps/api/src/admin/router.ts` — `GET /admin/metrics?period=day|week|month`, `GET /admin/live`
- `apps/web-cro/src/pages/Admin.tsx` — BarChart Recharts + KPI cards + Supabase Realtime
- `get_kpis(period TEXT)` — función SQL SECURITY DEFINER en la DB

### Auth / Redirect URLs
- Supabase Site URL apunta a web-patient (B2C)
- web-cro login usa `emailRedirectTo: window.location.origin`
- `http://localhost:5173` debe estar en Supabase Auth → Redirect URLs allow-list para testing local

## Pendientes de código (backlog)

### Fixes y deuda técnica
| Item | Severidad | Estado |
|---|---|---|
| `Menu.tsx` — reemplazar número WA `5491100000000` | 🔴 | ⏸️ Bloqueado — número real pendiente |
| Dark mode en `ConsentCenter.tsx` | 🟡 | ⏳ Esperando diseño oscuro |
| Dark mode auth/onboarding (`Welcome`, `Email`, `Verify`) | 🔵 | 📋 Backlog |

### Próximas funcionalidades
> Todo el backlog 2026-05-13 completado y en producción (`8a62d7d2`). Próximo sprint por definir.

Pendiente de naming: Asistente Soporte usa placeholder "XYZ" — definir nombre en sesión de branding antes de lanzar UI al usuario.

Admin.tsx: métricas de sesión (`avg duration_ms por node`, funnel) — quedó fuera del sprint, datos ya se persisten en DB.

#### Copilot — respuestas con deep link accionable (1 click)
- **Trigger:** el usuario pregunta al asistente sobre un documento específico de su vault (ej: "cómo comparto la última mamografía de Monica")
- **Comportamiento actual:** el asistente responde con los pasos correctos en texto
- **Mejora:** cuando el asistente identifica un documento concreto del vault del usuario, además de los pasos devuelve un botón/chip "Ir a la mamografía →" que lleva directo al documento
- **Implementación:**
  - El copilot necesita acceso al vault del usuario autenticado (query `vault_documents` filtrado por `profile_id` del JWT, con RLS activo)
  - El system prompt debe incluir instrucción: si la respuesta refiere a un documento existente, retornar un JSON estructurado con `{ text, actionLink: { label, path } }` además del texto
  - El frontend parsea ese campo y renderiza un chip accionable bajo la respuesta
  - El link es una ruta interna (`/vault/document/:id`) — no se expone URL externa
  - Sin cambios de RLS necesarios — el usuario accede solo a sus propios docs
- **Restricciones:** solo para documentos del propio usuario autenticado; nunca para documentos de familiares sin consent explícito en esa sesión
- **Estado:** 📋 Backlog — pendiente sprint

## Skills disponibles (`@skill nombre`)
```
bresca-architecture · supabase-rls · ocr-pipeline · copilot-context
consent-system · cro-matching · react-native-patterns · testing-patterns · post-deploy-qa
```

## Diseño UX/UI
```
Design System/Bresca App Prototype.html  → prototipo completo (abrir en browser)
Design System/colors_and_type.css        → tokens de color, tipografía, spacing
Design System/assets/                    → logos en todos los formatos
Design System/README.md                  → voice & tone, iconografía (Lucide)
```

## Documentación de referencia
```
docs/01_RFC-001_Bresca.md · docs/02_ADR_Bresca.md · docs/03_PRD_Bresca.md
docs/04_TechSpec_Bresca.md · docs/05_SystemDesign_Bresca.md · docs/06_Runbook_Bresca.md
docs/09_TestPlan_Bresca.md · docs/10_TestResults_Bresca.md
docs/14_Security_Audit_2026-05-07 · docs/15_Incident_Response_Plan.md
docs/16_Prod_Setup_Guide.md · docs/17_PreLaunch_Checklist.md  ← 24 ítems BLOQUEANTE
```

## Comportamiento del agente
Ver `AGENTS.md` para zonas de autonomía completas. Resumen:
- UI + lógica de negocio → autonomía total
- Migraciones SQL, RLS policies, system prompt Copilot → confirmación previa
- `.env*`, `git push --force`, reducir `MINIMUM_COHORT_SIZE` < 5 → prohibido

## Contexto de desarrollo
- Equipo: 1 dev + Claude Code como co-developer
- MVP funcional en producción — no prototipo, no enterprise
- El output de este MVP alimenta la siguiente etapa (código no descartable)
