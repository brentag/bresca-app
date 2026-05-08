# Checklist Pre-Lanzamiento — Bresca MVP

**Versión:** 1.0 — 2026-05-08  
**Estado:** En progreso  
**Target:** Go-live público (dominio propio + usuarios reales)

Marcar cada ítem como `[x]` cuando esté completo. Mínimo para lanzar: todos los **BLOQUEANTES** deben estar en `[x]`.

---

## BLOQUE 1 — Infraestructura y deploy

### Supabase
- [ ] **[BLOQUEANTE]** Plan Pro activo ($25/mo) — necesario para pg_cron y PITR
- [ ] **[BLOQUEANTE]** PITR (Point-in-Time Recovery) habilitado en Dashboard → Backups
- [ ] **[BLOQUEANTE]** Todas las migraciones aplicadas (`supabase migration list --linked` — ninguna pendiente)
- [ ] **[BLOQUEANTE]** RLS activo en todas las tablas con PII (verificar con QA script)
- [ ] **[BLOQUEANTE]** Edge Function `process-study-draft` deployada y activa
- [ ] Secretos de Edge Functions configurados: `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`
- [ ] Supabase Auth: Site URL apuntando al dominio final (no al `.vercel.app`)
- [ ] Supabase Auth: Redirect URLs del dominio final agregadas
- [ ] Bucket `studies` en Storage con policies RLS correctas

### API (Render.com)
- [ ] **[BLOQUEANTE]** Plan Starter ($7/mo) activo — elimina cold starts de 30s
- [ ] **[BLOQUEANTE]** Variables de entorno completas (NODE_ENV, SUPABASE_URL, SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, CORS_ORIGIN, QR_TOKEN_SECRET)
- [ ] **[BLOQUEANTE]** `CORS_ORIGIN` apunta al dominio final (no al `.vercel.app` si se usa dominio propio)
- [ ] Health check respondiendo: `GET /health` → `{"status":"ok"}`
- [ ] Logs activos y revisados — sin errores críticos en los últimos 7 días

### Frontend (Vercel)
- [ ] **[BLOQUEANTE]** Dominio personalizado configurado y con SSL activo (`bresca.app`)
- [ ] **[BLOQUEANTE]** Variables de entorno de producción configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`)
- [ ] CSP en `vercel.json` actualizada con el dominio final en `connect-src`
- [ ] Build de producción sin errores TypeScript (`npx tsc --noEmit`)
- [ ] PWA manifest correcto: nombre, íconos, theme_color

---

## BLOQUE 2 — Seguridad

- [ ] **[BLOQUEANTE]** `SUPABASE_SERVICE_ROLE_KEY` NO está en ningún archivo del repo (verificar con `git grep SERVICE_ROLE_KEY`)
- [ ] **[BLOQUEANTE]** `DEEPSEEK_API_KEY` NO está en ningún archivo del repo
- [ ] **[BLOQUEANTE]** `.env` y `.env.local` están en `.gitignore`
- [ ] **[BLOQUEANTE]** RLS activo y testeado (QA script — mínimo 12/14)
- [ ] Helmet CSP activo en la API Express (verificar en `/health` que responde con `Content-Security-Policy` header)
- [ ] Headers de seguridad activos en Vercel (`X-Frame-Options`, `X-Content-Type-Options`)
- [ ] Magic bytes validation activa en Edge Function (no acepta archivos con extensión falsificada)
- [ ] Rate limiting activo en Copilot (20/hora) y QR (10/hora)
- [ ] Sanitización de prompt injection activa (`sanitizeForPrompt` en copilot/router.ts)
- [ ] QR token cleanup pg_cron activo — verificar en Supabase → Database → pg_cron jobs
- [ ] Acceso al Dashboard de Supabase protegido con MFA personal

---

## BLOQUE 3 — Legal y cumplimiento (Ley 25.326 + RGPD soft)

- [ ] **[BLOQUEANTE]** Página `/privacidad` accesible y publicada con texto aprobado
- [ ] **[BLOQUEANTE]** Política de privacidad menciona Supabase us-east-2 Ohio (Art. 12 transferencia internacional)
- [ ] **[BLOQUEANTE]** Consent module activo — `record_consent()` se llama en onboarding antes de subir datos
- [ ] **[BLOQUEANTE]** `consent_audit` es append-only — verificar que el trigger de bloqueo de UPDATE/DELETE está activo
- [ ] Disclaimer "asistivo, no diagnóstico" visible en: Copilot, detalle de estudio, Export PDF
- [ ] Mínimo cohort size = 5 en todas las vistas CRO (`MINIMUM_COHORT_SIZE` no reducido)
- [ ] Inscripción en AAIP (Agencia de Acceso a la Información Pública) iniciada
- [ ] DPO (Delegado de Protección de Datos) designado o documentado que no aplica por tamaño

---

## BLOQUE 4 — Calidad y testing

- [ ] **[BLOQUEANTE]** QA script: mínimo 12/14 tests pasando (`node scripts/post-deploy-qa.mjs`)
- [ ] **[BLOQUEANTE]** Flujo crítico B2C testeado end-to-end en mobile real (iPhone + Android):
  - [ ] Registro anónimo → onboarding
  - [ ] Upload de estudio (PDF + imagen) → confirmación
  - [ ] Copilot responde sin error
  - [ ] Generación de QR → vista pública del médico
- [ ] **[BLOQUEANTE]** Sin errores 500 en logs de Render en los últimos deploys
- [ ] Sin regresiones visibles en las 3 pantallas principales (Home, Vault, Copilot)
- [ ] Export PDF "Para médico" funciona en iOS Safari (pop-up no bloqueado)
- [ ] Score OCR visible en Vault (punto de color en cada estudio)
- [ ] Test de rechazo de archivo malicioso (extensión PDF con magic bytes de imagen) — debe devolver 400

---

## BLOQUE 5 — Producto y UX

- [ ] Landing page seleccionada y activa en `/landing/` (una de las 9 variantes)
- [ ] Flujo Acceder / Crear cuenta diferenciado y funcionando
- [ ] Flujo de onboarding completo sin loops ni pantallas huérfanas
- [ ] PWA instalable en iOS Safari (botón "Agregar a inicio") y Android Chrome
- [ ] Textos revisados: sin typos, sin textos de placeholder, sin "TODO"
- [ ] Íconos y logos correctos en todas las resoluciones (192px, 512px en manifest)

---

## BLOQUE 6 — Operaciones

- [ ] Alertas de caída configuradas en Render (email si la API está down > 5 min)
- [ ] `docs/15_Incident_Response_Plan.md` revisado y con contactos actualizados
- [ ] `docs/16_Prod_Setup_Guide.md` disponible para el equipo
- [ ] Credenciales de producción guardadas en gestor de contraseñas (no en Slack, no en emails)
- [ ] Plan de comunicación a usuarios definido para caso de incidente
- [ ] Proceso de deploy documentado — cualquier miembro del equipo puede hacer un rollback en Render/Vercel

---

## BLOQUE 7 — Post-lanzamiento inmediato (primeras 72 horas)

Estos ítems no bloquean el lanzamiento pero deben completarse en los primeros 3 días:

- [ ] Monitorear Supabase logs por accesos anómalos
- [ ] Monitorear Render logs por errores 500 o memory pressure
- [ ] Verificar que pg_cron de cleanup corrió el primer día (03:00 UTC)
- [ ] Recoger feedback de los primeros usuarios y abrir issues en GitHub
- [ ] Verificar deliverabilidad de emails de auth (si se usa email sign-in)

---

## Resumen de estado

| Bloque | Total ítems | Bloqueantes | Estado |
|---|---|---|---|
| 1 — Infraestructura | 15 | 9 | Pendiente |
| 2 — Seguridad | 11 | 5 | Pendiente |
| 3 — Legal | 7 | 5 | Pendiente |
| 4 — Calidad | 10 | 5 | Pendiente |
| 5 — Producto/UX | 7 | 0 | Pendiente |
| 6 — Operaciones | 6 | 0 | Pendiente |
| 7 — Post-lanzamiento | 5 | 0 | Post-go-live |

**Total bloqueantes: 24** — todos deben estar en `[x]` antes de publicar.
