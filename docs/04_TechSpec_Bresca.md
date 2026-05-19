# Tech Spec — Technical Specification
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | `APPROVED` |
| **Autor** | Engineering Lead |
| **Fecha** | Abril 2026 |
| **Relacionado con** | [[02_ADR_Bresca|ADR-001 a ADR-005]], [[03_PRD_Bresca|PRD v1.0]] |

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Web B2C (paciente) | React + Vite + TypeScript | React 18 / Vite 5 | SPA. Deploy en Vercel. App mobile pendiente. |
| Web B2B (CRO) | React + Vite + TypeScript | React 18 / Vite 5 | SPA liviana. Panel CRO no requiere SSR. |
| Backend API | Node.js + Express | Node 20 LTS | Familiar para el equipo. Sin overhead de framework. |
| Base de datos | PostgreSQL 15 vía Supabase | 15.x | RLS nativo, vistas SQL, `pg_cron` para TTL drafts y QR expiry. |
| Auth + Storage | Supabase Auth + Storage | Latest | Anon sign-in, RLS policies, buckets por perfil. |
| OCR | DeepSeek Vision + pdf-parse + Tesseract.js | — | Edge Function Supabase. Async via trigger `pg_net`. |
| AI Copilot | DeepSeek (`deepseek-chat`) | API OpenAI-compatible | Balance costo/performance para MVP. |
| Push Notifications | expo-notifications + FCM/APNs | Expo SDK 52 | Pendiente — mobile no iniciado. |
| Deploy API | Render.com | Latest | Auto-deploy desde `main`. Variables de entorno seguras. |
| Deploy Web B2C | Vercel | Latest | `https://bresca-app-api.vercel.app` — en producción. |
| Deploy Web CRO | Vercel | Latest | Preview deployments por PR. Pendiente de deploy. |

---

## 2. Estructura del monorepo

```
bresca/
├── apps/
│   ├── web-patient/     # React + Vite — App paciente B2C (en producción)
│   ├── web-cro/         # React + Vite — Panel investigador B2B (pendiente deploy)
│   └── api/             # Node.js + Express — Backend REST
│                        # (apps/mobile — React Native, pendiente de iniciar)
├── packages/
│   └── shared/          # Supabase singleton, tipos TS compartidos, utils
├── supabase/
│   ├── migrations/      # SQL versionado — NUNCA editar migración existente
│   ├── seed/            # Datos de desarrollo local
│   └── functions/
│       └── process-study-draft/   # Edge Function OCR async
├── scripts/
│   └── post-deploy-qa.mjs         # QA runner post-deploy — ver [[06_Runbook_Bresca|Runbook]]
├── .claude/
│   ├── CLAUDE.md        # Contexto base para Claude Code (< 200 líneas)
│   ├── skills/          # Skills on-demand (supabase-rls, ocr-pipeline, etc.)
│   ├── settings.json    # Configuración de Claude Code
│   └── hooks/           # PreToolUse hooks (filtro de test output)
├── turbo.json           # Turborepo — builds paralelos
└── package.json         # Workspaces root (pnpm)
```

---

## 3. Schema de base de datos

### 3.1 Tablas principales

```sql
-- Nota: Bresca usa auth.users de Supabase directamente — no hay tabla users propia.
-- user_id en profiles referencia auth.users(id).

-- Perfiles (propios + familiares, múltiples por usuario)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),       -- NULLABLE para perfiles familiares
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- dueño del perfil familiar
  display_name  TEXT NOT NULL,
  birth_year    INT,
  conditions    TEXT[] DEFAULT '{}',
  relationship  TEXT,                                  -- 'Hijo/a', 'Padre/Madre', etc.
  created_at    TIMESTAMPTZ DEFAULT now(),
  -- Invariante: perfil propio tiene user_id, perfil familiar tiene owner_user_id
  CONSTRAINT profiles_has_owner CHECK (user_id IS NOT NULL OR owner_user_id IS NOT NULL)
);
-- Perfil propio:    user_id = auth.uid(), owner_user_id = NULL
-- Perfil familiar:  user_id = NULL,       owner_user_id = auth.uid()

-- Estudios médicos
CREATE TABLE studies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES profiles(id) NOT NULL,
  study_type       TEXT NOT NULL,       -- 'laboratorio', 'imagen', 'receta'
  category         TEXT,                -- 'hemograma', 'glucemia', 'rx_torax'
  study_date       DATE,
  lab_name         TEXT,
  extracted_fields JSONB,               -- campos extraídos por OCR (filtrados por allowlist)
  confirmed        BOOLEAN NOT NULL DEFAULT false,
  storage_path     TEXT,               -- primera página (legacy, compatibilidad)
  storage_paths    TEXT[],             -- todas las páginas (multi-foto)
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Borradores de estudios — pipeline OCR async (TTL 24h via pg_cron)
CREATE TABLE study_drafts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES profiles(id) NOT NULL,
  category         TEXT NOT NULL,
  status           TEXT CHECK(status IN ('pending','processing','done','error')) DEFAULT 'pending',
  storage_paths    TEXT[],
  extracted_fields JSONB,
  study_type       TEXT,
  lab_name         TEXT,
  study_date       DATE,
  error_log        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
-- Al INSERT: trigger pg_net dispara Edge Function process-study-draft
-- TTL: pg_cron limpia drafts con created_at > 24h

-- Auditoría de consentimiento (append-only — NUNCA UPDATE/DELETE)
CREATE TABLE consent_audit (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  layer      TEXT NOT NULL CHECK (layer IN ('research', 'therapeutic_area', 'specific_study')),
  granted    BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger en DB bloquea UPDATE y DELETE — enforce append-only a nivel base de datos
-- RLS: solo INSERT y SELECT para el owner del perfil

-- Tokens QR para compartir con médico
CREATE TABLE qr_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id) NOT NULL,
  token       TEXT UNIQUE NOT NULL,     -- HMAC firmado
  study_ids   UUID[] NOT NULL,          -- estudios incluidos
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

-- Usuarios CRO (separado del auth B2C)
CREATE TABLE cro_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  org_name     TEXT NOT NULL,
  role         TEXT CHECK(role IN ('admin', 'researcher')) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Estudios clínicos (del lado CRO)
CREATE TABLE cro_studies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cro_id     UUID REFERENCES cro_users(id) NOT NULL,
  title      TEXT NOT NULL,
  criteria   JSONB NOT NULL,            -- criterios de inclusión/exclusión normalizados
  status     TEXT CHECK(status IN ('draft', 'active', 'closed')) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Vistas de anonimización para CRO

```sql
-- Vista que el CRO Panel puede leer — sin PII
CREATE VIEW cro_anonymous_patients AS
SELECT
  md5(p.id::text) AS patient_hash,    -- ID anónimo no reversible
  p.birth_year,
  CASE
    WHEN p.birth_year IS NULL THEN NULL
    ELSE (date_part('year', now()) - p.birth_year)::int / 5 * 5  -- rango 5 años
  END AS age_range,
  array_agg(DISTINCT s.category) AS study_categories,
  array_agg(DISTINCT s.study_type) AS study_types,
  max(s.study_date) AS last_study_date,
  bool_or(
    ca.layer = 'research' AND ca.granted AND ca.revoked_at IS NULL
  ) AS has_research_consent
FROM profiles p
JOIN studies s ON s.profile_id = p.id AND s.confirmed = true
LEFT JOIN consent_audit ca ON ca.profile_id = p.id
GROUP BY p.id, p.birth_year
HAVING count(DISTINCT p.id) >= 5;  -- k-anonimato mínimo
```

---

## 4. RLS Policies críticas

> ⚠️ **Regla de oro:** ninguna tabla de usuarios o perfiles puede ser leída por un rol diferente al dueño del perfil, al rol `cro_reader` (solo vistas anónimas), o al `service_role` del backend.

```sql
-- profiles: dueño propio (user_id) O dueño del familiar (owner_user_id)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (
    auth.uid() = user_id OR auth.uid() = owner_user_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = owner_user_id
  );

-- studies: perfiles propios Y familiares del usuario autenticado
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studies_owner" ON studies
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- study_drafts: mismo patrón que studies
ALTER TABLE study_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_drafts_owner" ON study_drafts
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- qr_tokens: el owner gestiona; rol anon lee tokens válidos (vista del médico)
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_owner" ON qr_tokens
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );
CREATE POLICY "qr_public_read" ON qr_tokens
  FOR SELECT TO anon USING (
    expires_at > now() AND revoked_at IS NULL
  );

-- consent_audit: solo insertar y leer los propios (incluyendo perfiles familiares)
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;
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
```

---

## 5. Flujo de datos: upload de estudio

| Paso | Componente | Detalle |
|---|---|---|
| 1 | `apps/web-patient` Upload | Usuario selecciona archivo(s) — jpg, png o pdf. Soporte multi-página. |
| 2 | `apps/api POST /extract` | Recibe `multipart/form-data`. Valida tipo y tamaño. Sube a Supabase Storage. |
| 3 | Supabase Storage | Guarda en `studies/{profile_id}/{uuid}.{ext}`. RLS: solo el perfil dueño puede leer. |
| 4 | `apps/api` | Hace INSERT en `study_drafts` con `status='pending'` y `storage_paths`. **Responde 202 inmediatamente.** |
| 5 | Frontend | Navega al Vault sin esperar el OCR. Muestra card del draft en estado "procesando". |
| 6 | Trigger `pg_net` | Al INSERT en `study_drafts`, dispara Edge Function `process-study-draft` de forma async. |
| 7 | Edge Function `process-study-draft` | Descarga archivo desde Storage. OCR: DeepSeek Vision (imágenes) o pdf-parse (PDFs). Escribe `extracted_fields` + `status='done'` (o `status='error'`). |
| 8 | Supabase Realtime | Frontend recibe el cambio de estado del draft y actualiza la card en el Vault. |
| 9 | Usuario confirma | Revisa los datos extraídos en la pantalla de detalle. Si acepta: `POST /extract/confirm` → `study_draft` → `studies` con `confirmed=true`. |
| — | Error handling | Si `status='error'`: card roja en Vault con CTA "Ingresar datos manualmente" o "Descartar". |

---

## 6. Variables de entorno

| Variable | Usado en | Descripción | Rotación |
|---|---|---|---|
| `SUPABASE_URL` | API + Web | URL del proyecto Supabase | — |
| `SUPABASE_ANON_KEY` | Web (client) | Key pública. Solo operaciones con RLS activo. | — |
| `SUPABASE_SERVICE_ROLE_KEY` | API (server only) | **NUNCA exponer al cliente.** Para operaciones admin. | Anual |
| `DEEPSEEK_API_KEY` | API + Edge Function | API key para DeepSeek (OCR Vision + Copilot). | Mensual |
| `QR_TOKEN_SECRET` | API | HMAC secret para firma de tokens QR. | Semestral |

---

## 7. Patrones de código mandatorios

### 7.1 Result pattern para error handling

```typescript
// types/result.ts — en packages/shared
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// Uso — nunca throw en lógica de negocio
async function uploadStudy(file: File): Promise<Result<Study>> {
  const uploaded = await storageUpload(file);
  if (!uploaded.ok) return uploaded;

  const extracted = await ocrExtract(uploaded.data.path);
  if (!extracted.ok) return extracted;

  return { ok: true, data: extracted.data };
}
```

### 7.2 Supabase singleton

```typescript
// packages/shared/src/supabase.ts — único punto de importación
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// REGLA: ningún otro archivo importa @supabase/supabase-js directamente
```

### 7.3 Convención de migraciones

```
supabase/migrations/
  20260401120000_initial_schema.sql
  20260408090000_add_study_embeddings.sql
  20260415140000_add_cro_tables.sql

# Regla: NUNCA editar una migración existente.
# Cambios van en una nueva migración.
# Las RLS policies se crean en la misma migración que la tabla.
```

---

## 8. Setup del entorno local

```bash
# 1. Clonar y dependencias
git clone https://github.com/bresca/bresca-app && cd bresca-app
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            DEEPSEEK_API_KEY, QR_TOKEN_SECRET

# 3. Levantar Supabase local
supabase start
supabase db reset  # aplica migraciones + seed

# 4. Levantar API + web-patient + web-cro
pnpm dev  # turbo: todos en paralelo

# 5. Mobile (pendiente — no iniciado aún)
# cd apps/mobile && npx expo start
```

---

## Ver también

- [[00_INDEX|Índice maestro del vault]]
- [[01_RFC-001_Bresca|RFC-001 — Bresca Patient Data Network]]
- [[02_ADR_Bresca|ADR — Architecture Decision Records]]
- [[03_PRD_Bresca|PRD — Product Requirements Document]]
- [[05_SystemDesign_Bresca|System Design Document]]
- [[06_Runbook_Bresca|Runbook — Operational Guide]]
- [[14_Security_Audit_2026-05-07|Auditoría de Seguridad]]
- [[20_ObservabilityPlan_Bresca|Plan de Observabilidad]]
- [[21_DICOM_Viewer_Research|DICOM Viewer — research técnico]]
- [[22_EmailToVault_Spec|Email-to-Vault — spec del módulo]]

---

*Relacionado: ADR-001 a ADR-005 | PRD v1.0 | System Design v1.0*
