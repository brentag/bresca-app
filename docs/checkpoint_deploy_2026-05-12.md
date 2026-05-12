# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-05-12

---

## Log de publicaciones

| Hash | Hora | Descripción |
|---|---|---|
| `69af32db` | sesión anterior | feat(copilot): Copilot Consent Gate — disclaimer legal por sesión |
| `fdd5f574` | 22:57 | fix(upload): corregir loop de redirect a onboarding por perfiles duplicados |
| `71590805` | 23:02 | docs: actualizar checkpoint, test results y CLAUDE.md — sesión 2026-05-12 |

---

## Resumen de la sesión

### Bugs resueltos

**1. Upload flow → loop de onboarding** (`fdd5f574`)
- **Causa raíz:** `extract/router.ts` usaba `.single()` que falla con múltiples rows. El bug de redirect de commit `7bc1300` mandaba usuarios a `/onboarding/name`, que hacía INSERT sin verificar existencia → se acumulaban perfiles duplicados con el mismo `user_id`. En la siguiente subida, `.single()` encontraba 2+ rows → error → redirect → nuevo duplicado → loop infinito.
- **Fix código:** `.single()` → `.limit(1).order('created_at',asc).maybeSingle()` en API; redirect a onboarding en Upload reemplazado por mensaje de error; `setLoading(true)` en `useProfile` antes del fetch.
- **Fix DB:** eliminados 2 perfiles Gabriel duplicados (creados el 7/5 y 11/5) + 1 perfil Monica bugueada (11/5 con `owner_user_id = NULL` incorrecto).

**2. Copilot Consent Gate — consent persistente → por sesión** (`69af32db` → ajuste en sesión)
- Cambiado `localStorage` → `sessionStorage`: el disclaimer aparece cada sesión nueva.
- Bresca mantiene visible su posición de no-aval al uso de IA en decisiones médicas.

### QA post-deploy
**14/14 tests pasaron** — reporte: `docs/qa-reports/2026-05-12_01-59_fdd5f574.md`

| ID | Test | Resultado |
|---|---|---|
| T01a | web-patient HTTP 200 | ✅ |
| T01b | web-cro HTTP 200 | ✅ |
| T01c | API /health 200 | ✅ |
| T02 | Auth: crear usuario test | ✅ |
| T03 | Auth: anon key login | ✅ |
| T04 | Perfil: crear con RLS | ✅ |
| T05–T07 | Vault: upload + listado | ✅ |
| T08–T09 | Familia: perfil + vault | ✅ |
| T10 | RLS: aislamiento entre usuarios | ✅ |
| T11 | QR: token válido | ✅ |
| T12 | consent_audit append-only | ✅ |

### Estado de la DB (brentag@gmail.com)
- Perfiles activos: **Gabriel** (`1a5ca3b7`, principal) + Monica, Ce, Pepo (familia)
- Estudios: 0 (limpiados para retesting)
- Perfiles duplicados eliminados: 3

### Pendientes para próxima sesión
- Agregar `UNIQUE(user_id) WHERE user_id IS NOT NULL` en tabla `profiles` (migración preventiva)
- Testear upload PDF end-to-end en producción con el fix deployado
- Decidir si avanzar con mejoras funcionales o infra (Render Starter, dominio)

---

## Sesión 2 — tarde 2026-05-12

### Fix UX y proceso de borrado QA

**1. `Email.tsx` — botón "Acceder" no debe morir con email nuevo**
- Antes: el flujo de login mandaba `shouldCreateUser: false` y Supabase devolvía error si el email no existía → pantalla "No pudimos enviar el código".
- Fix: con magic link la distinción login/register es artificial. Ambos botones ahora envían el link con `shouldCreateUser: true`. La etiqueta del botón solo cambia el copy del Verify screen.

**2. Bug crítico en `handle_account_deletion()` — DELETE /account roto en producción**
- Síntoma: `auth.admin.deleteUser` devolvía 500 "Database error deleting user" para cualquier cuenta con `consent_audit`. Esto rompía la opción "Eliminar mi cuenta" en Settings desde 2026-05-07.
- Causa: el trigger BEFORE DELETE en profiles ejecutaba un UPDATE de anonimización sobre `consent_audit` que podía fallar (FK, RLS interna, etc.) abortando todo el cascade.
- Fix: migración `20260512080000_fix_handle_account_deletion.sql` — envuelve la anonimización en `BEGIN/EXCEPTION`. Si la anonimización falla, se registra como `RAISE WARNING` y el DELETE de profile procede igual. Cumple con derecho de borrado (Ley 25.326).

**3. `scripts/reset-user.mjs` — script de QA para borrado consistente**
- CLI que borra completamente un usuario (storage + auth.users + cascade DB) para retests sin contaminación.
- Flags: `--dry-run`, `--yes`, `--force-admin` (salvaguarda contra borrar @bresca.io por accidente).
- Lee SR key de `apps/api/.env`.

### Bug raíz OCR encontrado

**4. Edge Function `process-study-draft` rechazaba todos los inserts con 401**
- Síntoma observado: subir un PDF → draft se queda en `status: pending` indefinidamente, nunca pasa a `processing`. La UI muestra "La IA está procesando en segundo plano" sin avanzar.
- Causa: la función estaba deployada **sin** `--no-verify-jwt`. El trigger pg_net (`trigger_ocr_job`) manda `Authorization: Bearer <edge_secret>` (un hex aleatorio, no JWT), Supabase rechazaba con `UNAUTHORIZED_NO_AUTH_HEADER`. El pg_cron solo limpia drafts viejos, no reintenta — los drafts morían a las 24h en silencio.
- Fix: redeploy con `supabase functions deploy process-study-draft --no-verify-jwt --project-ref mkacuagcvwxoduhdthwg --use-api`.
- Drafts pendientes de brentag@gmail.com (~17:38 y ~17:48) disparados manualmente, ambos llegaron a `completed` en ~6 segundos cada uno.

### Feature nueva: WhatsApp share con archivo

**5. `/qr/:token` — devolvía solo extracted_fields, no el archivo**
- Comportamiento anterior: el destinatario veía una tabla de valores numéricos (Hemoglobina, Glucosa, etc.) sin acceso al documento original.
- Rediseño:
  - Backend (`apps/api/src/qr/router.ts`): agrega `owner_name` (join con profiles) y `files[]` con signed URLs por estudio. TTL del signed URL = TTL del token, alineados por construcción. Cuando vence el token también vencen las URLs.
  - Frontend (`apps/web-patient/src/pages/app/QRView.tsx`): header personalizado **"{owner} te compartió por Bresca"**, viewer embebido del archivo (iframe para PDF, `<img>` para imágenes), datos del estudio (tipo, fecha, lab) y la tabla de valores debajo como contexto. Soporte multi-página.

### Backlog actualizado (CLAUDE.md)

Cuatro nuevos items de UX/feature:
- Auto-detección de `category` en OCR + revisión condicional según `confidence_score`
- Marco de color en estudios según `confidence_score` (verde/amarillo/rojo)
- Fecha prominente + línea de tiempo en Vault
- Navegación ant/post en `StudyDetail.tsx` para comparar estudios del mismo tipo

---

## Estado de servicios

| Servicio | URL | Estado |
|---|---|---|
| Web B2C | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| Web B2B (CRO) | `https://bresca-cro.vercel.app` | ✅ LIVE |
| API Backend | `https://bresca-api.onrender.com` | ✅ LIVE (free tier) |
| DB + Auth | Supabase `mkacuagcvwxoduhdthwg` | ✅ LIVE |
| Edge Function `process-study-draft` | `mkacuagcvwxoduhdthwg.functions.supabase.co` | ✅ LIVE (re-deploy `--no-verify-jwt`) |
