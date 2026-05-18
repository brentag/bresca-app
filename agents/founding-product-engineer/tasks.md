# Founding Product Engineer — Tareas y Claves de Éxito

## Misión principal

Reducir el bus factor del equipo técnico de Bresca de 1 a 2, cerrando los hallazgos abiertos de seguridad y ejecutando el roadmap post-MVP sin que el founder/CTO sea cuello de botella.

## Backlog de tareas iniciales

### 🔴 Urgente (semana 1-2)

- **S-07: migrar `edge_secret` de `current_setting()` a Supabase Vault.** Tocar `supabase/functions/process-study-draft/index.ts` + la función SQL que dispara el trigger (`pg_net`). Ref. `docs/14_Security_Audit_2026-05-07.md` hallazgo S-07. Requiere Supabase Pro activo; coordinar con founder antes de ejecutar.
- **S-08: reemplazar MD5 por `anon_id` permanente en `handle_account_deletion`.** Validar que la migración `supabase/migrations/20260508120000_anon_id_profiles.sql` esté aplicada en prod y que `handle_account_deletion` use ese campo en lugar del hash MD5 de `profile_id`. Ref. auditoría S-08.
- **S-03: validación de ownership en Edge Function `process-study-draft`.** Hoy depende solo de no leakear `WEBHOOK_SECRET`. Agregar verificación de que `study_draft.user_id` coincide con el contexto del request (UUID + token). Ref. auditoría S-03.
- **S-10/S-11: función `validate_consent_integrity()` periódica.** Crear migración con función SQL `SECURITY DEFINER` que recalcule el hash de integridad de `consent_audit` y emita evento `events.kind='consent_integrity_alert'` si encuentra registros tampered. Cron diario vía `pg_cron`. Ref. auditoría S-10/S-11.
- **Setear Sentry productivo en `apps/api` y `apps/web-patient`.** Hoy "free tier mencionado en docs", confirmar instalación, DSN en env vars, source maps en build de Vite, alertas a Slack/email del founder en errores 500. Ref. `docs/17_PreLaunch_Checklist.md` Bloque 5.
- **Documentar el deploy en `docs/06_Runbook_Bresca.md` sec. 6.** Pasos exactos de rollback en Render y Vercel — hoy está listado sin ejecutarlo. Validar haciendo rollback de prueba en staging si existe, si no en una preview branch.

### 🟡 Próximas (semana 3-8)

- **S-06: revisar `SAFE_FIELDS` con médico advisor.** Coordinar con el médico para definir los 24 campos definitivos + agregar los que falten (Diagnóstico, Medicamentos actuales, Observaciones clínicas si el advisor lo aprueba). Implementar en `apps/api` con tests unitarios sobre cada campo de la allowlist. Ref. auditoría S-06.
- **Admin funnel: vista `avg duration_ms por node` en `Admin.tsx`.** Datos ya están en la tabla `events` (migración `20260513160000_events_session_tracking.sql`). Crear función SQL `get_funnel(period TEXT) SECURITY DEFINER` reusando patrón de `get_kpis`, agregar componente Recharts en `apps/web-cro/src/pages/Admin.tsx`. Ref. CLAUDE.md backlog.
- **Copilot deep link a estudios del vault.** Cuando el asistente identifica un documento del usuario, devolver chip accionable "Ir al estudio →" con ruta interna `/app/vault/:id`. Query a tabla `studies` filtrada por `profile_id` del JWT. Solo documentos del usuario autenticado, no familiares sin consent en sesión. Ref. CLAUDE.md backlog.
- **Fase 1 roadmap post-MVP: ChatGPT Health handoff.** Implementar export del vault a formato consumible por ChatGPT (markdown estructurado con `SAFE_FIELDS`), endpoint en `apps/api` y botón en `apps/web-patient/src/pages/Vault.tsx`. Ref. `docs/11_Roadmap_PostMVP.md` Fase 1.
- **Fase 2 roadmap: Email-to-Vault.** Subdominio MX dedicado, webhook receptor en `apps/api`, slug único por profile en tabla `profiles`, parser de adjuntos con re-uso de la rama OCR / DICOM del Edge Function. Coordinar con Product Designer para la pantalla "Tu casilla de estudios" en Settings. Ref. `docs/11_Roadmap_PostMVP.md` Fase 2.
- **Ampliar `scripts/post-deploy-qa.mjs` de 14 a 25 tests.** Agregar cobertura para: DICOM upload de carpeta sin extensión, multi-page upload, QR generate + revoke, copilot rate limit (intento 21 debe fallar), revocación de consent que se refleje en CRO en < 5s.
- **Migrar rate limit Copilot de memoria a Supabase.** Tabla `copilot_rate_limits` con TTL, función SQL `check_and_increment_rate_limit(user_id UUID, limit_per_hour INT)`. No usar Redis. Ref. auditoría S-02 opción 2.

### 🔵 Backlog (mes 3+)

- **Fase 4 roadmap: P2P Vault Transfer.** Nueva tabla `vault_transfers` (RLS por owner + recipient), flujo de consent en `'p2p_transfer'` capa 1, pantalla Incoming Transfers diseñada por Product Designer, endpoint accept/reject en `apps/api`. Ref. `docs/11_Roadmap_PostMVP.md` Fase 4.
- **Materializar `cro_anonymous_patients` como `MATERIALIZED VIEW`** con refresh cada 5 min vía `pg_cron`. Coordinar con Data/Backend Engineer (rol 13) cuando exista. Ref. `docs/05_SystemDesign_Bresca.md` sec. 4.
- **Particionar `consent_audit`** por hash de `profile_id` cuando supere 10M rows. Plan de migración con downtime cero. Ref. `docs/05_SystemDesign_Bresca.md` sec. 4.
- **CI/CD en GitHub Actions:** lint + tipos + RLS suite + post-deploy QA bloqueando merge a `main`. Coordinar con SRE rol 12 cuando exista.
- **Staging environment** (Vercel preview + Supabase branch DB). Hoy solo hay local + prod.
- **Reusar DICOM viewer en mobile (RN + Expo).** Decidir path WASM via `expo-modules-core` vs Cornerstone3D mobile build. Coordinar con Mobile Engineer (rol 11) cuando exista.

## Claves de éxito (KPIs / Definition of Done)

| Tarea / Entregable | Criterio de éxito | Fecha target |
|---|---|---|
| S-07 cerrado | `edge_secret` en Supabase Vault, no en `current_setting()`. Validado por re-corrida de auditoría sobre la Edge Function. | 2026-06-01 |
| S-08 cerrado | MD5 eliminado del path de borrado de cuenta. `anon_id` se reusa de la migración existente. Test unitario que valida que el delete no expone `profile_id`. | 2026-06-01 |
| S-03 cerrado | Edge Function rechaza requests donde `study_draft.user_id` no matchea el contexto. Test que envía draft de otro user y espera 403. | 2026-06-08 |
| S-10/S-11 cerrado | `validate_consent_integrity()` corre diario vía pg_cron. Evento `consent_integrity_alert` emitido en simulacro de tampering. | 2026-06-15 |
| Sentry productivo | Errores 500 de los últimos 7 días aparecen en el dashboard. Alerta llega a email del founder en simulacro. | 2026-05-31 |
| Admin funnel live | `Admin.tsx` muestra `avg duration_ms por node` para period day/week/month. Datos coinciden con consulta SQL manual sobre `events`. | 2026-06-22 |
| Copilot deep link | Chip "Ir al estudio →" aparece cuando el contexto incluye un estudio del usuario. No aparece para estudios de familiares sin consent en sesión. CSAT no degrada. | 2026-07-06 |
| Email-to-Vault MVP | Un email enviado a `<slug>@vault.bresca.io` con PDF adjunto se procesa, queda como `study_draft` pendiente de confirmación, usuario lo confirma desde la app. | 2026-07-31 |
| Post-deploy QA ampliado | 25 tests mínimo 22/25 aceptable. Corre en < 8 min total. | 2026-06-30 |
| Rate limit Copilot en DB | Query 21 del mismo usuario en 60 min devuelve 429. Sin Redis ni infra nueva. | 2026-07-15 |
| Bus factor reducido | El founder se toma 1 semana de licencia, el sistema sigue operando: incidentes triageados, deploys posibles, INC-001/002/003 ejecutables sin el founder. | 2026-08-31 |

## Artefactos que produce este agente

- **Migraciones SQL versionadas** en `supabase/migrations/` (formato `YYYYMMDDHHMMSS_descripcion.sql`)
- **Edge Functions Deno** en `supabase/functions/`
- **Código TypeScript** en `apps/web-patient/`, `apps/web-cro/`, `apps/api/`, `packages/shared/`
- **Tests** en Jest (RLS suite), Vitest (unit), y scripts en `scripts/`
- **PR descriptions** con secciones "Qué cambia", "Por qué", "Cómo probar local", "Riesgos"
- **Updates a `docs/06_Runbook_Bresca.md`** cuando agrega procesos operativos
- **Updates a `CLAUDE.md`** cuando agrega un patrón recurrente que el resto del equipo debe heredar
- **ADRs nuevos en `docs/02_ADR_Bresca.md`** cuando toma una decisión arquitectónica con tradeoff
- **Issues estructurados en GitHub** para bugs que se delegan a QA o se postergan
- **Reportes post-incidente** siguiendo el formato de `docs/06_Runbook_Bresca.md` cuando ejecuta INC-001 a INC-005

## Inputs que necesita para trabajar

- **Acceso al repo `APP/`** con permisos de push a ramas feature (no a `main` sin PR)
- **Acceso al proyecto Supabase `mkacuagcvwxoduhdthwg`** (us-east-2) — service role para tooling local, no para producción
- **Acceso a Vercel** (proyectos `bresca-app-api` y `bresca-cro`) — para preview deploys, no producción sin confirmación
- **Acceso a Render** (`bresca-api`) — logs y deploys
- **Variables de entorno** (`SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `QR_TOKEN_SECRET`, `WEBHOOK_SECRET`) compartidas vía Bitwarden / 1Password familiar
- **Docs base leídos:** `CLAUDE.md`, `AGENTS.md`, `docs/02_ADR_Bresca.md`, `docs/04_TechSpec_Bresca.md`, `docs/05_SystemDesign_Bresca.md`, `docs/06_Runbook_Bresca.md`, `docs/14_Security_Audit_2026-05-07.md`
- **Specs de Figma** del Product Designer cuando hay UI nueva
- **Validación clínica del médico advisor** cuando hay cambios en `SAFE_FIELDS`, `COPILOT_SYSTEM_PROMPT_V*`, o presets DICOM

## Dependencias críticas

- **CTO / Founder:** confirmación previa para migraciones SQL nuevas, RLS policies sobre PII, system prompt del Copilot. AGENTS.md lo define como zona de confirmación.
- **Product Designer (agente):** specs de Figma + tokens del Design System + UX writing antes de implementar UI nueva. Si la spec no existe, parás y la pedís.
- **Compliance & Privacy Drafter (agente):** revisión previa cuando el cambio toca `consent_audit`, vistas anónimas CRO, `MINIMUM_COHORT_SIZE`, o flujo de habeas data.
- **Médico advisor (humano, futuro):** validación clínica obligatoria para `SAFE_FIELDS`, system prompt Copilot, presets de windowing DICOM. Sin advisor, esos cambios quedan bloqueados.
- **Supabase Pro activo** para Supabase Vault (S-07), pgBouncer, PITR, branch DBs. Si está en free tier, varias tareas urgentes se bloquean.
- **Render Starter $7/mo** activo para eliminar cold start (`docs/17_PreLaunch_Checklist.md` Bloque 5).
- **DeepSeek API key vigente** para OCR Vision + Copilot. Rotación mensual coordinada con founder.
