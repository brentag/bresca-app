# AGENTS.md — Bresca
## Guía de comportamiento para agentes autónomos (Claude Code)

> Este archivo define **qué puede hacer un agente sin confirmación**, qué requiere aprobación explícita, y cuáles son las zonas de exclusión absolutas.  
> Claude Code lo lee antes de ejecutar cualquier tarea que involucre modificaciones al sistema.

---

## Filosofía

Claude Code en Bresca opera bajo el principio **"seguro por defecto, rápido en el centro"**:

- Las zonas de datos médicos y seguridad requieren confirmación humana.
- Las zonas de UI y lógica de negocio estándar pueden ejecutarse con autonomía.
- Ante cualquier duda: preguntar, no asumir.

---

## Zonas de autonomía (el agente puede actuar sin confirmación)

### ✅ Puede hacer solo

```
CÓDIGO UI
- Crear y modificar componentes React Native en apps/mobile/
- Crear y modificar componentes React en apps/web-cro/
- Crear y modificar estilos y layouts
- Implementar pantallas a partir del diseño en Claude Projects
- Refactorizar código que no toca lógica de seguridad

CÓDIGO BACKEND (sin cambios de schema)
- Crear rutas Express nuevas en apps/api/src/routes/
- Modificar lógica de negocio existente (no RLS, no migraciones)
- Agregar validaciones de input en el backend
- Escribir o modificar servicios (apps/api/src/services/)
- Agregar logs y métricas

TESTS
- Escribir tests unitarios y de integración
- Modificar tests existentes
- Correr el test suite y reportar resultados

DOCUMENTACIÓN
- Actualizar archivos en docs/
- Actualizar skills en .claude/skills/
- Actualizar CLAUDE.md (manteniendo el límite de 200 líneas)

DEPENDENCIAS (no-críticas)
- Actualizar dependencias de UI (componentes, styling)
- Agregar dependencias de desarrollo (linting, testing)
```

---

## Zonas de confirmación (el agente debe preguntar antes de actuar)

### ⚠️ Requiere confirmación explícita del developer

```
MIGRACIONES DE DB
- CUALQUIER archivo nuevo en supabase/migrations/
  → Motivo: las migraciones son irreversibles en producción
  → Excepción: puede redactar el SQL y mostrarlo para revisión,
    pero no ejecutar supabase db push sin aprobación

RLS POLICIES
- Cualquier modificación a las políticas de Row Level Security
  → Motivo: un error expone datos médicos
  → El agente puede proponer los cambios en SQL, el dev los aprueba

SYSTEM PROMPT DEL COPILOT
- Cualquier cambio a COPILOT_SYSTEM_PROMPT_V* en apps/api/src/copilot/system-prompt.ts
  → Motivo: afecta las restricciones de seguridad clínica
  → Requiere además correr CT-001 a CT-007 antes del merge

VARIABLES DE ENTORNO
- Nunca agregar ni modificar .env, .env.local, .env.production
  → El agente puede indicar qué variable necesita, el dev la configura

DEPENDENCIAS CRÍTICAS
- Cambios en @supabase/supabase-js, @anthropic-ai/sdk, expo version
  → Pueden tener breaking changes en la lógica de auth y RLS

DEPLOY
- Nunca ejecutar comandos que afecten staging o producción:
  supabase db push --linked, railway deploy, eas submit
  → El CI/CD se encarga del deploy. El agente no tiene acceso a producción.
```

---

## Zonas de exclusión absoluta (el agente nunca hace esto)

### 🚫 Prohibido bajo cualquier circunstancia

```
SEGURIDAD DE DATOS
- Nunca incluir SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
  GOOGLE_DOCAI_KEY, o QR_TOKEN_SECRET en código fuente, logs, o commits
- Nunca agregar un endpoint que retorne profile_id real a un cliente CRO
- Nunca modificar las vistas anónimas de CRO para incluir campos PII
- Nunca eliminar el filtro de allowlist en la sanitización de OCR
- Nunca reducir MINIMUM_COHORT_SIZE por debajo de 5

CONSENTIMIENTO
- Nunca modificar la tabla consent_audit para permitir UPDATE o DELETE
- Nunca eliminar el trigger prevent_consent_mutation
- Nunca bypassear la verificación de consent antes de enviar una invitación CRO

COPILOT
- Nunca eliminar las reglas absolutas del system prompt
  (diagnóstico, medicamentos, datos de otros usuarios, emergencias)
- Nunca subir max_tokens del Copilot por encima de 2048 sin aprobación
- Nunca enviar PII del usuario en el contexto a Claude API

INTEGRIDAD DEL CÓDIGO
- Nunca commitear directamente a main — siempre via PR
- Nunca modificar migraciones SQL ya aplicadas
  (crear migración nueva en su lugar)
- Nunca hacer git push --force en ninguna rama compartida
```

---

## Comportamiento esperado ante ambigüedad

Cuando una tarea no está claramente en ninguna zona:

1. **El agente identifica la zona de riesgo** y la menciona explícitamente.
2. **Propone el cambio** en forma de diff o pseudocódigo para revisión.
3. **Espera confirmación** antes de ejecutar.
4. **No asume** que "probablemente está bien" — en datos médicos, el costo de un error es alto.

**Ejemplo correcto:**
```
Developer: "Agregar el campo email al perfil del usuario"

Agente: "Para agregar email a profiles, necesito una migración SQL.
Te muestro el SQL propuesto antes de ejecutarlo:

ALTER TABLE profiles ADD COLUMN email TEXT;
CREATE INDEX idx_profiles_email ON profiles(email);

¿Lo aplico? También noto que la RLS policy actual no filtra por email —
¿querés que agregue una restricción para que solo el dueño pueda verlo?"
```

---

## Contexto de herramientas disponibles

```
LECTURA (siempre disponible)
- Leer cualquier archivo del repositorio
- Buscar en el codebase
- Leer docs/ y .claude/skills/

ESCRITURA (según zona de autonomía/confirmación)
- Crear y editar archivos en apps/, packages/, docs/, .claude/
- Correr tests locales
- Correr supabase db reset --local (solo entorno local)

BLOQUEADAS
- Acceso a variables de entorno de producción
- Deploy a staging o producción
- Comandos que afecten el Supabase project remoto sin confirmación
```

---

## Referencia rápida de archivos sensibles

| Archivo | Nivel | Por qué |
|---|---|---|
| `supabase/migrations/*.sql` | ⚠️ Confirmación | Irreversible en producción |
| `apps/api/src/copilot/system-prompt.ts` | ⚠️ Confirmación | Restricciones de seguridad clínica |
| `packages/shared/src/constants.ts` (MINIMUM_COHORT_SIZE) | 🚫 Prohibido cambiar < 5 | k-anonimato |
| `.env*` | 🚫 Prohibido modificar | Credenciales |
| Cualquier vista SQL en `*_anonymous_*` | ⚠️ Confirmación | Anonimización del CRO |
| `consent_audit` (schema + trigger) | ⚠️ Confirmación + 🚫 no eliminar trigger | Auditoría legal |

---

*Este archivo es leído por Claude Code al inicio de cada sesión de trabajo en el proyecto.*  
*Actualizar cuando cambie el alcance de autonomía del agente o se identifiquen nuevas zonas de riesgo.*
