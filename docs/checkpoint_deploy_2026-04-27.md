# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-04-27  
**Estado general:** MVP 100% construido. Deploy Vercel + Railway pendiente — listos para ejecutar en próxima sesión.

---

## Cambios desde checkpoint anterior (2026-04-25)

### Nuevas features construidas
- `apps/web-patient` — PWA B2C React+Vite completa (14 tasks, commit `b886c61`)
  - Auth OTP, Onboarding, Vault, Upload (mock OCR), StudyDetail, QR, Copilot, Menu
  - PWA instalable en Android / iOS meta tags
  - `vercel.json` con SPA rewrites configurado

### Cambios de infraestructura
- **Hosting:** Hostinger abandonado → Vercel elegido (CI/CD limpio, sin problemas de env vars)
- **`vercel.json` raíz:** apunta a `web-patient` con SPA rewrites para React Router
- **Copilot LLM:** migrado de Anthropic Claude → DeepSeek via openai-compatible API
  - Archivo: `apps/api/src/copilot/router.ts`
  - SDK: `openai` (en lugar de `@anthropic-ai/sdk`)
  - Modelo: `deepseek-chat`
  - Env var: `DEEPSEEK_API_KEY` (en lugar de `ANTHROPIC_API_KEY`)

---

## Estado por servicio

| Servicio | Estado |
|---|---|
| Supabase (DB + Auth + Storage) | ✅ LIVE |
| GitHub repo | ✅ LIVE — branch `main` actualizado |
| Vercel web-patient | ⏳ Pendiente — listo para deploy |
| Vercel web-cro | ⏳ Pendiente — listo para deploy |
| Railway API | ⏳ Pendiente — Dockerfile listo, falta ejecutar |
| EAS Build (mobile) | ❌ No iniciado |

---

## Secuencia de deploy — próxima sesión

### 1. Vercel — web-patient (PWA B2C)
- vercel.com → New Project → importar `brentag/bresca-app`
- El `vercel.json` raíz ya tiene todo configurado (no tocar build settings)
- Env vars a agregar en Vercel UI:

```
VITE_SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYWN1YWdjdnd4b2R1aGR0aHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDg1MzAsImV4cCI6MjA5MjYyNDUzMH0.ik410_XXFlor7Jqs2UO8GDD0IieHE0QJx6b-PDpEYKQ
VITE_API_URL=   ← dejar vacío hasta tener Railway
```

### 2. Supabase Auth — configurar URLs de producción
- Dashboard → Authentication → URL Configuration
- Site URL: `https://[url-vercel-web-patient].vercel.app`
- Redirect URLs: `https://[url-vercel-web-patient].vercel.app/**`

### 3. Vercel — web-cro (Panel CRO)
- vercel.com → New Project → mismo repo → **segundo proyecto**
- Overridear build settings en Vercel UI:
  - Build Command: `pnpm --filter=@bresca/web-cro build`
  - Output Directory: `apps/web-cro/dist`
  - Install Command: `pnpm install`
- Mismas env vars que web-patient

### 4. Railway — API
- railway.app → New Project → Deploy from GitHub → `brentag/bresca-app`
- Settings → Build → Dockerfile Path: `apps/api/Dockerfile`
- Root Directory: dejar vacío (build context = monorepo raíz)
- Env vars a agregar:

```
NODE_ENV=production
SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   ← Supabase Dashboard → Settings → API → service_role (JWT, empieza con eyJ)
DEEPSEEK_API_KEY=            ← platform.deepseek.com → API Keys
QR_TOKEN_SECRET=             ← generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRO_ALLOWED_EMAILS=brentag@gmail.com
```

- Verificar: `https://[url-railway].railway.app/health` → `{ "status": "ok" }`

### 5. Conectar API con frontends
- En ambos proyectos Vercel → Settings → Environment Variables
- Actualizar `VITE_API_URL` con la URL de Railway
- Redeploy automático

---

## Decisión pendiente — LLM del Copilot

El usuario evalúa mañana si usar DeepSeek (actual, créditos disponibles) u OpenAI para el MVP.

| Opción | Pro | Contra |
|---|---|---|
| **DeepSeek** (actual) | Créditos disponibles, muy barato, API OpenAI-compatible | Menos conocido, data centers en China |
| **OpenAI GPT-4o** | Más conocido, confiable | Más caro |
| **Especializado salud** | Mejor precisión médica | No para MVP, evaluar con usuarios reales |

**El cambio es 2 líneas** en `apps/api/src/copilot/router.ts` — sin impacto en arquitectura.

---

## Funcionalidades por estado

### ✅ Funcionando hoy (solo en localhost)
- Login email OTP via Supabase
- Onboarding completo
- Vault: lista, upload (mock OCR), detalle, filtros
- QR: generar, mostrar, vista pública médico
- Copilot chat (requiere API corriendo con DeepSeek key)
- Panel CRO: login, dashboard, pacientes, matching

### ⏳ Funciona tras deploy Vercel (sin Railway)
- Login y onboarding en producción
- Vault (lectura/escritura a Supabase Storage)

### ⏳ Funciona tras deploy Railway
- Copilot
- QR sharing
- Dashboard CRO con datos reales

### ❌ No implementado aún
- OCR real (hoy es mock) — requiere Google Document AI
- Mobile en stores (EAS Build)

---

## Archivos clave

```
vercel.json                              → config web-patient con SPA rewrites
apps/web-patient/vercel.json             → config alternativa (no usada, root tiene precedencia)
apps/api/Dockerfile                      → build imagen Docker para Railway
apps/api/src/copilot/router.ts           → Copilot con DeepSeek (línea 12: modelo, línea 11: baseURL)
docs/checkpoint_deploy_2026-04-25.md     → checkpoint anterior con diagnóstico Hostinger
```
