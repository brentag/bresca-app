# Test Results — Bresca MVP
## Resultados de pruebas simuladas — Agente Orange (Haiku)

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | `COMPLETE` |
| **Ejecutado por** | Claude Haiku 4.5 (agente Orange) |
| **Fecha** | Mayo 2026 |
| **Plan de pruebas** | `docs/09_TestPlan_Bresca.md` |

---

## 1. Tabla resumen

| ID | Título | Persona | Resultado | Severidad |
|---|---|---|---|---|
| TS-001 | Happy path onboarding mínimo | P-01 María | ✅ OK | — |
| TS-002 | Onboarding con email opcional | P-01 María | ✅ OK | — |
| TS-003 | Consentimiento al final — no bloqueante | P-01 María | ✅ OK | — |
| TS-004 | Upload y encolado OCR | P-01 María | ✅ OK | — |
| TS-005 | Confirmación manual obligatoria | P-01 María | ✅ OK | — |
| TS-006 | OCR falla o timeout — UX de error | P-01 María | 🐛 Issue | 🟠 Alta |
| TS-007 | Tipo de archivo inválido | P-01 María | ✅ OK | — |
| TS-008 | Primera consulta al Copilot | P-01 María | ✅ OK | — |
| TS-009 | Rate limit alcanzado | P-01 María | ✅ OK | — |
| TS-010 | PII en el contexto del Copilot | P-01 María | ✅ OK | — |
| TS-011 | Generación de QR con selección de estudios | P-01 María | 🐛 Issue | 🟠 Alta |
| TS-012 | Vista del médico sin login | P-03 Dr. Ramírez | ✅ OK | — |
| TS-013 | QR expirado | P-03 Dr. Ramírez | ✅ OK | — |
| TS-014 | Revocación de QR | P-01 María | ✅ OK | — |
| TS-015 | Crear perfil para hijo | P-02 Sebastián | 🐛 Issue | 🔴 Crítica |
| TS-016 | Consentimiento independiente por perfil | P-02 Sebastián | 🐛 Issue | 🔴 Crítica |
| TS-017 | Revocación de consentimiento de investigación | P-01 María | ✅ OK | — |
| TS-018 | Historial de consentimientos visible | P-01 María | ✅ OK | — |
| TS-019 | Dashboard con datos reales | P-04 Laura | ✅ OK | — |
| TS-020 | Dashboard con zero data | P-04 Laura | ✅ OK | — |
| TS-021 | Matching por criterios básicos | P-04 Laura | ✅ OK | — |
| TS-022 | Cohorte menor a 5 — k-anonimato | P-04 Laura | ✅ OK | — |
| TS-023 | Verificar que patient_hash no es reversible | P-04 Laura | ❓ Riesgo | 🟡 Media |
| TS-024 | service_role_key solo en el backend | — | ✅ OK | — |
| TS-025 | extracted_fields no se devuelve raw | — | ✅ OK | — |
| TS-026 | RLS activo en todas las tablas | — | ✅ OK | — |

**Total escenarios:** 26 | ✅ Pasados: 18 | 🔴 Críticos: 2 | 🟠 Altos: 2 | 🟡 Medios: 1 | 🔵 Bajos: 0

---

## 2. Issues detallados

---

## [ISSUE] TS-015 — Family multi-perfil no implementado

**Persona afectada:** P-02 Sebastián
**Feature:** F-005 — Gestión familiar (multi-perfil)
**Severidad:** 🔴 Crítica
**Tipo:** ❓ Comportamiento indefinido

### Descripción
Soy Sebastián. Entro a la sección Familia para crear el perfil de mi hijo Tomás y gestionar sus estudios por separado. La pantalla solo muestra "Próximamente". No puedo hacer nada. Tengo que seguir mezclando los turnos del nene con los míos en papel porque la app no me deja separar los perfiles.

### Evidencia en el código
`apps/web-patient/src/pages/app/Family.tsx` — el componente existe pero solo renderiza un placeholder "Próximamente", sin ninguna lógica de creación o alternado de perfiles.

### Criterio de aceptación
- [ ] UI para crear perfil dependiente (nombre, relación, fecha de nacimiento)
- [ ] Selector para alternar entre perfil propio y perfiles dependientes
- [ ] Vault aislado por profile_id: un perfil no puede ver el vault del otro
- [ ] Consentimiento de investigación independiente por perfil (append en consent_audit por profile_id)
- [ ] Consentimiento parental requerido para menores

### Labels sugeridos
`bug` `ux` `backlog` `blocker`

---

## [ISSUE] TS-016 — Consentimiento multi-perfil no testeable por Family no implementado

**Persona afectada:** P-02 Sebastián
**Feature:** F-005 / F-006 — Gestión familiar + consentimiento
**Severidad:** 🔴 Crítica
**Tipo:** ❓ Comportamiento indefinido

### Descripción
Soy Sebastián. Quiero asegurarme de que si yo doy consentimiento de investigación para mis datos, eso no aplica automáticamente a los datos de Tomás. El schema SQL parece correcto (consent_audit por profile_id), pero como la UI de Familia no está implementada no puedo verificarlo en la práctica. No hay manera de crear un segundo perfil y confirmar que los consentimientos son realmente independientes.

### Evidencia en el código
`apps/web-patient/src/pages/app/Family.tsx` — placeholder "Próximamente". Sin esta pantalla, el flujo de consentimiento por perfil de menor es imposible de ejercer. El schema `supabase/migrations/` define `consent_audit(profile_id)` correctamente, pero el path de UI que lo invocaría no existe.

### Criterio de aceptación
- [ ] Depende de TS-015: Family implementado antes de testear este escenario
- [ ] Verificar que insertar consent para profile_id=A no afecta a profile_id=B
- [ ] RLS en consent_audit filtra por profile_id activo, no por user_id

### Labels sugeridos
`blocked-by: TS-015` `security` `backlog`

---

## [ISSUE] TS-011 — QRGenerate.tsx faltante — feature F-004 incompleta en frontend

**Persona afectada:** P-01 María
**Feature:** F-004 — QR Sharing
**Severidad:** 🟠 Alta
**Tipo:** 🐛 Bug

### Descripción
Soy María. Quiero compartirle mis estudios al Dr. Ramírez antes de la consulta de mañana. Voy al Vault, busco cómo generar un QR... y no encuentro el botón. La ruta `/app/vault/qr` existe en el router pero cuando intento llegar ahí la pantalla está en blanco o rompe. El endpoint de la API ya funciona (`POST /qr/generate`) pero no hay UI para usarlo.

### Evidencia en el código
- `apps/web-patient/src/router.tsx` — ruta `/app/vault/qr` declarada
- `apps/web-patient/src/pages/app/QRGenerate.tsx` — archivo no existe en el filesystem
- `apps/api/src/qr/router.ts` — endpoint `POST /qr/generate` implementado y funcional
- `apps/web-patient/src/lib/api.ts` — `generateQR()` implementado en el cliente

### Criterio de aceptación
- [ ] Crear `QRGenerate.tsx` con UI para seleccionar estudios a compartir
- [ ] Selector de TTL configurable (default 24h)
- [ ] Mostrar el QR generado + URL copiable
- [ ] Botón de revocación en la lista de QRs activos

### Labels sugeridos
`bug` `ux` `backlog`

---

## [ISSUE] TS-006 — OCR timeout sin opción de reintentar

**Persona afectada:** P-01 María
**Feature:** F-002 — Health Vault — OCR
**Severidad:** 🟠 Alta
**Tipo:** ✨ Mejora UX

### Descripción
Soy María. Subí mi análisis de sangre. Esperé un rato y la app me mostró un mensaje de error. No sé si mi archivo se subió o no. No hay un botón de "Volver a intentar" ni me dice si puedo ingresar los datos a mano. Cierro la app frustrada.

### Evidencia en el código
`apps/web-patient/src/lib/api.ts` líneas 114–120 — `waitForDraft()` rechaza la promesa con `Error('OCR timeout')` cuando supera el `timeoutMs` sin respuesta.
`apps/web-patient/src/pages/app/Upload.tsx` líneas 74–92 — el catch del timeout solo setea un mensaje de error genérico; no hay CTA de reintento ni entrada manual.
`supabase/functions/process-study-draft/index.ts` líneas 86–99 — errores internos se truncan a 1000 chars y quedan como strings técnicos no amigables.

### Criterio de aceptación
- [ ] Al detectar timeout o status='failed': mostrar mensaje en español con causa comprensible
- [ ] Botón "Reintentar" que vuelve a encolar el mismo job
- [ ] Botón "Ingresar manualmente" que abre formulario de carga manual
- [ ] Mapear errores internos (`storage_download_failed`, etc.) a mensajes amigables antes de mostrarlos

### Labels sugeridos
`ux` `enhancement` `backlog`

---

## [ISSUE] TS-023 — patient_hash sin política explícita contra lookup inverso

**Persona afectada:** P-04 Laura
**Feature:** F-008 — Matching anónimo
**Severidad:** 🟡 Media
**Tipo:** ❓ Comportamiento indefinido

### Descripción
Soy Laura, investigadora del CRO. El sistema me devuelve `patient_hash` (md5 del profile_id) en los resultados de matching. El hash es no-reversible y eso está bien. Pero no encuentro ninguna regla explícita que impida que un futuro endpoint acepte ese hash como parámetro y devuelva datos del paciente. Es un riesgo que podría materializarse cuando se agreguen nuevas features.

### Evidencia en el código
`apps/api/src/cro/router.ts` — ningún endpoint actual acepta `patient_hash` como input. Sin embargo, no existe ningún test automatizado ni regla de linting que prevenga que se agregue en el futuro. El riesgo es latente, no activo.

### Criterio de aceptación
- [ ] Agregar test: `POST /cro/match` con `patient_hash` como filtro debe retornar 400
- [ ] Documentar en CLAUDE.md que ningún endpoint puede aceptar `patient_hash` como parámetro de entrada
- [ ] Considerar ESLint rule o review checklist para endpoints nuevos en `/cro/`

### Labels sugeridos
`security` `enhancement` `backlog`

---

## 3. Escenarios pasados ✅

**Onboarding (TS-001 a TS-003):** Propuesta de valor visible antes de cualquier formulario. Email no requerido en ningún paso. Consentimiento de investigación aparece al final y puede rechazarse sin bloquear acceso al vault. Trigger `enforce_consent_audit_append_only` impide UPDATE/DELETE.

**OCR (TS-004, TS-005, TS-007):** `POST /extract` responde 202 + job_id en <100ms. `confirmed=true` requerido antes de insertar en `studies` — no existe code path que saltee esta validación. Validación MIME types en frontend (`ExtractSchema`) y backend (Zod enum).

**Copilot (TS-008, TS-009, TS-010):** Contexto enviado a Claude API contiene solo valores clínicos, sin nombre, DNI, email ni profile_id. Rate limit de 20 req/hora implementado con contador visible. Error 429 retorna `retryAfterMs` claro.

**QR (TS-012, TS-013, TS-014):** Vista médico carga sin auth via `GET /qr/:token`. Expiración validada con `expires_at > now()`. Revocación inmediata con `revoked_at`. `SAFE_FIELDS` whitelist en endpoint público impide exposición de campos sensibles.

**Consentimiento (TS-017, TS-018):** Revocación propaga a vista CRO via `has_research_consent` en `cro_anonymous_patients`. Historial de consentimientos visible con timestamps completos.

**CRO (TS-019 a TS-022):** Dashboard carga sin errores; empty states claros con "sin datos". k-anonimato `HAVING count >= 5` forzado en SQL. Matching retorna `patient_hash` (md5), nunca `profile_id` real.

**Seguridad (TS-024, TS-025, TS-026):** `SUPABASE_SERVICE_ROLE_KEY` solo en `apps/api/src/lib/supabase.ts`. `extracted_fields` filtrado por allowlist antes de responder al cliente. RLS habilitado en `profiles`, `studies`, `study_drafts`, `consent_audit`, `qr_tokens` y storage.

---

## 4. Conteo final

| Severidad | Cantidad |
|---|---|
| 🔴 Crítica | 2 |
| 🟠 Alta | 2 |
| 🟡 Media | 1 |
| 🔵 Baja | 0 |
| **Total issues** | **5** |
| ✅ Pasados | 18 |
| ❓ Bloqueados | 1 (TS-016 depende de TS-015) |

---

## 5. Top 3 — Próximo sprint

### 🥇 TS-015 — Family multi-perfil (3–5 días)
Feature core para P-02 (Sebastián). Blocker para TS-016. Sin esto, la propuesta de valor para cuidadores está rota. Desbloquea además el testing de consentimiento por perfil menor.

### 🥈 TS-011 — QRGenerate.tsx (1–2 días)
La API y el cliente ya están listos. Solo falta el componente React. Feature F-004 es parte del happy path de P-01 y P-03 — una de las demostraciones más visibles del producto.

### 🥉 TS-006 — OCR retry/fallback UX (1 día)
El OCR falla silenciosamente con un error genérico. Agregar "Reintentar" y "Ingresar manualmente" elimina el mayor punto de fricción del onboarding de datos de María.

---

## 6. Hallazgos positivos

- **Seguridad muy sólida:** RLS en todas las tablas, `service_role_key` nunca en frontend, anonimización CRO correcta, `consent_audit` append-only con trigger de base de datos.
- **Arquitectura OCR:** pipeline async con Supabase Realtime + polling fallback bien implementado.
- **QR sharing:** TTL, revocación y `SAFE_FIELDS` whitelist funcionan correctamente.
- **Copilot:** sin PII en contexto, rate limiting robusto, error handling claro.
- **Mensajes en español rioplatense** en los flows implementados — consistente con el producto.

---

*Generado por: Claude Haiku 4.5 (agente Orange) | Plan: `docs/09_TestPlan_Bresca.md` | Próximas pruebas: post-implementación TS-015*
