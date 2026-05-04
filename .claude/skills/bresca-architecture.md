# Skill: bresca-architecture
> Cargar cuando: necesitás entender la estructura del proyecto, crear un archivo nuevo en el lugar correcto, o entender cómo se relacionan los módulos entre sí.

## Estructura completa del monorepo

```
bresca/
├── apps/
│   ├── web-patient/                    # React + Vite — App paciente B2C (en producción)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── App.tsx                 # Router principal
│   │       ├── main.tsx
│   │       ├── pages/
│   │       │   ├── Landing.tsx         # Página de entrada B2C (standalone)
│   │       │   ├── auth/
│   │       │   │   ├── Welcome.tsx     # F-001: pantalla bienvenida
│   │       │   │   ├── Onboarding.tsx  # F-001: propuesta de valor
│   │       │   │   └── Signup.tsx      # F-001: crear cuenta (sin email obligatorio)
│   │       │   └── app/
│   │       │       ├── Vault.tsx       # F-002: Health Vault — listado + drafts pendientes
│   │       │       ├── Upload.tsx      # F-002: Upload foto/archivo + OCR non-blocking
│   │       │       ├── StudyDetail.tsx # F-002: Detalle + imágenes multi-página
│   │       │       ├── Copilot.tsx     # F-003: AI Copilot chat
│   │       │       ├── QRGenerate.tsx  # F-004: Generar QR sharing + lista de QRs activos
│   │       │       ├── Family.tsx      # F-005: Gestión familiar — crear perfiles dependientes
│   │       │       ├── Consent.tsx     # F-006: Centro de consentimiento (3 capas + historial)
│   │       │       └── Settings.tsx
│   │       ├── components/             # Componentes compartidos web-patient
│   │       ├── hooks/                  # React hooks custom (useProfile, etc.)
│   │       └── lib/
│   │           └── api.ts              # Cliente HTTP hacia apps/api
│   │
│   ├── web-cro/                        # React + Vite — Panel investigador B2B (pendiente deploy)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── pages/
│   │       │   ├── LandingCRO.tsx      # Página de entrada B2B (standalone)
│   │       │   ├── Dashboard.tsx       # F-007: métricas + funnel
│   │       │   ├── Matching.tsx        # F-008: matching anónimo
│   │       │   └── Invite.tsx          # F-009: flujo invitación
│   │       ├── components/
│   │       └── hooks/
│   │
│   └── api/                            # Node.js + Express — Backend REST (Render.com)
│       └── src/
│           ├── index.ts                # Entry point Express
│           ├── health.ts               # GET /health
│           ├── extract/
│           │   └── router.ts           # POST /extract, POST /extract/confirm
│           ├── copilot/
│           │   ├── router.ts           # POST /copilot/chat
│           │   ├── system-prompt.ts    # COPILOT_SYSTEM_PROMPT_V1 — constante
│           │   └── rate-limit.ts       # 20 queries/hora/usuario
│           ├── qr/
│           │   └── router.ts           # POST /qr/generate, GET /qr/:token
│           ├── consent/
│           │   └── router.ts           # POST /consent
│           ├── family/
│           │   └── router.ts           # GET/POST /family/profiles
│           ├── cro/
│           │   ├── router.ts           # GET /cro/dashboard, POST /cro/match
│           │   └── matching.ts         # Fit score + anonimización
│           ├── middleware/
│           │   ├── auth.ts             # Verificar JWT Supabase
│           │   └── cro-auth.ts         # Auth separado CRO
│           └── lib/
│               └── supabase.ts         # Cliente service_role (NUNCA en cliente)
│
├── packages/
│   └── shared/
│       └── src/
│           ├── supabase.ts             # ÚNICO punto de creación del cliente anon
│           ├── database.types.ts       # Generado por supabase gen types
│           ├── result.ts               # type Result<T, E>
│           └── constants.ts            # MINIMUM_COHORT_SIZE=5, MAX_COPILOT_RPH=20, etc.
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260401120000_initial_schema.sql
│   │   ├── 20260408090000_add_study_embeddings.sql
│   │   ├── 20260415140000_add_cro_tables.sql
│   │   ├── 20260503220000_family_profiles.sql      # profiles.owner_user_id, RLS OR pattern
│   │   └── YYYYMMDDHHMMSS_nombre.sql               # formato siempre
│   ├── seed/
│   │   └── development.sql             # Datos sintéticos para desarrollo local
│   └── functions/
│       └── process-study-draft/        # Edge Function OCR async (DeepSeek Vision / pdf-parse)
│           └── index.ts                # Disparada por pg_net trigger en INSERT study_drafts
│
├── scripts/
│   └── post-deploy-qa.mjs              # QA runner post-deploy — 14 tests, análisis Haiku
│
├── docs/                               # Los 10 documentos de ingeniería
├── .claude/
│   ├── CLAUDE.md
│   ├── skills/                         # Este archivo y los demás skills
│   ├── settings.json
│   └── hooks/
│       └── filter-test-output.sh
├── turbo.json
└── package.json                        # Workspaces root (pnpm)
```

## Deploy actual (2026-05-04)

| Servicio | Plataforma | URL |
|---|---|---|
| DB + Auth + Storage | Supabase | `mkacuagcvwxoduhdthwg` |
| API Backend | Render.com | `https://bresca-api.onrender.com` |
| Web B2C (paciente) | Vercel | `https://bresca-app-api.vercel.app` |
| Web B2B (CRO) | Vercel | Pendiente de deploy |
| Mobile | — | No iniciado aún |

## Decisiones de arquitectura (resumen rápido)
Ver `docs/02_ADR_Bresca.md` para el detalle completo de cada una.

| Decisión | Qué | Por qué |
|---|---|---|
| ADR-001 | Supabase para todo el data layer | Anon sign-in + RLS nativo + CLI local |
| ADR-002 | Anonimización por vistas SQL | Auditable, sin criptografía compleja en MVP |
| ADR-003 | web-patient como SPA React (mobile pendiente) | MVP funciona en web — mobile es siguiente fase |
| ADR-004 | consent_audit append-only | LGPD + ICH GCP — trazabilidad completa |
| ADR-005 | DeepSeek API (OCR Vision + Copilot) | Balance costo/performance para MVP |

## Flujo crítico: upload de estudio (OCR non-blocking)

```
1. web-patient: usuario selecciona archivo(s)
2. POST /extract → Storage upload → INSERT study_drafts (status='pending') → 202
3. Frontend navega al Vault inmediatamente (sin esperar OCR)
4. pg_net trigger → Edge Function process-study-draft (async)
5. Edge Function: DeepSeek Vision (imágenes) / pdf-parse (PDFs) → extracted_fields
6. Supabase Realtime → Frontend actualiza card del draft (done/error)
7. POST /extract/confirm → study_draft → studies (confirmed=true)
```

## Convenciones de naming

```
Archivos TS:          camelCase.ts
Componentes React:    PascalCase.tsx
Tablas DB:            snake_case plural (profiles, studies, study_drafts)
Columnas DB:          snake_case (profile_id, owner_user_id, created_at)
Migraciones:          YYYYMMDDHHMMSS_verbo_objeto.sql
Variables entorno:    SCREAMING_SNAKE_CASE
```

## Imports — orden mandatorio

```typescript
// 1. Node built-ins
import { readFileSync } from 'fs';

// 2. External packages
import express from 'express';

// 3. Internal packages (workspace)
import { supabase } from '@bresca/shared/supabase';
import type { Database } from '@bresca/shared/database.types';

// 4. Relative imports
import { validateUpload } from '../middleware/upload';
```
