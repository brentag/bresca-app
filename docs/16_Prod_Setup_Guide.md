# Guía de Setup de Producción — Bresca

**Versión:** 1.0 — 2026-05-08  
**Uso:** Configurar una instancia de producción nueva, o migrar de staging a prod con dominio propio.  
**Prerequisito:** Haber leído `06_Runbook_Bresca.md` para entender la arquitectura.

---

## Arquitectura de producción

```
Usuario
  └── bresca.app (dominio final) ──▶ Vercel (web-patient)
                                         │
                                         └── bresca-api.onrender.com ──▶ Render (API Express)
                                                   │
                                                   └── mkacuagcvwxoduhdthwg.supabase.co (DB + Auth + Storage)
                                                             │
                                                             └── Supabase Edge Functions (OCR async)
```

---

## 1. Supabase — configuración inicial de proyecto

> Si ya existe el proyecto de producción, saltear al paso 1.3.

### 1.1 Crear proyecto
- Dashboard: supabase.com/dashboard → "New project"
- Region: **South America (São Paulo)** para latencia mínima en LATAM
- Plan: **Pro ($25/mo)** — necesario para PITR, webhooks y pgcron
- Database password: generar con `openssl rand -base64 32`, guardar en gestor de contraseñas

### 1.2 Aplicar migraciones
```bash
# Linkar CLI al proyecto
supabase link --project-ref <PROJECT_REF>

# Aplicar todas las migraciones en orden
supabase db push --linked --project-ref <PROJECT_REF>

# Verificar que todas aplicaron
supabase migration list --linked
```

### 1.3 Habilitar extensiones requeridas
En Supabase Dashboard → Database → Extensions:
- `uuid-ossp` ✓ (viene habilitada)
- `pg_cron` ✓ — necesaria para cleanup de QR tokens y study_drafts
- `pgcrypto` ✓ — para gen_random_uuid() en versiones antiguas

### 1.4 Obtener credenciales
Dashboard → Settings → API:
```
Project URL:          https://<REF>.supabase.co
anon public key:      eyJ...  (va al frontend — NO es secreta)
service_role key:     eyJ...  (SOLO backend API — nunca al cliente)
JWT Secret:           <secreto>  (para verificar tokens en la API)
```

### 1.5 Configurar Auth
Dashboard → Authentication → Settings:
- **Site URL:** `https://bresca.app` (dominio final)
- **Redirect URLs:** agregar `https://bresca.app/**` y `https://bresca-app-api.vercel.app/**`
- **Email confirmations:** desactivar para MVP (flujo de onboarding es anon → email opcional)
- **JWT expiry:** 3600s (default, ok para MVP)

### 1.6 Configurar Storage
Dashboard → Storage → Buckets:
- Verificar que existe el bucket `studies`
- Policies: solo lectura autenticada (vía RLS aplicada en migración)
- Límite de archivo: 50 MB por archivo (suficiente para PDFs médicos multi-página)

### 1.7 Habilitar PITR
Dashboard → Settings → Backups → Enable Point-in-Time Recovery  
**Obligatorio antes del go-live** — sin PITR no hay RPO < 24h.

### 1.8 Secretos de Edge Functions
Dashboard → Edge Functions → Secrets (o vía CLI):
```bash
supabase secrets set DEEPSEEK_API_KEY=<key> --project-ref <REF>
supabase secrets set MISTRAL_API_KEY=<key> --project-ref <REF>
```

---

## 2. Render.com — API Express

### 2.1 Crear servicio
- New Web Service → Connect repo GitHub `brentag/bresca-app`
- Root directory: `apps/api`
- Build command: `pnpm install && pnpm build`
- Start command: `node dist/index.js`
- Plan: **Starter ($7/mo)** mínimo — elimina cold starts de 30s del plan Free

### 2.2 Variables de entorno en Render
| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SUPABASE_URL` | `https://<REF>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role — SECRETA) |
| `DEEPSEEK_API_KEY` | `sk-...` |
| `CORS_ORIGIN` | `https://bresca.app,https://www.bresca.app` |
| `QR_TOKEN_SECRET` | generar con `openssl rand -base64 32` |

### 2.3 Dominio personalizado en Render (opcional)
- Render Dashboard → Custom Domains → `api.bresca.app`
- Agregar CNAME en DNS: `api.bresca.app → <servicio>.onrender.com`
- Actualizar `CORS_ORIGIN` y el `connect-src` de Vercel headers

### 2.4 Health check
Render configura automáticamente el health check en `/health`.  
Verificar: `curl https://bresca-api.onrender.com/health` → `{"status":"ok","ts":"..."}`

---

## 3. Vercel — web-patient (frontend)

### 3.1 Importar proyecto
- vercel.com/new → Import Git Repository → `brentag/bresca-app`
- Framework: **Other** (Vite, no Next.js)
- Root directory: `apps/web-patient`
- Build command: `pnpm run build`
- Output directory: `dist`

### 3.2 Variables de entorno en Vercel
| Variable | Entorno | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | Production | `https://<REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production | `eyJ...` (anon key — pública, ok) |
| `VITE_API_URL` | Production | `https://bresca-api.onrender.com` |

### 3.3 Dominio personalizado
- Vercel Dashboard → Domains → `bresca.app` y `www.bresca.app`
- Configurar DNS en registrar:
  ```
  bresca.app       A      76.76.21.21
  www.bresca.app   CNAME  cname.vercel-dns.com
  ```
- Vercel gestiona SSL automáticamente (Let's Encrypt)

### 3.4 Actualizar CSP al cambiar dominio
En `apps/web-patient/vercel.json`, actualizar el header `Content-Security-Policy`:
- `connect-src`: reemplazar `https://bresca-app-api.vercel.app` por `https://bresca.app`
- Si la API tiene dominio propio (`api.bresca.app`): agregar también en `connect-src`

### 3.5 Actualizar Supabase Auth redirect URLs
Una vez que el dominio está activo, agregar en Supabase:
- `https://bresca.app/**`
- `https://www.bresca.app/**`

---

## 4. Rotación de credenciales (post-setup o semestral)

### 4.1 Rotar DEEPSEEK_API_KEY
1. Generar nueva key en platform.deepseek.com → API Keys → New key
2. Actualizar en **Render** env vars (no requiere redeploy inmediato — Render la inyecta en el próximo)
3. Actualizar en **Supabase Edge Functions** secrets: `supabase secrets set DEEPSEEK_API_KEY=<nueva>`
4. Revocar la key vieja en DeepSeek dashboard
5. Verificar: POST a `/copilot/chat` con un mensaje de prueba

### 4.2 Rotar QR_TOKEN_SECRET
> Los QR existentes seguirán siendo válidos hasta su `expires_at` — el secret solo afecta generación nueva.
1. Generar: `openssl rand -base64 32`
2. Actualizar en Render env vars
3. Redeploy: Render → "Manual Deploy" → "Deploy latest commit"

### 4.3 Rotar SUPABASE_SERVICE_ROLE_KEY
> Solo hacer esto en respuesta a un incidente de seguridad.
1. Supabase Dashboard → Settings → API → Regenerate service_role key
2. Actualizar inmediatamente en Render env vars
3. Redeploy inmediato de la API

### 4.4 Rotar JWT Secret de Supabase Auth
> Esto invalida TODAS las sesiones activas de usuarios — hacerlo solo en incidente grave.
1. Supabase Dashboard → Settings → Auth → JWT Secret → Generate new secret
2. Avisar a usuarios (todos deberán hacer login nuevamente)

---

## 5. Deploy de Edge Functions

```bash
# Deploy de la función OCR (process-study-draft)
supabase functions deploy process-study-draft --project-ref <REF>

# Verificar que está activa
supabase functions list --project-ref <REF>

# Logs en tiempo real
supabase functions logs process-study-draft --project-ref <REF>
```

---

## 6. Verificación post-setup

```bash
# QA automatizado (mínimo 12/14 tests deben pasar)
node scripts/post-deploy-qa.mjs

# Verificar health de la API
curl https://bresca-api.onrender.com/health

# Verificar que RLS está activo en todas las tablas
# (revisar output del script QA — test TS-015)
```

---

## 7. Configuraciones opcionales pero recomendadas antes del go-live

| Acción | Plataforma | Por qué |
|---|---|---|
| Activar alertas de error | Render → Notifications | Recibir email si la API crashea |
| Configurar custom SMTP | Supabase → Auth → SMTP | Los emails de auth no llegan desde `noreply@supabase.io` con buena deliverabilidad |
| Subir SPF/DKIM para dominio | DNS del dominio | Mejorar deliverabilidad de emails transaccionales |
| Activar Sentry o Axiom | Render env vars | Observabilidad de errores en producción |
| Cloudflare delante del dominio | DNS → Cloudflare | DDoS protection + edge caching gratuito |
