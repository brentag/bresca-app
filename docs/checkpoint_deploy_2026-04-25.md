# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-04-25  
**Estado general:** MVP construido al 100%, deploy web-cro bloqueado en issue de env vars en CI

---

## Stack completo

| Capa | Tech | Estado |
|---|---|---|
| Mobile B2C | React Native + Expo SDK 52 + TypeScript | Construido, sin deployar |
| Web CRO B2B | React 18 + Vite 5 + TypeScript | Construido, deploy fallando |
| API | Node.js 20 + Express | Construido, sin deployar |
| DB | PostgreSQL 15 vía Supabase cloud | **LIVE** |
| Auth | Supabase email OTP | **LIVE** |
| Storage | Supabase bucket `studies` | **LIVE** |
| AI Copilot | Claude API (claude-sonnet-4-6) | Falta `ANTHROPIC_API_KEY` |
| Monorepo | Turborepo + pnpm workspaces | OK |
| Repo | GitHub — https://github.com/brentag/bresca-app | **LIVE** |

---

## Infraestructura configurada

### Supabase ✅ LIVE
- Proyecto: `mkacuagcvwxoduhdthwg`
- URL: `https://mkacuagcvwxoduhdthwg.supabase.co`
- 3 migraciones aplicadas:
  - `20260424000000_initial_schema.sql` — tablas, RLS, políticas QR
  - `20260424010000_storage_studies.sql` — bucket privado `studies`
  - `20260424020000_fix_cro_view.sql` — vista CRO con k-anonimato ≥5
- Credenciales en `apps/api/.env` y `apps/web-cro/.env`

### GitHub ✅ LIVE
- Repo: https://github.com/brentag/bresca-app (privado)
- Branch `main` — código fuente
- Branch `deploy` — build estático de web-cro (se actualiza vía CI)
- Workflow: `.github/workflows/deploy-web-cro.yml`

### Hostinger — PARCIALMENTE FUNCIONAL
- Dominio: `blanchedalmond-otter-337034.hostingersite.com`
- Plan: hosting compartido (solo archivos estáticos)
- Git integración configurada: branch `deploy` → `public_html/`
- Los archivos llegan (index.html + assets/) pero el bundle tiene la `SUPABASE_ANON_KEY` vacía
- FTP usuario: `u941697834` / servidor FTP: bloqueado desde GitHub Actions (puerto 21 timeout)

### Railway — NO INICIADO
- Dockerfile listo en `apps/api/Dockerfile`
- Build: esbuild bundla todo a `dist/index.js`
- URL objetivo: `https://api-bresca.railway.app`

### EAS Build (mobile) — NO INICIADO
- Perfiles configurados en `apps/mobile/eas.json`
- Falta: `eas init` para obtener `EXPO_PUBLIC_PROJECT_ID`

---

## Tareas completadas ✅

### Código
- [x] Auth mobile: email OTP → verify → onboarding (nombre, año, condiciones) → perfil en DB
- [x] Vault mobile: lista con filtros, detalle, upload con mock OCR (3 pasos), delete
- [x] Home mobile: stats + quick actions + estudios recientes
- [x] Copilot mobile: chat con API, rate limit 20 RPH, sin PII
- [x] QR sharing: generar, display, revocar, vista pública médico (`/qr/[token]`)
- [x] Panel CRO web: login, dashboard, pacientes, estudios, matching
- [x] API backend: todos los endpoints (copilot, qr, cro)
- [x] DB: schema completo con RLS en todas las tablas
- [x] Package shared: tipos TypeScript, Result pattern, constantes

### Infraestructura
- [x] Supabase cloud con 3 migraciones aplicadas
- [x] GitHub repo creado y código pusheado
- [x] GitHub Actions workflow creado (build + deploy a Hostinger)
- [x] Hostinger Git integración configurada (branch deploy → public_html)
- [x] Los archivos estáticos llegan a Hostinger correctamente

---

## Tareas pendientes ⏳

### BLOQUEANTE: web-cro en Hostinger
**Problema:** `Uncaught Error: supabaseKey is required` en el browser.  
**Causa raíz:** La variable `VITE_SUPABASE_ANON_KEY` llega vacía al bundle de Vite aunque está definida en el workflow. El hash del bundle `index-CwCUHC3G.js` no cambia entre builds, indicando que el env var nunca se inyecta.

**Diagnóstico:**  
- Puerto 21 (FTP) bloqueado desde GitHub Actions → no se puede usar FTP-Deploy-Action
- GitHub Secrets no llegan al paso de build (motivo desconocido, verificado y recreado)
- Hardcodear el valor en el YAML tampoco funcionó en el último job (el job falló con `cp: cannot stat`)
- La integración Git de Hostinger funciona (pull correcto), el problema es el contenido del bundle

**Alternativas a probar en próxima sesión (en orden de menor a mayor esfuerzo):**

#### Opción A — Build local + subida manual (5 min, sin CI)
1. En terminal: `pnpm --filter=@bresca/web-cro build` (el `.env.production` ya tiene los valores)
2. Comprimir `apps/web-cro/dist/` en zip
3. Subir manualmente via hPanel → File Manager → Upload a `public_html/`
4. Verificar en browser

#### Opción B — Commitear `.env.production` en el repo (la anon key es pública)
1. Quitar `.env.production` del `.gitignore`
2. Commitear `apps/web-cro/.env.production` (tiene SUPABASE_URL, ANON_KEY, API_URL)
3. El workflow de CI buildea sin necesitar env vars externos
4. Push → deploy automático

#### Opción C — Usar Vercel en lugar de Hostinger para web-cro
1. El `vercel.json` ya está configurado correctamente en la raíz
2. Entrar a vercel.com → New Project → importar repo GitHub → agregar env vars en Vercel UI
3. Vercel maneja el build automáticamente con Node.js
4. URL gratuita en vercel.app

#### Opción D — Debug profundo del CI
1. Agregar step en el workflow para verificar que la env var llega: `echo "KEY_LENGTH=${#VITE_SUPABASE_ANON_KEY}"`
2. Si llega vacío → el secret de GitHub tiene algún problema de formato
3. Si llega con contenido → buscar el problema en Vite

---

### Railway (API) — cuando web-cro esté andando
1. Ir a railway.app → New Project → Deploy from GitHub → repo `bresca-app`
2. Root directory: `apps/api`
3. Variables de entorno a configurar:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
   SUPABASE_ANON_KEY=eyJhbGci...PDpEYKQ
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...lFzo
   ANTHROPIC_API_KEY=sk-ant-...   ← completar
   QR_TOKEN_SECRET=               ← generar con: openssl rand -hex 32
   CRO_ALLOWED_EMAILS=brentag@gmail.com
   ```
4. Railway detecta el Dockerfile automáticamente y hace el build

### EAS Build (mobile) — después de Railway
1. Crear cuenta en expo.dev (si no tiene)
2. Correr `eas init` en `apps/mobile/`
3. Agregar el `EXPO_PUBLIC_PROJECT_ID` en `apps/mobile/app.json`
4. `eas build --profile staging --platform android` para primera APK de prueba
5. iOS requiere Apple Developer account ($99/año) — opcional por ahora

### Keys faltantes
- `ANTHROPIC_API_KEY` — obtener de console.anthropic.com para habilitar el Copilot
- `QR_TOKEN_SECRET` — generar con `openssl rand -hex 32`

---

## Archivos clave del proyecto

```
apps/api/src/
  index.ts              — servidor Express, monta routers
  copilot/router.ts     — POST /copilot/chat
  qr/router.ts          — GET|POST|DELETE /qr/:token
  cro/router.ts         — GET /cro/stats|patients|distribution|match
  lib/supabase.ts       — cliente con service role key
  lib/auth.ts           — middleware JWT

apps/mobile/
  app/_layout.tsx       — RouteGuard (auth redirect)
  app/(auth)/           — welcome, email, verify, onboarding/
  app/(app)/            — tabs: index, vault, copilot, family
  app/(app)/vault/      — [id], upload, share, qr
  app/qr/[token].tsx    — vista pública médico (sin auth)
  lib/supabase.ts       — cliente con AsyncStorage

apps/web-cro/src/
  App.tsx               — session state + tab routing
  pages/                — Login, Dashboard, Patients, Studies, Matching
  lib/api.ts            — calls a la API con auth headers

supabase/migrations/    — 3 archivos SQL aplicados en cloud
packages/shared/src/    — Database types, Result pattern, constants
```

---

## Recomendación para retomar

**Arrancar con Opción A o B** — son las más rápidas y evitan el CI completamente para el primer deploy funcional. Una vez que el panel CRO esté visible en el browser, continuar con Railway.
