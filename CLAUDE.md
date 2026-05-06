# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bresca — Claude Code Context

## Estado del proyecto
**Fase actual: MVP en producción.** web-patient + API live. web-cro implementado pero pendiente de deploy en Vercel. Mobile no iniciado aún.

## Producto
Plataforma two-sided de datos de salud en LATAM.
- **B2C:** web app para pacientes (health vault, copilot IA, QR sharing, familia, consentimiento)
- **B2B:** panel CRO (dashboard, matching anónimo, funnel de estudios clínicos)

## Comandos

```bash
# Desarrollo
pnpm dev                                    # Levanta todos los apps (Turborepo)
pnpm dev --filter=web-cro                   # Solo panel CRO
pnpm dev --filter=api                       # Solo backend

# Supabase local
supabase start                              # Levanta DB + Auth + Storage local
supabase db reset --local                   # Reset completo + seed (permitido)
supabase gen types typescript --project-ref mkacuagcvwxoduhdthwg \
  > packages/shared/src/database.types.ts

# Tests
pnpm test                                   # Todos los packages
pnpm test --filter=api                      # Solo tests del backend
npx jest --testPathPattern=rls              # Tests RLS específicos
npx vitest run --reporter=verbose           # Tests unitarios con detalle

# Lint + tipos
npx eslint apps/                            # Lint
npx tsc --noEmit                            # Chequeo de tipos sin compilar

# QA post-deploy
node scripts/post-deploy-qa.mjs             # 14 tests — mínimo 12/14 aceptable
node scripts/post-deploy-qa.mjs --no-issues # Sin crear GitHub issues

# Mobile (pendiente — no iniciado aún)
# cd apps/mobile && npx expo start
```

## Monorepo
```
apps/web-patient  → React + Vite — app paciente B2C (en producción en Vercel)
apps/web-cro      → React + Vite — panel investigador B2B (pendiente deploy)
apps/api          → Node.js + Express — backend REST (en producción en Render.com)
packages/shared   → Supabase singleton, tipos TS, utils
supabase/         → migraciones SQL, seed, Edge Functions
scripts/          → post-deploy-qa.mjs y otros scripts operacionales
.claude/          → CLAUDE.md, skills/, settings.json, hooks/
```

## Stack
| Capa | Tech |
|---|---|
| Web B2C (paciente) | React 18 + Vite 5 + TypeScript |
| Web CRO | React 18 + Vite 5 + TypeScript |
| Backend | Node.js 20 LTS + Express |
| DB | PostgreSQL 15 vía Supabase |
| Auth + Storage | Supabase (anon sign-in, RLS, buckets) |
| OCR | DeepSeek Vision + pdf-parse (Edge Function Supabase, async) |
| AI Copilot | DeepSeek — `deepseek-chat` (API OpenAI-compatible) |
| Push | expo-notifications + FCM/APNs (pendiente — mobile no iniciado) |
| Deploy API | Render.com — `https://bresca-api.onrender.com` |
| Deploy Web B2C | Vercel — `https://bresca-app-api.vercel.app` |
| Deploy Web CRO | Vercel — pendiente |

## Reglas absolutas — nunca violar

```
SEGURIDAD
- NUNCA usar SUPABASE_SERVICE_ROLE_KEY en el cliente (solo en apps/api)
- NUNCA retornar extracted_fields crudo al cliente — filtrar contra allowlist
- NUNCA exponer profile_id real en respuestas del CRO Panel (usar md5 hash)
- NUNCA aceptar patient_hash como parámetro de entrada en endpoints /cro/
- RLS debe estar activo en TODA tabla antes de hacer merge a main
- Cada tabla con PII necesita vista anónima antes de ser accesible desde CRO

CONSENTIMIENTO
- Ningún dato del vault puede fluir a CRO sin consent_audit verificable
- consent_audit es append-only: NUNCA UPDATE ni DELETE
- Minimum cohort size = 5 en todas las vistas CRO (k-anonimato mínimo)

OCR
- NUNCA auto-commit de datos extraídos — siempre requiere confirmed=true del usuario
- study_drafts tiene TTL de 24h — limpiar con pg_cron
- OCR es async (Edge Function) — el frontend navega al Vault inmediatamente post-enqueue

COPILOT
- System prompt en COPILOT_SYSTEM_PROMPT_V1 (constante en apps/api/src/copilot/system-prompt.ts)
- max_tokens: 1024 — el Copilot no escribe ensayos
- Rate limit: 20 queries/usuario/hora — hardcodeado, no configurable por usuario
- NUNCA incluir PII del usuario en el contexto enviado a la DeepSeek API
```

## Patrones de código

```typescript
// Error handling — Result pattern, nunca throw en lógica de negocio
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E }

// Supabase — singleton único, nunca importar @supabase/supabase-js directo
import { supabase } from '@bresca/shared/supabase'

// Commits
feat|fix|chore|docs|test(scope): descripción en español
```

## Migraciones SQL
- Formato: `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`
- Nunca editar migración existente — cambios en migración nueva
- RLS policies en la misma migración que la tabla
- Migraciones van ANTES del deploy del código que las usa
- Aplicar con: `supabase db push --linked --project-ref mkacuagcvwxoduhdthwg`

## Variables de entorno sensibles
```
SUPABASE_SERVICE_ROLE_KEY  → solo apps/api, nunca cliente
DEEPSEEK_API_KEY           → rotación mensual (OCR Vision + Copilot)
QR_TOKEN_SECRET            → rotación semestral
```

## Skills disponibles (cargar con @skill nombre)
```
@skill bresca-architecture    → estructura completa del proyecto, rutas, deploy actual
@skill supabase-rls           → patrones RLS, políticas multi-perfil, QR, CRO
@skill ocr-pipeline           → schema de campos clínicos, extracción async, Edge Function
@skill copilot-context        → contexto del vault, DeepSeek API, rate limiting
@skill consent-system         → schema consent_audit, 3 capas, auditoría append-only
@skill cro-matching           → fit score, anonimización, vistas SQL
@skill react-native-patterns  → navegación Expo, push notifications, EAS Build (mobile pendiente)
@skill testing-patterns       → E2E flows críticos, RLS tests, Copilot rule tests
@skill post-deploy-qa         → runner QA post-deploy, 14 tests, análisis Haiku
```

## Diseño UX/UI

El prototipo interactivo es el source of truth para implementar pantallas:

```
Design System/Bresca App Prototype.html   → prototipo B2C + panel CRO completo (abrir en browser)
Design System/prototype/                  → componentes JSX del prototipo por pantalla
Design System/colors_and_type.css         → tokens de color, tipografía, spacing
Design System/assets/                     → logos en todos los formatos
Design System/README.md                   → voice & tone, color system, iconografía (Lucide)
```

Navegación del prototipo: sidebar izquierdo mapea todos los flows (Onboarding → Vault → Copilot → Familia → Menú → Panel CRO). El botón "Ver Panel CRO" alterna entre las dos interfaces.

## Documentación de referencia
```
docs/01_RFC-001_Bresca.md       → por qué existe Bresca, problema y solución
docs/02_ADR_Bresca.md           → decisiones técnicas registradas (ADR-001 a ADR-006)
docs/03_PRD_Bresca.md           → qué construir, features, criterios de éxito
docs/04_TechSpec_Bresca.md      → schema DB, RLS policies, flujos de datos
docs/05_SystemDesign_Bresca.md  → arquitectura, escalabilidad, seguridad
docs/06_Runbook_Bresca.md       → operaciones, deploys, incidentes
docs/07_PostMortem_Bresca.md    → template blameless
docs/08_SystemPromptSpec_Bresca.md → system prompt Copilot, test suite CT-001/CT-007
docs/09_TestPlan_Bresca.md      → plan de pruebas del MVP (26 escenarios)
docs/10_TestResults_Bresca.md   → resultados QA post-deploy (25/26 OK, 1 pendiente TS-023)
```

## Comportamiento del agente
Ver `AGENTS.md` para zonas de autonomía, confirmación y exclusión absoluta. Resumen:
- UI + lógica de negocio → autonomía total
- Migraciones SQL, RLS policies, system prompt Copilot → confirmación previa
- `.env*`, `git push --force`, reducir `MINIMUM_COHORT_SIZE` < 5 → prohibido

## Contexto de desarrollo
- Equipo: 1 dev + Claude Code como co-developer
- MVP funcional en producción — no prototipo, no production enterprise
- El output de este MVP alimenta la siguiente etapa (código no descartable)
- Diseño UX/UI completo en Claude Projects — input nativo disponible
