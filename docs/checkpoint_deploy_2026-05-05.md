# Checkpoint — 2026-05-05
**Estado general:** ✅ Todos los servicios en producción — web-patient + API + web-cro LIVE.

---

## Estado de servicios

| Servicio | Plataforma | URL | Estado |
|---|---|---|---|
| DB + Auth + Storage | Supabase | `mkacuagcvwxoduhdthwg` | ✅ LIVE |
| Web B2C (paciente) | Vercel | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| API Backend | Render.com | `https://bresca-api.onrender.com` | ✅ LIVE |
| Web B2B (CRO) | Vercel | `https://bresca-cro.vercel.app` | ✅ LIVE |

---

## Deploy web-cro — Instrucciones

El build de `web-cro` compila limpio (`tsc && vite build` → 773kB gzip 225kB, sin errores).
El Vercel CLI no está instalado; crear el proyecto vía **Vercel Dashboard**.

### Pasos (una sola vez)

1. **vercel.com → New Project → Import Git Repository** — mismo repo GitHub
2. **Project Name:** `bresca-cro`
3. **Root Directory:** dejar vacío (usa repo root — igual que web-patient)
4. **Build & Output Settings → Override cada campo:**
   - Build Command: `pnpm --filter=@bresca/web-cro build`
   - Output Directory: `apps/web-cro/dist`
   - Install Command: `pnpm install`
5. **Environment Variables → Add:**
   - `VITE_SUPABASE_URL` = `https://mkacuagcvwxoduhdthwg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (anon key del proyecto, en `.env.production`)
   - `VITE_API_URL` = `https://bresca-api.onrender.com`
6. **Deploy**

Una vez deployado, actualizar `QA_WEB_PATIENT_URL`-equivalente para web-cro en el QA runner (T01b).

> El root `vercel.json` tiene las rewrites de SPA (`/((?!assets|...).*) → /index.html`) que aplican a web-cro también.

---

## Tareas pendientes

### ✅ Completado en esta sesión
| Item | Prioridad | Commit | Detalle |
|---|---|---|---|
| Deploy web-cro | 🟠 Alta | `c435fd3` | Live en `https://bresca-cro.vercel.app` |
| Responsive — LandingCRO | 🟡 Media | `cc96a2d` | Hamburger menu en <900px, overlay full-screen con nav + CTAs |
| Responsive — Login + Layout | 🟡 Media | `cc96a2d` | Login: `maxWidth:400` + padding responsive. Layout: bottom tab bar en <768px |
| TS-023 patient_hash | 🟡 Media | `cc96a2d` | Middleware `rejectPatientHash` en todos los endpoints `/cro/` → 400 si presente |

### 📋 Backlog técnico
| Item | Prioridad | Detalle |
|---|---|---|
| **QA T01b web-cro** | 🟠 Alta | Habilitar health check de web-cro en el QA runner (`https://bresca-cro.vercel.app`). |
| **Bundle size web-cro** | 🟢 Baja | Chunk único de 773kB (gzip 225kB) por recharts. `React.lazy` + `dynamic import()` para páginas con gráficos. |
| **agent-browser** | 🟢 Baja | SKILL.md presente. Pendiente `npm i -g agent-browser && agent-browser install` para testeo browser automatizado. |

---

## Cambios del día

| Cambio | Archivo | Detalle |
|---|---|---|
| Fix rewrite SPA | `apps/web-cro/vercel.json` | Reemplazar `/(.*) → /index.html` por el patrón que excluye assets — mismo que web-patient. |
| Deshabilitar claude-mem hooks | `~/.claude/settings.json` | Worker falló al iniciar; hooks bloqueaban todas las herramientas. Reactivar cuando el plugin esté estable. |

---

## Log de publicaciones (auto-generado)

| Hash | Hora | Descripción |
|---|---|---|
| `663fd26` | 07:49 | chore(deploy): web-cro build verificado + checkpoint 05-05 con pendientes responsive |

| `c435fd3` | 08:20 | feat(deploy): web-cro en producción — https://bresca-cro.vercel.app |
| `cc96a2d` | 10:05 | feat(web-cro): responsive mobile + bloqueo patient_hash (TS-023) |