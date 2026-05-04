# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-05-03  
**Estado general:** Pipeline OCR async activado en producción. Edge Function + migración aplicadas. Render.com pendiente de redeploy para tomar el nuevo router.

---

## Estado de servicios

| Servicio | Estado | Notas |
|---|---|---|
| Supabase (DB + Auth + Storage) | ✅ LIVE | Pipeline async activo |
| GitHub repo | ✅ LIVE | branch `main` |
| Vercel web-patient | ✅ LIVE | Sin cambios hoy |
| Render API | ⚠️ LIVE (código viejo) | Necesita redeploy para tomar router async |
| Edge Function process-study-draft | ✅ LIVE | Versión 2 activa |
| Vercel web-cro | ❌ Pendiente | — |

---

## Cambios publicados hoy (2026-05-03)

### Commits

| Hash | Descripción |
|---|---|
| `8f9663b` | refactor(ocr): pipeline async via Supabase Edge Functions |
| `fa1368f` | fix(web-cro): emailRedirectTo apunta al portal CRO para magic link |
| `f9bc372` | chore(web-cro): agregar vercel.json para deploy del portal CRO |

### Migración SQL aplicada a producción

**`extract_async`** — aplicada a BrescaAPP vía MCP Supabase

- Tabla `study_drafts`: columna `status` con máquina de estados (`pending → processing → done → error`)
- Trigger `pg_net`: dispara webhook HTTP al insertar un draft (llama a Edge Function)
- Secret del webhook hardcodeado en el cuerpo del trigger (evita `ALTER DATABASE` que requiere superuser)
- `pg_cron`: limpieza automática de drafts con TTL de 24h

### Edge Function desplegada

**`process-study-draft`** — Versión 2 activa

- Recibe webhook de `pg_net` con `study_draft_id`
- Descarga PDF/imagen desde Supabase Storage
- OCR con DeepSeek Vision (fallback para imágenes) + pdf-parse (PDFs)
- Escribe resultado en `study_drafts.extracted_fields` + actualiza `status = 'done'`
- Pipeline verificado end-to-end: trigger → Edge Function → write-back en ~2s

### Secretos configurados en Supabase Dashboard

- `DEEPSEEK_API_KEY` — para DeepSeek Vision en Edge Function
- `WEBHOOK_SECRET` — autenticación del webhook pg_net → Edge Function

---

## Problema conocido — Render.com no usa el pipeline async todavía

El router `apps/api/src/extract/router.ts` ya implementa el patrón async (enqueue → return `draft_id`), pero Render.com tiene el build anterior compilado. Hasta que se redeploy, la API de producción sigue usando Tesseract.js sincrónico.

**Fix:** push a `main` + redeploy manual en Render (o trigger automático si el repo está conectado).

---

## Decisiones técnicas del día

| Decisión | Motivo |
|---|---|
| Hardcodear URL + secret en trigger Postgres | `ALTER DATABASE` requiere superuser — no disponible en Supabase managed |
| No modificar `raw_text NOT NULL` en migración vieja | Nunca editar migración existente — la nueva migración ya dropea la constraint |
| DeepSeek Vision como OCR en Edge Function | Sin costo de Google Document AI, API compatible con OpenAI SDK |

---

## Pendientes priorizados

1. **Redeploy Render.com** — para que el router async entre en producción
2. **Deploy web-cro** — portal B2B pendiente
3. **Módulo Familiar** — placeholder; decidir si implementar para demo
4. **Non-blocking upload UX** — navegar a Vault inmediatamente post-enqueue, card pending con Realtime update

---

## Log de publicaciones (auto-generado)

| `096e2aa` | 18:37 | feat(upload): soporte multi-página + hook de changelog + mejoras futuras OCR documentadas |
| `28d1c3d` | 19:59 | feat(landing): B2C y CRO landings standalone + documentadas en plan MVP |
<!-- Los commits posteriores se agregan aquí automáticamente -->
