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

### 🔧 En progreso
| Item | Prioridad | Detalle |
|---|---|---|
| Deploy web-cro | 🟠 Alta | Build OK. Falta crear proyecto en Vercel Dashboard (requiere auth browser). |

### 📋 Backlog técnico
| Item | Prioridad | Detalle |
|---|---|---|
| **Responsive desktop — Landing CRO** | 🟡 Media | `LandingCRO.tsx` tiene breakpoints a 900px y 600px. Necesita revisión y rearme del layout desktop: navigation bar con links colapsados, grid de stats, sección hero en pantallas 1440px+. |
| **Responsive desktop — Acceso app** | 🟡 Media | `Login.tsx`: tarjeta 400px fija funciona en desktop pero necesita mejoras para pantallas grandes. `Layout.tsx`: sidebar 220px fija no colapsa en tablet/mobile — agregar menú hamburguesa o sidebar collapsible. |
| **Bundle size web-cro** | 🟢 Baja | Chunk único de 773kB (gzip 225kB) por recharts. Considerar `React.lazy` + `dynamic import()` para las páginas con gráficos. |
| **TS-023 patient_hash policy** | 🟡 Media | Test que verifica que `patient_hash` no es aceptado como input en endpoints `/cro/`. Riesgo latente. |
| **QA T01b web-cro** | 🟠 Alta | Una vez que web-cro tenga URL de Vercel, habilitar en el QA runner. |

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
