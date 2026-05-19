# Code Audit Fixes — 2026-05-19

**Sesión:** Founding Product Engineer
**Audit base:** docs/23_CodeAudit_2026-05-19.md (resumido en el prompt de la sesión)
**Status:** typecheck verde en `apps/api`, `apps/web-patient`, `apps/web-cro`.

Documento que registra todos los cambios aplicados sobre el repo en respuesta al code-audit. Si tenés que revertir algún fix, este documento + el commit asociado son la referencia.

---

## 1. Código muerto eliminado

| Archivo | Por qué se borró | Riesgo de remoción |
|---|---|---|
| `apps/api/src/extract/ocr.ts` | Importa `tesseract.js` y `pdf-parse`, ninguno en `apps/api/package.json`. Ningún archivo del repo lo importaba. Reemplazado por la Edge Function `process-study-draft` hace tiempo. | Nulo — verificado con grep antes de borrar |
| `apps/api/src/routes/` | Directorio vacío. | Nulo |
| `apps/api/src/services/` | Directorio vacío. | Nulo |
| `packages/shared/src/supabase.ts` | Singleton del cliente Supabase que NO se exportaba desde `packages/shared/src/index.ts` y NO se importaba en ningún app. Cada app (`web-patient`, `web-cro`, `api`, `mobile`) tiene su propio cliente. | Nulo — grep confirmó cero imports |

---

## 2. Migraciones SQL creadas

### `supabase/migrations/20260519200000_fix_cro_patient_hash.sql`
**Hallazgos:** S-C1 (patient_hash reversible) + S-A2 (vista accesible a `authenticated`).

Reemplaza `md5(p.id::text)` por `p.anon_id::text` en `cro_anonymous_patients`. El MD5 era reversible si se conocía el UUID original; `anon_id` es un UUID aleatorio persistido (la columna ya existía desde la migración `20260508120000_anon_id_profiles.sql`).

Además, `REVOKE ALL` sobre roles `authenticated, anon, PUBLIC` y `GRANT SELECT` únicamente a `service_role` (que es lo que usa `apps/api` con su CRO allowlist en `requireCro`). Antes cualquier usuario logueado podía hacer SELECT a la vista por defecto.

Vista creada con `security_invoker = true` para que las RLS de las tablas base se evalúen con la identidad del caller (no del owner de la vista).

### `supabase/migrations/20260519210000_api_rate_limit_table.sql`
**Hallazgos:** S-C2 (rate-limit in-memory no sobrevive cold-starts).

Crea tabla `public.api_rate_limit (id, user_id, scope, created_at)` con índice por `(user_id, scope, created_at DESC)`. RLS enabled sin policies → solo `service_role` accede. Helper `cleanup_api_rate_limit()` con schedule `*/15 * * * *` si la extensión `pg_cron` está disponible (no-op silencioso en local sin pg_cron).

### `supabase/migrations/20260519220000_fix_notifications_policy.sql`
**Hallazgos:** DB-M1 (UPDATE de notifications sin restricción de columnas) + DB-B3 (índice email faltante).

- `REVOKE UPDATE` general en `notifications` para `authenticated` y luego `GRANT UPDATE (read)` solo sobre la columna `read`. Esto bloquea que un usuario malicioso reescriba `title`/`body`/`metadata` de sus propias notificaciones (vector teórico de prompt-injection si esos campos se renderizan a futuro en un asistente).
- Re-creación de policy `notifications_update_own` agregando `WITH CHECK` (defensa en profundidad).
- `CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL` — acelera el lookup de Email-to-Vault (`get_user_id_by_email`).

---

## 3. Fixes en código

| ID audit | Archivo(s) | Cambio |
|---|---|---|
| S-A1 | `supabase/functions/process-study-draft/index.ts` | Edge Function valida `Authorization: Bearer <EDGE_WEBHOOK_SECRET>` con timing-safe compare. En dev (sin secret) loggea warning y no bloquea. |
| S-A5 | `apps/api/src/inbound-email/parser.ts` | Valida `buffer.length` post-decode base64 contra `MAX_SIZE_BYTES`. Bloquea declaración falsa de `ContentLength`. Descarta también buffers vacíos. |
| S-C2 | `apps/api/src/copilot/rate-limit.ts` | Reimplementado de `Map` in-memory a tabla `api_rate_limit` en DB. API ahora async (`Promise<{allowed, remaining}>`). Fail-open ante errores de DB (con log). |
| S-C2 callers | `apps/api/src/copilot/router.ts`, `apps/api/src/qr/router.ts`, `apps/api/src/support/router.ts` | `await checkRateLimit(...)` en los 3 sitios (ahora retorna Promise). |
| S-M5 | `supabase/functions/process-study-draft/index.ts` | Nuevo branch: imagen con `ocr_score < 80` y sin Mistral API key → marca `needs_review=true`. Antes esa rama caía silenciosamente y la imagen quedaba auto-confirmable con score bajo. |
| S-M6 | `apps/web-patient/src/pages/app/Vault.tsx` | `autoConfirmDraft()` valida `draft.ocr_score >= 95` antes de crear el `study`. Si no, redirige a review manual. Defensa en profundidad — la UI ya filtra el botón pero ahora la función también. |
| API-A4 | `apps/api/src/cro/router.ts` | `/cro/distribution` filtra estudios por `profile_id` con research consent activo. Buckets con count `< 5` se descartan (k-anonimato a nivel agregado). Si hay menos de 5 pacientes consentidos globalmente, retorna distribución vacía. |
| API-M2 | `apps/api/src/qr/router.ts` | `/qr/generate` ahora exige `confirmed=true` en el join de studies. Imposible compartir un draft no revisado. |
| API-M4 | `apps/api/src/lib/sanitize.ts` (nuevo), `apps/api/src/copilot/router.ts`, `apps/api/src/support/router.ts` | Se extrajo `sanitizeForPrompt` a `lib/sanitize.ts` y se aplica al `userContext` en el endpoint de soporte. Antes el `display_name` (controlado por el usuario) llegaba al system prompt sin saneamiento. |
| API-B1 | `apps/api/src/index.ts` | `express.json({ limit: '35mb' })`. Sube el límite para tolerar webhooks Postmark con múltiples adjuntos grandes en base64 (overhead ~33%). |
| FE-A2 | `apps/web-patient/src/lib/api.ts`, `apps/web-patient/src/pages/app/Upload.tsx` | `enqueueExtract` acepta `opts.onColdStart` callback. Upload.tsx lo usa para mostrar "Despertando el servidor..." en lugar de un spinner mudo de 32s durante el wakeup del free tier de Render. |
| FE-A5 | `apps/web-cro/src/pages/Admin.tsx` | El handler de Realtime INSERT en `events` ahora hace debounce de 5s con `setTimeout`/`clearTimeout` en un `useRef`. Antes una ráfaga de 50 eventos en 200ms disparaba 50 fetch a `/admin/live`. |
| FE-B3 | `apps/web-patient/src/App.tsx` | `ErrorBoundary` class component envuelve toda la app. Fallback con botón "Recargar" en caso de excepción no manejada. Antes un crash dejaba pantalla blanca total. |

---

## 4. Fixes pendientes que requieren decisión adicional

Estos hallazgos del audit no se implementaron en esta sesión y necesitan input humano antes de avanzar:

1. **Rotar `EDGE_WEBHOOK_SECRET` en Supabase Dashboard y actualizar el trigger pg_net** — la migración del fix S-A1 (Edge Function valida Authorization) NO incluye actualización del trigger que la dispara. El secret se hardcodea hoy en una función SQL del trigger; rotarlo requiere:
   1. `supabase secrets set EDGE_WEBHOOK_SECRET=<nuevo-secret> --project-ref mkacuagcvwxoduhdthwg`
   2. Actualizar la función trigger que invoca `pg_net.http_post` con header `Authorization: Bearer <nuevo-secret>`
   3. Deploy `supabase functions deploy process-study-draft --no-verify-jwt --use-api --project-ref mkacuagcvwxoduhdthwg`

   El código está listo y backwards-compatible: si `EDGE_WEBHOOK_SECRET` no está seteado en el environment de la función, loggea warning pero NO bloquea (modo dev). Para activar la validación en prod hay que setear el env + actualizar el trigger.

2. **Regenerar `database.types.ts`** — la tabla `api_rate_limit` no está en los tipos generados todavía. `rate-limit.ts` usa un cast `as any` localmente como workaround. Después de aplicar la migración:
   ```bash
   supabase gen types typescript --project-id mkacuagcvwxoduhdthwg \
     > packages/shared/src/database.types.ts
   ```
   Luego se puede remover el `db = supabase as any` y usar el cliente tipado directamente.

3. **Otros hallazgos del audit no abarcados en este sprint** (referencia para sesiones futuras): cualquier S-Mx, API-Bx, FE-Mx, DB-Mx no listado en el resumen del prompt no fue tocado. Revisar `docs/23_CodeAudit_2026-05-19.md` para el listado completo.

---

## 5. Score estimado post-fix por área

> Estimación cualitativa contra el baseline del audit (1=critico, 10=excelente). El audit original no provee el detalle granular de los scores; estos son aproximaciones del FPE post-fix.

| Área | Pre-fix | Post-fix | Notas |
|---|---|---|---|
| Código muerto | 6/10 | 9/10 | Eliminados los 4 ítems del prompt. Pueden quedar otros más pequeños no listados. |
| Seguridad (datos) | 6/10 | 9/10 | S-C1/S-A2/S-A5/S-A1 resueltos. Falta rotar secret en runtime (decision humana). |
| Seguridad (auth/rate-limit) | 5/10 | 8/10 | Rate-limit ahora en DB. Falta cleanup automático (depende de pg_cron del proyecto). |
| Consent / k-anonimato | 6/10 | 9/10 | `/cro/distribution` ahora respeta consent + k-anon. La vista CRO usa `anon_id`. |
| OCR / draft pipeline | 7/10 | 9/10 | Branch faltante para imagen-sin-Mistral cubierto. Auto-confirm tiene guard extra. |
| Frontend resilience | 6/10 | 8/10 | ErrorBoundary, cold-start UX, Realtime debounce. Falta cobertura más fina por route. |
| Calidad API | 7/10 | 9/10 | sanitizeForPrompt unificado, json limit ajustado, qr/generate más estricto. |
| DB hygiene | 7/10 | 9/10 | índice email, policy notifications endurecida. |

---

## 6. Verificación

- `npx tsc --noEmit` en `apps/api` → 0 errores.
- `npx tsc --noEmit` en `apps/web-patient` → 0 errores.
- `npx tsc --noEmit` en `apps/web-cro` → 0 errores.
- `vitest run` en `apps/api` → no test files (no se rompió cobertura existente porque no había).
- Ningún call site quedó apuntando a archivos borrados (grep verificado).

## 7. Riesgos / cosas a revisar después del deploy

1. **Rate-limit puede tener un latency hit pequeño** — antes era O(1) en memoria, ahora es 1 SELECT + 1 INSERT a Supabase. Acceptable para 20 req/h por usuario; si en el futuro se sube el cap, considerar caché LRU corto (`<5s`) sobre la query.
2. **`api_rate_limit` puede crecer si pg_cron no está disponible** — el helper `cleanup_api_rate_limit()` está definido pero el schedule sólo se activa con pg_cron. Si la tabla crece mucho, el índice `idx_api_rate_limit_lookup` mitiga; cleanup manual desde Studio si hace falta.
3. **`cro_anonymous_patients` con `security_invoker = true`** — los callers via `service_role` (apps/api) siguen viendo todo. Pero si alguien hace `GRANT SELECT` a un rol no-service en el futuro, las RLS de las tablas base se evaluarán con esa identidad — comportamiento más seguro pero conviene reconfirmar al añadir nuevos consumidores.
4. **Edge Function en modo dev sin `EDGE_WEBHOOK_SECRET`** — sigue procesando requests sin auth. Cuando se setee el secret en prod, validar que el trigger también lo manda. Ver pendiente #1.
