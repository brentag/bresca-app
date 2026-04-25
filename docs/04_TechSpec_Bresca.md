# Tech Spec — Technical Specification
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | `APPROVED` |
| **Autor** | Engineering Lead |
| **Fecha** | Abril 2026 |
| **Relacionado con** | ADR-001 a ADR-005, PRD v1.0 |

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Mobile B2C | React Native + Expo | SDK 52 | Cross-platform. Diseño nativo en Claude Projects = input directo para Claude Code. |
| Web B2B (CRO) | React + Vite + TypeScript | React 18 / Vite 5 | SPA liviana. Panel CRO no requiere SSR. |
| Backend API | Node.js + Express | Node 20 LTS | Familiar para el equipo. Sin overhead de framework. |
| Base de datos | PostgreSQL 15 vía Supabase | 15.x | RLS nativo, vistas SQL, `pg_cron` para QR expiry. |
| Auth + Storage | Supabase Auth + Storage | Latest | Anon sign-in, RLS policies, buckets por perfil. |
| OCR | Google Document AI | v1 API | Mayor precisión en documentos médicos LATAM. Fallback: AWS Textract. |
| AI Copilot | Claude API (Anthropic) | claude-sonnet-4-5 | Context window adecuado. Balance costo/performance. |
| Push Notifications | expo-notifications + FCM/APNs | Expo SDK 52 | Canal cross-platform sin servidor propio. |
| Deploy API | Railway | Latest | Monorepo-friendly. Variables de entorno seguras. Autoscaling. |
| Deploy Web CRO | Vercel | Latest | Preview deployments por PR. Edge network. |

---

## 2. Estructura del monorepo

```
bresca/
├── apps/
│   ├── mobile/          # React Native (Expo) — App paciente B2C
│   ├── web-cro/         # React + Vite — Panel investigador B2B
│   └── api/             # Node.js + Express — Backend REST
├── packages/
│   └── shared/          # Supabase singleton, tipos TS compartidos, utils
├── supabase/
│   ├── migrations/      # SQL versionado — NUNCA editar migración existente
│   ├── seed/            # Datos de desarrollo local
│   └── functions/       # Edge Functions (embeddings, notificaciones async)
├── .claude/
│   ├── CLAUDE.md        # Contexto base para Claude Code (< 200 líneas)
│   ├── skills/          # Skills on-demand (supabase-rls, ocr-pipeline, etc.)
│   ├── settings.json    # Configuración de Claude Code
│   └── hooks/           # PreToolUse hooks (filtro de test output)
├── turbo.json           # Turborepo — builds paralelos
└── package.json         # Workspaces root
```

---

## 3. Schema de base de datos

### 3.1 Tablas principales

```sql
-- Usuarios (cuenta, no perfil)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  anon_id      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE,             -- nullable, trust-first
  display_name TEXT NOT NULL
);

-- Perfiles (pueden ser múltiples por usuario)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) NOT NULL,
  name         TEXT NOT NULL,
  birth_year   INT,
  is_self      BOOLEAN NOT NULL DEFAULT true,
  relationship TEXT                     -- 'hijo', 'padre', 'cónyuge', etc.
);

-- Estudios médicos
CREATE TABLE studies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES profiles(id) NOT NULL,
  file_path        TEXT NOT NULL,       -- Supabase Storage path
  study_type       TEXT NOT NULL,       -- 'laboratorio', 'imagen', 'receta'
  study_date       DATE,
  category         TEXT,                -- 'hemograma', 'glucemia', 'rx_torax'
  extracted_fields JSONB,               -- campos extraídos por OCR
  confirmed        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings para retrieval del Copilot
CREATE TABLE study_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID REFERENCES studies(id) UNIQUE NOT NULL,
  embedding       VECTOR(1536),         -- pgvector
  normalized_text TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoría de consentimiento (append-only — NUNCA UPDATE/DELETE)
CREATE TABLE consent_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id) NOT NULL,
  layer       TEXT CHECK(layer IN ('product', 'research', 'therapeutic_area')) NOT NULL,
  area_code   TEXT,                     -- nullable, solo para capa 3
  granted     BOOLEAN NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  tos_version TEXT NOT NULL,
  ip_address  INET,
  user_agent  TEXT
);

-- Tokens QR para compartir con médico
CREATE TABLE qr_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id) NOT NULL,
  token       TEXT UNIQUE NOT NULL,     -- HMAC firmado
  study_ids   UUID[] NOT NULL,          -- estudios incluidos
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

-- Usuarios CRO (separado del auth B2C)
CREATE TABLE cro_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  org_name     TEXT NOT NULL,
  role         TEXT CHECK(role IN ('admin', 'researcher')) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estudios clínicos (del lado CRO)
CREATE TABLE cro_studies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cro_id     UUID REFERENCES cro_users(id) NOT NULL,
  title      TEXT NOT NULL,
  criteria   JSONB NOT NULL,            -- criterios de inclusión/exclusión normalizados
  status     TEXT CHECK(status IN ('draft', 'active', 'closed')) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- profiles: solo el dueño
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (
    user_id = auth.uid()
  );

-- studies: solo el perfil dueño (via user)
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studies_owner" ON studies
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- qr_tokens: el rol anon puede leer tokens válidos (para vista del médico)
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_public_read" ON qr_tokens
  FOR SELECT USING (
    expires_at > now() AND revoked_at IS NULL
  );

-- consent_audit: solo insertar y leer los propios
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_owner_insert" ON consent_audit
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "consent_owner_select" ON consent_audit
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );
```

---

## 5. Flujo de datos: upload de estudio

| Paso | Componente | Detalle |
|---|---|---|
| 1 | `apps/mobile` | Usuario toma foto o selecciona archivo. `expo-image-picker`. |
| 2 | `apps/api POST /upload` | Recibe `multipart/form-data`. Valida tipo (pdf, jpg, png) y tamaño (max 10MB). |
| 3 | Supabase Storage | Sube a `studies/{profile_id}/{uuid}.{ext}`. RLS: solo el perfil dueño puede leer. |
| 4 | Google Document AI | API call con el archivo. Extrae: fecha, tipo, categoría, valores. |
| 5 | `apps/api` | Estructura los campos en `study_draft` (tabla temporal, TTL 24h). |
| 6 | `apps/mobile` | Pantalla de confirmación con datos extraídos editables por el usuario. |
| 7 | `apps/api POST /confirm` | Usuario confirma. Mueve `study_draft` → `studies` con `confirmed=true`. |
| 8 | Supabase Edge Function | Genera embedding del estudio normalizado de forma async. Guarda en `study_embeddings`. |

---

## 6. Variables de entorno

| Variable | Usado en | Descripción | Rotación |
|---|---|---|---|
| `SUPABASE_URL` | API + Mobile | URL del proyecto Supabase | — |
| `SUPABASE_ANON_KEY` | Mobile (client) | Key pública. Solo operaciones con RLS activo. | — |
| `SUPABASE_SERVICE_ROLE_KEY` | API (server only) | **NUNCA exponer al cliente.** Para operaciones admin. | Anual |
| `GOOGLE_DOCAI_KEY` | API | API key para Document AI. | Mensual |
| `ANTHROPIC_API_KEY` | API | Para llamadas al Copilot. Rate limiting por usuario. | Mensual |
| `QR_TOKEN_SECRET` | API | HMAC secret para firma de tokens QR. | Semestral |
| `OCR_PROVIDER` | API | `docai` (default) o `textract` (fallback). | — |

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
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_DOCAI_KEY, ANTHROPIC_API_KEY

# 3. Levantar Supabase local
supabase start
supabase db reset  # aplica migraciones + seed

# 4. Levantar API + web-cro
npm run dev  # turbo: api + web-cro en paralelo

# 5. Mobile (en otra terminal)
cd apps/mobile && npx expo start
```

---

*Relacionado: ADR-001 a ADR-005 | PRD v1.0 | System Design v1.0*
