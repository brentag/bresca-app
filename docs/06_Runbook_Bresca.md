# Runbook — Operational Guide
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.1 |
| **Dueño** | Engineering Lead |
| **Fecha** | Mayo 2026 |
| **Audiencia** | Dev + Oncall |
| **Relacionado con** | [[05_SystemDesign_Bresca|System Design v1.0]], [[07_PostMortem_Bresca|Post-Mortem template]] |

---

## 1. Entornos

| Entorno | URLs | Uso |
|---|---|---|
| **Local** | `localhost:3000` (api) · `localhost:5173` (web-patient) · `localhost:5174` (web-cro) | Desarrollo diario. Datos seed locales. Supabase local vía Docker. |
| **Staging** | — | No configurado aún en MVP. |
| **Production** | `https://bresca-api.onrender.com` (api) · `https://bresca-app-api.vercel.app` (web-patient) | Usuarios reales. Cambios **solo vía push a `main`**. |

---

## 2. Setup del entorno local

### Prerequisitos

- Node.js 20 LTS
- Docker Desktop (para Supabase local)
- `npm install -g supabase` (Supabase CLI)
- pnpm (`npm install -g pnpm`)

### Pasos

```bash
# 1. Clonar
git clone https://github.com/brentag/bresca-app && cd bresca-app

# 2. Instalar dependencias (todos los workspaces)
pnpm install

# 3. Variables de entorno
cp apps/api/.env.example apps/api/.env
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            DEEPSEEK_API_KEY, QR_TOKEN_SECRET

# 4. Levantar Supabase local
supabase start
supabase db reset    # aplica migraciones + seed data

# 5. Levantar API + web-patient + web-cro (turbo corre todos en paralelo)
pnpm dev

# Mobile (pendiente — no iniciado aún)
# cd apps/mobile && npx expo start
```

### Verificar que todo funciona

```bash
curl http://localhost:3000/health
# → {"status":"ok","ts":"..."}
```

---

## 3. Deploy a producción

### Proceso de release

```
1. Push a `main` (o merge de PR)

2. Render.com auto-deploya `apps/api` desde `main`
   → Verificar en Render Dashboard → bresca-api → Deploys
   → URL: https://bresca-api.onrender.com/health debe devolver 200

3. Vercel auto-deploya `apps/web-patient` desde `main`
   → Preview URL disponible inmediatamente. Production en ~2 min.
   → URL: https://bresca-app-api.vercel.app

4. Correr QA post-deploy:
   node scripts/post-deploy-qa.mjs
   → Resultados documentados en [[10_TestResults_Bresca|Test Results]]
   → 12/14 tests deben pasar (2 SKIP por configuración pendiente es aceptable)

5. Mobile (cuando corresponda)
   → pnpm build:production (EAS Build)
   → Distribución a TestFlight (iOS) y Play Internal Testing (Android)
```

### Deploy de migraciones de DB

> ⚠️ Las migraciones se aplican **ANTES** del deploy del código que las usa. Nunca al revés.

```bash
# 1. Escribir el SQL en supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql

# 2. Aplicar via MCP Supabase o CLI:
supabase db push --linked --project-ref mkacuagcvwxoduhdthwg

# 3. Verificar con:
supabase migration list --linked --project-ref mkacuagcvwxoduhdthwg

# 4. Re-generar tipos TS:
supabase gen types typescript --project-ref mkacuagcvwxoduhdthwg \
  > packages/shared/src/database.types.ts
```

---

## 4. Procedimientos de incidente

### INC-001: API down (Render.com)

**Síntomas:** `https://bresca-api.onrender.com/health` no responde, 503 en la app.

```
1. Abrir Render Dashboard → bresca-api → Deploys
2. Revisar logs del último deploy (Render Dashboard → Logs)
3. Si el deploy nuevo causó el problema:
   Render → Deploys → [último deploy exitoso] → Rollback
4. Si es problema de infraestructura Render:
   Verificar https://status.render.com
5. Notificar: "API down desde HH:MM UTC. Investigando."
6. Una vez resuelto: "API restaurada a las HH:MM UTC. Root cause: [X]."
7. Si duró > 30 min: crear Post-Mortem.
```

### INC-002: Base de datos lenta o inaccesible

**Síntomas:** timeouts en la app, queries > 5s, alertas de Supabase Dashboard.

```
1. Supabase Dashboard → Database → Metrics
   → Revisar CPU, conexiones activas, memoria
2. Supabase → Logs → Slow queries (filtrar > 1000ms)
3. Si hay query lenta identificada:
   → Query con EXPLAIN ANALYZE en Supabase SQL Editor
   → Si es lock: SELECT * FROM pg_locks WHERE granted = false
   → Si hay lock: Supabase → Database → Connections → Kill session bloqueante
4. Solución permanente: agregar índice en la siguiente migración
5. Si Supabase está down: https://status.supabase.com
```

### INC-003: OCR fallando en masa (> 20% error rate)

**Síntomas:** `study_drafts.status` queda en `error`, usuarios ven cards rojas en el Vault, Edge Function con errores en logs.

```
1. Supabase Dashboard → Edge Functions → process-study-draft → Logs
   → Identificar tipo de error (DeepSeek timeout, Storage error, parsing error)
2. Si es error de quota o rate limit DeepSeek:
   → DeepSeek Console → Usage → verificar límites
   → Ajustar DEEPSEEK_API_KEY en Supabase Dashboard → Secrets → Restart
3. Si es error de Storage (archivos no accesibles):
   → Supabase Dashboard → Storage → verificar bucket "studies"
   → Verificar RLS policies del bucket
4. Si el Edge Function tiene un bug de código:
   → Supabase Dashboard → Edge Functions → Redeploy desde supabase/functions/
5. Documentar en Post-Mortem si duró > 30 min o afectó > 50 uploads.
```

### INC-004: Copilot no responde o responde con errores

**Síntomas:** chat del Copilot no envía respuesta, errores 429 o 500 en `/copilot/chat`.

```
1. Render Dashboard → bresca-api → Logs → filtrar por "copilot"
2. Si es error 429 (rate limit DeepSeek):
   → DeepSeek Console → Usage → verificar si superamos límite
   → Reducir MAX_TOKENS temporalmente o esperar reset
3. Si es error de API key expirada/revocada:
   → Generar nueva key en DeepSeek Console
   → Actualizar DEEPSEEK_API_KEY en Render → Environment → Restart
4. Si es error en el contexto del vault:
   → Verificar que extracted_fields no sea null para los estudios del usuario
```

### INC-005: Brecha de seguridad sospechosa

**Síntomas:** acceso no autorizado a datos de usuario, queries anómalas en Supabase logs, reporte externo de datos expuestos.

> 🚨 **Este es el incidente más crítico. Activar protocolo inmediatamente.**

```
TIEMPO MÁXIMO PARA CONTENCIÓN: 1 hora

1. [T+0] Revocar credenciales comprometidas INMEDIATAMENTE:
   - Render Dashboard → bresca-api → Environment → SUPABASE_SERVICE_ROLE_KEY → eliminar → Save → Restart
   - Supabase Dashboard → Settings → API → Revocar service role key
   - Revocar DEEPSEEK_API_KEY en DeepSeek Console

2. [T+0] Notificar al DPO (Data Protection Officer) y al asesor legal

3. [T+15min] Analizar Supabase logs:
   - Filtrar por service_role en los últimos 24h
   - Identificar qué tablas fueron accedidas y qué datos fueron leídos

4. [T+30min] Determinar alcance:
   - ¿Qué datos fueron expuestos? ¿Datos de quiénes?
   - ¿El acceso fue solo lectura o hubo modificaciones?

5. [T+1h] Si se confirma brecha:
   - Notificación a usuarios afectados (LGPD requiere < 72h desde la confirmación)
   - Comunicado público si corresponde

6. Post-Mortem obligatorio con RCA completo en < 48h.
```

---

## 5. Tareas operacionales recurrentes

| Tarea | Frecuencia | Procedimiento |
|---|---|---|
| Rotación de DEEPSEEK_API_KEY | Mensual | DeepSeek Console → nueva key → actualizar en Render env vars + Supabase Secrets → Restart → Verificar `/health` |
| Verificar crecimiento de storage | Semanal | Supabase Dashboard → Storage → verificar que crecimiento es lineal, no exponencial |
| Revisar slow queries | Semanal | Supabase Dashboard → Logs → Slow queries. Si hay query > 500ms sin índice: crear ticket. |
| Verificar study_drafts TTL (pg_cron) | Automático diario | `SELECT count(*) FROM study_drafts WHERE created_at < now() - interval '24h'` — debe ser 0 después del job |
| Verificar QR tokens expirados (pg_cron) | Automático diario | `SELECT count(*) FROM qr_tokens WHERE expires_at < now() AND revoked_at IS NULL` — debe ser 0 |
| Actualizar dependencias | Quincenal | `pnpm outdated` → actualizar en branch → tests → PR |
| QA post-deploy | Cada deploy | `node scripts/post-deploy-qa.mjs` — 12/14 mínimo aceptable |

---

## 6. Comandos de utilidad frecuentes

```bash
# Verificar estado de la API en producción
curl https://bresca-api.onrender.com/health

# Ver logs de la Edge Function OCR
supabase functions logs process-study-draft --project-ref mkacuagcvwxoduhdthwg

# Listar migraciones aplicadas a producción
supabase migration list --linked --project-ref mkacuagcvwxoduhdthwg

# Re-generar tipos TypeScript desde el schema de DB
supabase gen types typescript --project-ref mkacuagcvwxoduhdthwg \
  > packages/shared/src/database.types.ts

# Correr QA post-deploy manual
node scripts/post-deploy-qa.mjs

# Correr QA sin crear GitHub issues
node scripts/post-deploy-qa.mjs --no-issues

# Ver study_drafts con error en producción (últimas 24h)
# En Supabase Dashboard → SQL Editor:
# SELECT id, profile_id, error_log, created_at
# FROM study_drafts
# WHERE status = 'error' AND created_at > now() - interval '24h'
# ORDER BY created_at DESC;
```

---

## Links relacionados

- [[04_TechSpec_Bresca|Tech Spec — Technical Specification]]
- [[05_SystemDesign_Bresca|System Design Document]]
- [[07_PostMortem_Bresca|Post-Mortem Template]]
- [[09_TestPlan_Bresca|Test Plan — Escenarios de prueba]]
- [[10_TestResults_Bresca|Test Results — QA del MVP]]

---

*Relacionado: System Design v1.0 | Post-Mortem template | Tech Spec v1.1*
