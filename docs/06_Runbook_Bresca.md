# Runbook — Operational Guide
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Dueño** | Engineering Lead |
| **Fecha** | Abril 2026 |
| **Audiencia** | Dev + Oncall |
| **Relacionado con** | System Design v1.0, Post-Mortem template |

---

## 1. Entornos

| Entorno | URLs | Uso |
|---|---|---|
| **Local** | `localhost:3000` (api) `localhost:5173` (web-cro) | Desarrollo diario. Datos seed locales. Supabase local vía Docker. |
| **Staging** | `staging-api.bresca.health` / `staging.bresca.health` | QA antes de releases. Datos sintéticos. Mirror de producción. |
| **Production** | `api.bresca.health` / `bresca.health` | Usuarios reales. Cambios **solo vía CI/CD**. Nunca deploy manual. |

---

## 2. Setup del entorno local

### Prerequisitos

- Node.js 20 LTS
- Docker Desktop (para Supabase local)
- `npm install -g supabase` (Supabase CLI)
- `npm install -g eas-cli` (para builds móviles)

### Pasos

```bash
# 1. Clonar
git clone https://github.com/bresca/bresca-app && cd bresca-app

# 2. Instalar dependencias (todos los workspaces)
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            GOOGLE_DOCAI_KEY, ANTHROPIC_API_KEY, QR_TOKEN_SECRET

# 4. Levantar Supabase local
supabase start
supabase db reset    # aplica migraciones + seed data

# 5. Levantar API + web-cro (turbo corre ambos en paralelo)
npm run dev

# 6. Mobile (terminal separada)
cd apps/mobile && npx expo start
```

### Verificar que todo funciona

```bash
curl http://localhost:3000/health
# → {"status":"ok","db":"connected","storage":"connected"}
```

---

## 3. Deploy a producción

> ⚠️ **Nunca deploy manual a producción.** Todo cambio pasa por PR → CI/CD → staging → production.

### Proceso de release

```
1. Crear PR contra `main`
   → CI corre: lint, type-check, tests, build de todas las apps

2. Si CI verde + code review aprobado → merge a `main`

3. Railway auto-deploya `apps/api` desde `main`
   → Verificar en Railway Dashboard que el deploy terminó sin errores

4. Vercel auto-deploya `apps/web-cro` desde `main`
   → Preview URL disponible inmediatamente. Production en ~2 min.

5. Mobile (cuando corresponda)
   → npm run build:production (EAS Build)
   → Distribución a TestFlight (iOS) y Play Internal Testing (Android)
```

### Deploy de migraciones de DB

> ⚠️ Las migraciones se aplican **ANTES** del deploy del código que las usa. Nunca al revés.

```bash
# 1. Generar migración desde el diff del schema
supabase db diff --use-migra --schema public

# 2. Revisar el SQL generado manualmente (siempre)

# 3. Crear archivo de migración
supabase migration new nombre_descripcion_breve
# → crea supabase/migrations/YYYYMMDDHHMMSS_nombre.sql

# 4. Pegar SQL revisado en el archivo

# 5. Aplicar en staging primero
supabase db push --linked --project-ref <staging-ref>

# 6. Verificar que staging funciona correctamente

# 7. Aplicar en producción
supabase db push --linked --project-ref <prod-ref>
```

---

## 4. Procedimientos de incidente

### INC-001: API down (Railway)

**Síntomas:** `/health` no responde, 503 en la app, alertas de UptimeRobot.

```
1. Abrir Railway Dashboard → proyecto bresca-api → Deployments
2. Revisar logs del último deploy
3. Si el deploy nuevo causó el problema:
   Railway → Deployments → [último deploy exitoso] → Rollback
4. Si es problema de infraestructura Railway:
   Verificar https://status.railway.app
5. Notificar en canal #incidents: "API down desde HH:MM UTC. Investigando."
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

**Síntomas:** uploads no se confirman, logs con errores Document AI, usuarios reportan que OCR "no extrae nada".

```
1. Google Cloud Console → Document AI → Metrics → Error rate (últimos 30 min)
2. Si es error de quota:
   → Google Cloud Console → APIs → Document AI → Quotas → Request increase
   → O activar fallback inmediato:
      Railway → bresca-api → Variables → OCR_PROVIDER=textract → Save → Restart
3. Si es degradación del servicio de Google:
   → https://status.cloud.google.com
   → Activar fallback a Textract mientras tanto
4. Documentar en Post-Mortem si duró > 30 min o afectó > 50 uploads.
```

### INC-004: Copilot no responde o responde con errores

**Síntomas:** chat del Copilot no envía respuesta, errores 429 o 500 en `/copilot/chat`.

```
1. Revisar Railway logs para bresca-api → filtrar por "copilot"
2. Si es error 429 (rate limit Anthropic):
   → Anthropic Console → Usage → verificar si superamos límite
   → Aumentar límite o reducir MAX_TOKENS temporalmente
3. Si es error de API key expirada/revocada:
   → Generar nueva key en Anthropic Console
   → Actualizar ANTHROPIC_API_KEY en Railway → Restart
4. Si es error en el chunking/retrieval:
   → Revisar tabla study_embeddings: SELECT count(*) WHERE profile_id = <afectado>
   → Si está vacía: re-generar embeddings vía Edge Function manual
```

### INC-005: Brecha de seguridad sospechosa

**Síntomas:** acceso no autorizado a datos de usuario, queries anómalas en Supabase logs, reporte externo de datos expuestos.

> 🚨 **Este es el incidente más crítico. Activar protocolo inmediatamente.**

```
TIEMPO MÁXIMO PARA CONTENCIÓN: 1 hora

1. [T+0] Revocar credenciales comprometidas INMEDIATAMENTE:
   - Railway → bresca-api → Variables → SUPABASE_SERVICE_ROLE_KEY → borrar → Save
   - Supabase Dashboard → Settings → API → Revocar service role key
   - Revocar ANTHROPIC_API_KEY y GOOGLE_DOCAI_KEY en sus respectivas consolas

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
| Rotación de API keys (DOCAI + Anthropic) | Mensual | Google Cloud Console + Anthropic Console → actualizar en Railway env vars → Restart → Verificar `/health` |
| Verificar crecimiento de storage | Semanal | Supabase Dashboard → Storage → verificar que crecimiento es lineal, no exponencial |
| Revisar slow queries | Semanal | Supabase Dashboard → Logs → Slow queries. Si hay query > 500ms sin índice: crear ticket. |
| Verificar QR tokens expirados (pg_cron) | Automático diario | `SELECT count(*) FROM qr_tokens WHERE expires_at < now()` — debe ser 0 después del job |
| Verificar backup | Mensual | Supabase Pro hace backups diarios. Una vez al mes: restore test en staging. |
| Revisar costos IA | Semanal | Anthropic Console + Google Cloud Console. Alerta si > baseline × 1.3. |
| Actualizar dependencias | Quincenal | `npm outdated` → actualizar en branch → tests → PR |

---

## 6. Comandos de utilidad frecuentes

```bash
# Ver logs de la API en Railway
railway logs --tail --service bresca-api

# Conectarse a la DB de producción (solo lectura)
supabase db remote --project-ref <prod-ref>

# Verificar estado de todos los servicios
curl https://api.bresca.health/health | jq

# Listar migraciones aplicadas
supabase migration list --linked --project-ref <prod-ref>

# Re-generar tipos TypeScript desde el schema de DB
supabase gen types typescript --project-ref <prod-ref> > packages/shared/src/database.types.ts

# Ver uso de tokens del Copilot (último día)
# En Anthropic Console → Usage → Filter by date
```

---

*Relacionado: System Design v1.0 | Post-Mortem template | Tech Spec v1.0*
