# Test Plan — Bresca MVP
## Plan de pruebas simuladas con Haiku

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | `ACTIVE` |
| **Autor** | Claude Sonnet 4.6 |
| **Fecha** | Mayo 2026 |
| **Relacionado con** | PRD v1.0, Tech Spec v1.0 |

---

## 1. Objetivo

Este documento define el plan de pruebas para el MVP de Bresca. Las pruebas son ejecutadas por un agente Haiku que simula personas reales navegando los flows de la aplicación, analiza el código existente, e identifica gaps, bugs y mejoras. El output de cada prueba es un **issue estructurado para el backlog**.

> Limitación conocida: Haiku analiza código, specs y el prototipo — no ejecuta la UI en un browser real. Las pruebas son de tipo "spec review + simulated user journey".

---

## 2. Personas de prueba

### P-01 — María, 52, paciente crónica (diabetes T2)
- **Perfil:** Paciente de LATAM, maneja múltiples médicos, acumula años de estudios de laboratorio. Usa smartphone Android de gama media. Poca tolerancia a la fricción. Lee bien pero no es tech-savvy.
- **Objetivo en Bresca:** subir sus estudios, tener todo en un lugar, poder mostrarle algo a su médico en la consulta.
- **Sensibilidades:** desconfía de dar datos personales. Le preocupa "quién ve mis cosas".

### P-02 — Sebastián, 38, cuidador (padre de hijo con condición crónica)
- **Perfil:** Maneja la salud de su hijo de 10 años. Necesita alternar entre el perfil propio y el del hijo. Es más tech-savvy pero siempre apurado.
- **Objetivo en Bresca:** gestionar dos perfiles desde una sola app, compartir estudios del hijo con el pediatra.
- **Sensibilidades:** le preocupa que su hijo "acepte cosas" sin que él lo sepa (consentimiento por menor).

### P-03 — Dr. Ramírez, 45, médico generalista
- **Perfil:** Recibe un QR de una paciente durante una consulta. No tiene cuenta en Bresca. Solo necesita ver el historial en 30 segundos.
- **Objetivo en Bresca:** abrir el QR, ver los estudios relevantes, seguir con la consulta.
- **Sensibilidades:** máxima eficiencia, cero onboarding, pantalla legible en consultorio.

### P-04 — Laura, 34, investigadora clínica (CRO)
- **Perfil:** Trabaja en un CRO farmacéutico buscando pacientes para un ensayo de diabetes. Maneja criterios de inclusión/exclusión. Necesita números y anonimato garantizado.
- **Objetivo en Bresca:** ver métricas del dashboard, filtrar cohorte por criterios, entender el funnel.
- **Sensibilidades:** necesita confiar en que el sistema es realmente anónimo. Le preocupa la validez estadística de la muestra.

---

## 3. Scope de features a testear

| ID | Feature | App | Prioridad |
|---|---|---|---|
| F-001 | Onboarding trust-first | web-patient / mobile | Alta |
| F-002 | Health Vault — upload + OCR + confirmación | web-patient / api | Alta |
| F-003 | AI Copilot | web-patient / api | Alta |
| F-004 | QR Sharing (generación + vista médico) | web-patient / api | Alta |
| F-005 | Gestión familiar (multi-perfil) | web-patient / mobile | Media |
| F-006 | Sistema de consentimiento 3 capas | web-patient / api | Alta |
| F-007 | Dashboard CRO — métricas | web-cro / api | Alta |
| F-008 | Matching anónimo con fit score | web-cro / api | Alta |
| F-009 | Flujo de invitación a estudio | web-cro / api | Media |
| SEC-01 | Seguridad: anonimización CRO | api / supabase | Crítica |
| SEC-02 | Seguridad: RLS policies | supabase | Crítica |
| SEC-03 | Seguridad: service_role_key exposure | api | Crítica |

---

## 4. Escenarios de prueba

### 4.1 Onboarding (F-001) — Persona: María

**TS-001** — Happy path onboarding mínimo
- María abre la app por primera vez. Ve la propuesta de valor antes de cualquier formulario. Crea cuenta solo con nombre. Consentimiento de investigación aparece al final, no al inicio.
- **Archivos a revisar:** `apps/web-patient/src/pages/onboarding/`, `apps/mobile/`
- **Criterio de éxito:** < 3 campos antes de ver el vault. Consentimiento de investigación nunca bloquea.

**TS-002** — Onboarding con email opcional
- María decide no poner email. Puede completar el onboarding igualmente.
- **Criterio de éxito:** email no es required en ningún form de onboarding.

**TS-003** — Consentimiento al final — no bloqueante
- Verifcar que el consentimiento de investigación (capa 2) puede ser rechazado sin impedir el acceso al vault.
- **Archivos a revisar:** flujo de consent_audit, políticas RLS para usuarios sin consentimiento de investigación.

---

### 4.2 Health Vault — OCR (F-002) — Persona: María

**TS-004** — Upload y encolado OCR
- María sube una foto de un análisis de sangre. El sistema responde con estado "procesando".
- **Archivos a revisar:** `apps/api/src/extract/router.ts`, `apps/web-patient/src/lib/api.ts` → `enqueueExtract()`, `waitForDraft()`
- **Criterio de éxito:** POST /extract devuelve 202 + job_id en < 100ms.

**TS-005** — Confirmación manual obligatoria
- El OCR completa, María ve los campos extraídos. Puede editarlos antes de confirmar. El sistema NO guarda sin confirmed=true.
- **Archivos a revisar:** `apps/api/src/extract/router.ts`, tabla `study_drafts`, flujo de confirmación.
- **Criterio de éxito:** no existe ningún código path que inserte en `studies` con `confirmed=false`.

**TS-006** — OCR falla o timeout
- El job de OCR tarda más de 60s o falla. ¿Qué ve María? ¿Hay manejo de error visible?
- **Archivos a revisar:** `waitForDraft()` timeout handling, edge function OCR, estado 'failed' en study_drafts.
- **Criterio de éxito:** mensaje de error claro, opción de reintentar o ingresar datos manualmente.

**TS-007** — Tipo de archivo inválido
- María intenta subir un .docx. El sistema lo rechaza con mensaje comprensible.
- **Archivos a revisar:** `ExtractSchema` en extract/router.ts — solo acepta jpeg/png/webp/pdf.
- **Criterio de éxito:** error 400 con mensaje en español, sin pantalla blanca.

---

### 4.3 AI Copilot (F-003) — Persona: María

**TS-008** — Primera consulta al Copilot
- María escribe: "¿Cuándo fue mi último análisis de glucemia?". El Copilot responde usando sus estudios.
- **Archivos a revisar:** `apps/api/src/copilot/router.ts`, `system-prompt.ts`, `rate-limit.ts`.
- **Criterio de éxito:** disclaimer visible, respuesta coherente, no revela PII.

**TS-009** — Rate limit alcanzado
- María envía más de 20 consultas en una hora. ¿Qué ve cuando supera el límite?
- **Archivos a revisar:** `apps/api/src/copilot/rate-limit.ts`.
- **Criterio de éxito:** mensaje claro con tiempo de espera, no error 500.

**TS-010** — PII en el contexto del Copilot
- Verificar que el contexto enviado a Claude API no incluye nombre, DNI, email ni identificadores directos del paciente.
- **Archivos a revisar:** `copilot/router.ts` — construcción del contexto enviado a Anthropic.
- **Criterio de éxito:** ningún campo de PII en el system prompt ni en los mensajes enviados a la API.

---

### 4.4 QR Sharing (F-004) — Personas: María + Dr. Ramírez

**TS-011** — Generación de QR con selección de estudios
- María selecciona 2 de sus 5 estudios y genera un QR con TTL de 24h.
- **Archivos a revisar:** `apps/web-patient/src/lib/api.ts` → `generateQR()`, `apps/api/src/qr/router.ts`.
- **Criterio de éxito:** solo los estudios seleccionados aparecen en la vista del médico.

**TS-012** — Vista del médico sin login
- El Dr. Ramírez abre la URL del QR en su browser. No tiene cuenta en Bresca. Ve los estudios inmediatamente.
- **Archivos a revisar:** `apps/api/src/qr/router.ts` — GET /qr/:token sin autenticación, RLS qr_public_read.
- **Criterio de éxito:** vista carga en < 3s sin registro. Solo muestra estudios seleccionados.

**TS-013** — QR expirado
- El Dr. Ramírez abre un QR de 24h horas después. Debe ver un mensaje de expiración, no datos del paciente.
- **Criterio de éxito:** respuesta 403/404 con mensaje de expiración. Sin datos expuestos.

**TS-014** — Revocación de QR
- María revoca el QR antes de que expire. El link deja de funcionar inmediatamente.
- **Archivos a revisar:** `revokeQR()` → DELETE /qr/:token, RLS qr_public_read (revoked_at IS NULL).
- **Criterio de éxito:** revocación efectiva en < 5s, link retorna error.

---

### 4.5 Gestión familiar (F-005) — Persona: Sebastián

**TS-015** — Crear perfil para hijo
- Sebastián crea un segundo perfil "Tomás" bajo su cuenta. Puede alternar entre su perfil y el del hijo.
- **Archivos a revisar:** tabla `profiles` (user_id → múltiples perfiles), switch de perfil en la app.
- **Criterio de éxito:** cada perfil tiene su vault aislado. Un perfil no puede ver el vault del otro.

**TS-016** — Consentimiento independiente por perfil
- El consentimiento de investigación de Sebastián no afecta al perfil de Tomás. Cada perfil tiene su propio consent_audit.
- **Archivos a revisar:** `consent_audit` — RLS policy, profile_id como scope de consentimiento.
- **Criterio de éxito:** consent_audit entries son por profile_id, no por user_id.

---

### 4.6 Sistema de consentimiento (F-006) — Persona: María

**TS-017** — Revocación de consentimiento de investigación
- María revoca su consentimiento de investigación (capa 2). El panel CRO debe dejar de incluirla en cohortes en tiempo real.
- **Archivos a revisar:** `consent_audit` (append-only — insert revoked_at, nunca UPDATE), vista `cro_anonymous_patients` (has_research_consent).
- **Criterio de éxito:** revocación visible en CRO en < 5s. consent_audit no tiene UPDATEs.

**TS-018** — Historial de consentimientos visible para el usuario
- María puede ver todos sus cambios de consentimiento con timestamps.
- **Criterio de éxito:** centro de consentimiento muestra historial completo, append-only.

---

### 4.7 Dashboard CRO (F-007) — Persona: Laura

**TS-019** — Dashboard con datos reales
- Laura abre el panel CRO. Ve métricas: total de pacientes anónimos, estudios, consentimientos activos, distribución terapéutica.
- **Archivos a revisar:** `apps/web-cro/src/lib/api.ts` → `getStats()`, `getDistribution()`, `apps/api/src/cro/router.ts`.
- **Criterio de éxito:** todos los KPIs cargan sin error. Ningún PII visible.

**TS-020** — Dashboard con zero data
- Laura abre el panel antes de que haya pacientes. ¿Qué ve? ¿Empty states informativos?
- **Criterio de éxito:** no rompe con 0 registros. Mensaje de "sin datos" claro.

---

### 4.8 Matching anónimo (F-008) — Persona: Laura

**TS-021** — Matching por criterios básicos
- Laura filtra por edad 40-60, categoría "diabetes". Ve perfiles PAC-XXXX con fit score.
- **Archivos a revisar:** `matchPatients()` en api.ts, `apps/api/src/cro/router.ts` → POST /cro/match.
- **Criterio de éxito:** response contiene patient_hash (no ID real), sin nombre ni email.

**TS-022** — Cohorte menor a 5 — k-anonimato
- Laura busca una categoría muy específica. Solo hay 3 pacientes. El sistema NO muestra resultados.
- **Archivos a revisar:** vista `cro_anonymous_patients` — HAVING count >= 5.
- **Criterio de éxito:** response vacío o error explicativo cuando cohort < 5.

**TS-023** — Verificar que patient_hash no es reversible
- El md5(profile_id) devuelto por el CRO no puede ser usado para obtener datos del paciente via otra ruta.
- **Archivos a revisar:** todos los endpoints de `apps/api/src/cro/` — ¿aceptan patient_hash como lookup?
- **Criterio de éxito:** no existe endpoint que reciba un patient_hash y devuelva datos del paciente.

---

### 4.9 Seguridad — checks críticos

**TS-024** — service_role_key solo en el backend
- Verificar que SUPABASE_SERVICE_ROLE_KEY no aparece en ningún archivo del frontend (web-cro, web-patient, mobile).
- **Archivos a revisar:** todos los archivos de `apps/web-cro/`, `apps/web-patient/`, `apps/mobile/`.
- **Criterio de éxito:** cero referencias a service_role en cliente.

**TS-025** — extracted_fields no se devuelve raw al cliente
- El endpoint /extract no retorna el JSON crudo de Document AI — solo campos filtrados de la allowlist.
- **Archivos a revisar:** `apps/api/src/extract/router.ts` y edge function OCR.
- **Criterio de éxito:** response del cliente no incluye campos no aprobados del OCR.

**TS-026** — RLS activo en todas las tablas
- Todas las tablas con datos de usuarios tienen RLS habilitado.
- **Archivos a revisar:** `supabase/migrations/` — buscar `ENABLE ROW LEVEL SECURITY` por tabla.
- **Criterio de éxito:** profiles, studies, study_drafts, consent_audit, qr_tokens tienen RLS activo.

---

## 5. Formato de issue para el backlog

Cada issue generado por Haiku debe seguir este formato exacto:

```markdown
## [ISSUE] TS-XXX — Título descriptivo del problema

**Persona afectada:** P-01 María / P-02 Sebastián / P-03 Dr. Ramírez / P-04 Laura
**Feature:** F-00X — Nombre del feature
**Severidad:** 🔴 Crítica | 🟠 Alta | 🟡 Media | 🔵 Baja
**Tipo:** 🐛 Bug | ✨ Mejora UX | 🔐 Seguridad | ❓ Comportamiento indefinido | ✅ OK (sin issue)

### Descripción
[Qué encontró la persona, qué esperaba, qué pasó en cambio. En primera persona del personaje.]

### Evidencia en el código
[Archivo:línea y fragmento relevante del código que sustenta el hallazgo]

### Criterio de aceptación
- [ ] Criterio 1
- [ ] Criterio 2

### Labels sugeridos
`bug` / `ux` / `security` / `enhancement` / `backlog`
```

---

## 6. Instrucciones de ejecución para Haiku

> Esta sección es el prompt de ejecución para el agente Haiku.

**Rol:** Sos un QA engineer y analista de UX. Tu trabajo es ejecutar cada escenario de prueba de este plan, revisando el código real de Bresca para encontrar gaps, bugs, y mejoras.

**Lo que debés hacer por cada escenario (TS-XXX):**
1. Leer los archivos indicados en el campo "Archivos a revisar"
2. Adoptar el punto de vista de la persona definida
3. Razonar si el código actual satisface el criterio de éxito
4. Si encontrás un problema: generar un issue con el formato de la sección 5
5. Si el escenario pasa: documentarlo brevemente con `✅ OK`

**Qué buscar:**
- Código que falla silenciosamente (sin error visible al usuario)
- Validaciones ausentes en endpoints
- Flujos incompletos (el botón existe pero el handler no)
- Mensajes de error en inglés en una app que debe estar en español
- PII que se cuela donde no debería
- Edge cases no manejados (vacío, null, timeout, red lenta)
- Inconsistencias entre lo que dice el PRD y lo que hace el código

**Output final:** Un documento `docs/10_TestResults_Bresca.md` con:
- Una fila por escenario en la tabla resumen
- Issues detallados con el formato de la sección 5
- Conteo total: X críticos, Y altos, Z medios, W bajos
- Top 3 issues prioritarios recomendados para el próximo sprint

**Scope del monorepo a revisar:**
```
apps/api/src/          → backend Express
apps/web-cro/src/      → panel CRO React
apps/web-patient/src/  → app web paciente React
apps/mobile/           → app mobile React Native
supabase/migrations/   → SQL + RLS
```

---

*Relacionado: PRD v1.0 | Tech Spec v1.0 | ADR-001 a ADR-005*
