# ADR — Architecture Decision Records
## Bresca Patient Data Network

> **Cómo usar este documento:**  
> Cada ADR registra UNA decisión técnica con su contexto, opciones consideradas, decisión tomada y consecuencias.  
> Los ADRs son **inmutables** — si una decisión cambia, se crea un nuevo ADR que supersede al anterior. Nunca se edita uno existente.

**Formato de estado:** `PROPOSED` → `ACCEPTED` → `DEPRECATED` / `SUPERSEDED BY ADR-NNN`

**Contexto:** Estas decisiones derivan del problema y propuesta definidos en [[01_RFC-001_Bresca|RFC-001]]. La implementación técnica se detalla en [[04_TechSpec_Bresca|Tech Spec]] y [[05_SystemDesign_Bresca|System Design]].

---

## ADR-001 — Supabase como plataforma de auth, DB y storage

| Campo | Valor |
|---|---|
| **Estado** | `ACCEPTED` |
| **Fecha** | Abril 2026 |
| **Decisores** | Engineering Lead |
| **Supersede** | — |
| **Supersedido por** | — |

### Contexto

Se necesita una plataforma que provea auth (incluyendo anon sign-in), PostgreSQL con RLS, y object storage, con capacidad de escalar a producción sin re-arquitectura.

### Opciones consideradas

1. **Supabase** — auth + PostgreSQL + storage + RLS nativo
2. **Firebase** — auth + Firestore, no relacional, sin RLS nativo en SQL
3. **PlanetScale + Auth0 + S3** — 3 servicios separados, mayor complejidad operacional

### Decisión

**Supabase.** Auth con soporte de anon users (trust-first onboarding), PostgreSQL con RLS por fila (crítico para multi-perfil), storage con policies, y CLI que permite desarrollo local idéntico a producción.

### Consecuencias

**Positivas:**
- Desarrollo local con `supabase start`. RLS como ciudadano de primera clase.
- Anon sign-in nativo — onboarding sin email sin fricción técnica.
- Migraciones SQL versionadas en `/supabase/migrations/`.

**Negativas:**
- Vendor lock-in en auth y storage. **Mitigación:** la lógica de negocio no toca Supabase directamente — pasa por `packages/shared/src/supabase.ts` singleton.
- HIPAA no está cubierto en plan gratuito/pro. Para usuarios en USA en producción requiere plan Enterprise. En LATAM, LGPD se cubre con RLS + auditoría en DB (ver [[05_SystemDesign_Bresca|System Design - Decisiones de seguridad]]).

---

## ADR-002 — Anonimización por vistas SQL, no tokenización

| Campo | Valor |
|---|---|
| **Estado** | `ACCEPTED` |
| **Fecha** | Abril 2026 |
| **Decisores** | Engineering Lead |
| **Supersede** | — |
| **Supersedido por** | — |

### Contexto

El CRO Panel necesita acceder a datos de pacientes para calcular fit scores sin poder identificar a ningún paciente. Se requiere una arquitectura de anonimización auditable, mantenible y no reversible por el CRO.

### Opciones consideradas

1. **Tokenización diferenciada** — k-anonimato, l-diversidad
2. **Differential privacy** — ruido estadístico en queries
3. **Vistas SQL sin PII + RLS** — el rol `cro_reader` solo accede a vistas que excluyen columnas identificadoras

### Decisión

**Vistas SQL + RLS.** Las vistas exponen solo campos clínicos normalizados (`age_range`, `condition_codes`, `study_fields`) sin nombre, DNI, email ni ningún identificador. Las RLS policies del rol `cro_reader` bloquean `SELECT` directo en tablas de usuarios y perfiles.

### Consecuencias

**Positivas:**
- Auditable — las vistas son SQL legible, versionado en migraciones.
- Sin complejidad criptográfica en MVP.

**Negativas:**
- Re-identificación teórica posible si la combinación de campos clínicos es suficientemente específica en poblaciones pequeñas. **Mitigación:** `minimum_cohort_size = 5` — no mostrar resultados con < 5 pacientes.

**Consecuencia operacional:** toda nueva tabla con PII debe tener una vista anónima correspondiente antes de ser accesible desde el CRO Panel. Esto se valida en code review.

---

## ADR-003 — React Native (Expo managed workflow) para mobile B2C

| Campo | Valor |
|---|---|
| **Estado** | `ACCEPTED` |
| **Fecha** | Abril 2026 |
| **Decisores** | Engineering Lead |
| **Supersede** | — |
| **Supersedido por** | — |

### Contexto

La app B2C debe correr en iOS y Android. Equipo de 1 desarrollador. Se necesita maximizar velocidad de desarrollo sin sacrificar acceso a APIs nativas (push notifications, cámara para OCR, biometría).

### Opciones consideradas

1. **React Native + Expo managed workflow** — SDK 52
2. **Flutter** — Dart, requiere nuevo lenguaje para el equipo
3. **Swift + Kotlin nativos** — dos codebases separados

### Decisión

**React Native con Expo SDK 52, managed workflow.** Expo provee `expo-notifications` (push), `expo-camera` (OCR upload), `expo-local-authentication` (biometría opcional), y EAS Build para distribución a TestFlight y Play Internal.

### Consecuencias

**Positivas:**
- Un solo codebase TypeScript.
- El diseño en Claude Projects (React Native components) es input nativo para Claude Code — máxima velocidad de implementación.
- EAS Build maneja signing y distribución a ambas stores.

**Negativas:**
- Expo managed workflow limita algunos módulos nativos custom. **Decisión de escalado:** si en v2 se necesita integración con HealthKit / Google Fit, evaluar eject a bare workflow (proceso documentado por Expo, no destructivo). Ver [[11_Roadmap_PostMVP|Roadmap Fase 6]] para mobile planning.

---

## ADR-004 — Sistema de consentimiento con auditoría append-only en DB

| Campo | Valor |
|---|---|
| **Estado** | `ACCEPTED` |
| **Fecha** | Abril 2026 |
| **Decisores** | Engineering Lead + Asesor Legal |
| **Supersede** | — |
| **Supersedido por** | — |

### Contexto

LGPD (Brasil) y la Ley 25.326 (Argentina) requieren que el consentimiento sea informado, específico, libre y revocable. Los protocolos ICH GCP para investigación clínica requieren trazabilidad completa.

### Decisión

Tabla `consent_audit` con schema append-only:

```sql
CREATE TABLE consent_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) NOT NULL,
  layer         TEXT CHECK(layer IN ('product', 'research', 'therapeutic_area')) NOT NULL,
  area_code     TEXT,          -- nullable, solo para capa 3
  granted       BOOLEAN NOT NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,   -- nullable
  tos_version   TEXT NOT NULL,
  ip_address    INET,
  user_agent    TEXT
);
```

**Regla inmutable:** ningún `UPDATE` ni `DELETE` sobre `consent_audit`. Cada cambio genera una nueva fila. La vista de consentimiento activo es el registro más reciente por `(profile_id, layer, area_code)`.

### Consecuencias

**Positivas:**
- Historial completo y auditable de cada decisión de consentimiento.
- El CRO Panel puede verificar que un paciente tiene consentimiento vigente sin acceder al perfil.

**Operacional:** la tabla crecerá linealmente con los cambios. Particionar por `profile_id` en v2 si se proyectan > 10M filas.

---

## ADR-005 — Claude API como motor del Copilot con chunking semántico del vault

| Campo | Valor |
|---|---|
| **Estado** | `ACCEPTED` |
| **Fecha** | Abril 2026 |
| **Decisores** | Engineering Lead |
| **Supersede** | — |
| **Supersedido por** | — |

### Contexto

El Copilot necesita responder preguntas clínicas usando el historial del usuario como contexto. Un vault con 20+ estudios puede exceder el context window si se incluye todo sin selección.

### Decisión

Estrategia de chunking en dos pasos:

1. **Indexación:** cada estudio normalizado por OCR se vectoriza con `text-embedding-3-small` (1536 dims) y se guarda en `study_embeddings`.
2. **Retrieval por query:** antes de cada llamada al Copilot, se recuperan los top-K estudios más relevantes para la pregunta del usuario mediante similitud de coseno. Solo esos K estudios entran en el context window.

**Configuración:**
- Modelo: `claude-sonnet-4-5` por defecto. `claude-opus-4-6` solo para queries marcadas explícitamente como complejas.
- `max_tokens` en respuesta del Copilot: `1024`.
- System prompt incluye disclaimer no-diagnóstico y restricción de no recomendar medicamentos. (Ver [[08_SystemPromptSpec_Bresca|System Prompt Spec]] para detalles)
- Rate limit: 20 queries/usuario/hora en MVP.

### Consecuencias

**Positivas:**
- Contexto relevante por pregunta. Costo por query controlado (~$0.003–0.008 USD).
- La tabla `study_embeddings` es la base para el matching CRO en v2 con embeddings compartidos (anónimos).

**Negativas:**
- Latencia adicional por el paso de retrieval (~150–200ms). Aceptable para MVP.

---

## Registro de ADRs

| ID | Título | Estado | Fecha |
|---|---|---|---|
| ADR-001 | Supabase como plataforma de auth, DB y storage | `ACCEPTED` | Abril 2026 |
| ADR-002 | Anonimización por vistas SQL, no tokenización | `ACCEPTED` | Abril 2026 |
| ADR-003 | React Native (Expo managed workflow) para mobile B2C | `ACCEPTED` | Abril 2026 |
| ADR-004 | Sistema de consentimiento con auditoría append-only en DB | `ACCEPTED` | Abril 2026 |
| ADR-005 | Claude API como motor del Copilot con chunking semántico | `ACCEPTED` | Abril 2026 |

## Ver también

- [[00_INDEX|Índice maestro del vault]]
- [[01_RFC-001_Bresca|RFC-001 — Bresca Patient Data Network]]
- [[03_PRD_Bresca|PRD — Product Requirements Document]]
- [[04_TechSpec_Bresca|Tech Spec — Technical Specification]]
- [[05_SystemDesign_Bresca|System Design Document]]
- [[14_Security_Audit_2026-05-07|Auditoría de Seguridad]]
- [[20_ObservabilityPlan_Bresca|Plan de Observabilidad]]
- [[22_EmailToVault_Spec|Email-to-Vault — spec del módulo]]

*Para agregar un nuevo ADR: copiar el template, asignar el siguiente ID, y hacer PR contra `main`.*
