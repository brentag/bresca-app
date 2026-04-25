# Skill: bresca-architecture
> Cargar cuando: necesitás entender la estructura del proyecto, crear un archivo nuevo en el lugar correcto, o entender cómo se relacionan los módulos entre sí.

## Estructura completa del monorepo

```
bresca/
├── apps/
│   ├── mobile/
│   │   ├── app/                    # Expo Router — file-based routing
│   │   │   ├── (auth)/             # Grupo de rutas sin autenticación
│   │   │   │   ├── welcome.tsx     # F-001: pantalla bienvenida
│   │   │   │   ├── onboarding.tsx  # F-001: propuesta de valor
│   │   │   │   └── signup.tsx      # F-001: crear cuenta (sin email obligatorio)
│   │   │   ├── (app)/              # Grupo de rutas con autenticación
│   │   │   │   ├── index.tsx       # Dashboard / Home
│   │   │   │   ├── vault/          # F-002: Health Vault
│   │   │   │   │   ├── index.tsx   # Listado + filtros
│   │   │   │   │   ├── upload.tsx  # Upload foto/archivo
│   │   │   │   │   ├── confirm.tsx # Confirmación OCR
│   │   │   │   │   └── [id].tsx    # Detalle de estudio
│   │   │   │   ├── copilot.tsx     # F-003: AI Copilot chat
│   │   │   │   ├── qr.tsx          # F-004: Generar QR sharing
│   │   │   │   ├── family/         # F-005: Gestión familiar
│   │   │   │   │   ├── index.tsx   # Lista de perfiles
│   │   │   │   │   └── [id].tsx    # Perfil individual
│   │   │   │   ├── consent/        # F-006: Centro de consentimiento
│   │   │   │   │   └── index.tsx   # 3 capas + historial
│   │   │   │   └── settings.tsx
│   │   │   └── qr/
│   │   │       └── [token].tsx     # Vista médico — acceso sin registro
│   │   ├── components/             # Componentes compartidos mobile
│   │   ├── hooks/                  # React hooks custom
│   │   └── constants/
│   │
│   ├── web-cro/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx   # F-007: métricas + funnel
│   │   │   │   ├── Studies/        # Gestión de estudios CRO
│   │   │   │   ├── Matching/       # F-008: matching anónimo
│   │   │   │   └── Invite/         # F-009: flujo invitación
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts         # Onboarding, signup anónimo
│       │   │   ├── upload.ts       # Recibe multipart, llama OCR
│       │   │   ├── confirm.ts      # study_draft → studies
│       │   │   ├── copilot.ts      # Chat con Claude API
│       │   │   ├── qr.ts           # Crear y leer tokens QR
│       │   │   ├── consent.ts      # INSERT consent_audit
│       │   │   ├── family.ts       # CRUD perfiles
│       │   │   └── cro/            # Rutas del panel CRO
│       │   │       ├── dashboard.ts
│       │   │       ├── matching.ts
│       │   │       └── invite.ts
│       │   ├── services/
│       │   │   ├── ocr.ts          # Google Document AI + Textract fallback
│       │   │   ├── embeddings.ts   # Generar embeddings para Copilot
│       │   │   └── notifications.ts # Push via Expo
│       │   ├── copilot/
│       │   │   ├── system-prompt.ts # COPILOT_SYSTEM_PROMPT_V1 — constante
│       │   │   ├── retrieval.ts     # Chunking + cosine similarity
│       │   │   └── rate-limit.ts    # 20 queries/hora/usuario
│       │   ├── middleware/
│       │   │   ├── auth.ts          # Verificar JWT Supabase
│       │   │   ├── cro-auth.ts      # Auth separado CRO
│       │   │   └── rate-limit.ts    # Rate limiting global
│       │   └── health.ts            # GET /health
│       └── railway.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── supabase.ts         # ÚNICO punto de creación del cliente
│       │   ├── database.types.ts   # Generado por supabase gen types
│       │   ├── result.ts           # type Result<T, E>
│       │   └── constants.ts        # MINIMUM_COHORT_SIZE, MAX_COPILOT_RPH, etc.
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS_nombre.sql
│   ├── seed/
│   │   └── development.sql         # Datos sintéticos para desarrollo local
│   └── functions/
│       ├── generate-embeddings/    # Async: genera embeddings post-confirm
│       └── expire-qr-tokens/       # pg_cron: limpia tokens expirados
│
├── docs/                           # Los 8 documentos de ingeniería
├── .claude/
│   ├── CLAUDE.md
│   ├── skills/                     # Este archivo y los demás skills
│   ├── settings.json
│   └── hooks/
│       └── filter-test-output.sh
├── turbo.json
└── package.json                    # Workspaces root
```

## Decisiones de arquitectura (resumen rápido)
Ver `docs/02_ADR_Bresca.md` para el detalle completo de cada una.

| Decisión | Qué | Por qué |
|---|---|---|
| ADR-001 | Supabase para todo el data layer | Anon sign-in + RLS nativo + CLI local |
| ADR-002 | Anonimización por vistas SQL | Auditable, sin criptografía compleja en MVP |
| ADR-003 | Expo managed workflow | Un codebase, diseño nativo en Claude Projects |
| ADR-004 | consent_audit append-only | LGPD + ICH GCP — trazabilidad completa |
| ADR-005 | Claude API con chunking semántico | Context window controlado, costo predecible |

## Convenciones de naming

```
Archivos TS:          camelCase.ts
Componentes React:    PascalCase.tsx
Rutas Expo Router:    kebab-case.tsx o [param].tsx
Tablas DB:            snake_case plural (users, profiles, studies)
Columnas DB:          snake_case (profile_id, created_at)
Migraciones:          YYYYMMDDHHMMSS_verbo_objeto.sql
Variables entorno:    SCREAMING_SNAKE_CASE
```

## Imports — orden mandatorio

```typescript
// 1. Node built-ins
import { readFileSync } from 'fs';

// 2. External packages
import express from 'express';
import { anthropic } from '@anthropic-ai/sdk';

// 3. Internal packages (workspace)
import { supabase } from '@bresca/shared/supabase';
import type { Database } from '@bresca/shared/database.types';

// 4. Relative imports
import { validateUpload } from '../middleware/upload';
```
