# Checkpoint — 2026-05-07
**Estado general:** ✅ Todos los servicios en producción — QA 12/14 (T01c+T11 cold-start únicamente).

---

## Estado de servicios

| Servicio | Plataforma | URL | Estado |
|---|---|---|---|
| DB + Auth + Storage | Supabase | `mkacuagcvwxoduhdthwg` | ✅ LIVE |
| Web B2C (paciente) | Vercel | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| API Backend | Render.com | `https://bresca-api.onrender.com` | ✅ LIVE |
| Web B2B (CRO) | Vercel | `https://bresca-cro.vercel.app` | ✅ LIVE |

---

## Commits del día

| Hash | Descripción |
|---|---|
| `a10f0bd` | fix(auth): separar flujo Acceder / Crear cuenta en Welcome |
| `d525d0e` | feat(landing): agregar variante B2C UI Kit (Hostinger) al hub de landing |

---

## Cambios implementados

### Fix auth — Acceder vs. Crear cuenta (`a10f0bd`)

**Problema (issue #1):** usuario ya registrado veía el onboarding completo (nombre, año, condiciones) al volver a entrar, porque el flujo de auth no distinguía entre login y registro.

**Solución: dos entry points diferenciados desde Welcome.**

- **`Welcome.tsx`:** reemplaza el único botón "Comenzar →" por dos botones:
  - `"Acceder →"` → navega a `/auth/email` con `state: { mode: 'login' }`
  - `"Crear cuenta"` → navega a `/auth/email` con `state: { mode: 'register' }`

- **`Email.tsx`:**
  - Lee `state.mode` de la location
  - Heading diferenciado: "Accedé a tu cuenta" vs "Creá tu cuenta"
  - Subtext diferenciado según flujo
  - `shouldCreateUser: mode === 'register'` — en modo login, Supabase no crea usuarios nuevos
  - Propaga `mode` al navegar a `/auth/verify`
  - Agrega botón "← Volver" a Welcome

- **`Verify.tsx`:**
  - Lee `state.mode` — preservado a través de todo el flujo
  - `redirectAfterLogin(nav, mode, setError)`:
    - Si tiene perfil → `/app/home` siempre (no importa el modo)
    - Si no tiene perfil + modo `register` → `/onboarding/name`
    - Si no tiene perfil + modo `login` → `/onboarding/name` igual (cuenta incompleta, que la termine)
  - Heading: "Verificá tu email" (register) vs "Revisá tu email" (login)

**El modo viaja como route state:** `Welcome → Email → Verify` — nunca se persiste en localStorage ni DB, solo dura la navegación.

### Landing hub — Variante 05 B2C UI Kit (`d525d0e`)

- Archivo `Design System/ui_kits/b2c/index.html` identificado como la landing ya publicada en Hostinger (`lightsteelblue-gnu-474325.hostingersite.com/b2c/`)
- Copiado a `apps/web-patient/public/landing/landing-b2c-uikit.html` (Vercel) y `Design System/Landing Homes/landing-b2c-uikit.html` (local)
- Card agregada en ambos hubs como **Variante 05 — B2C UI Kit Completa**
- Descripción: hero centrado con phone mockup CSS, feature grid 3 cols, "Cómo funciona" 3 pasos, sección privacidad, CRO teaser dark, footer con 4 columnas, sticky mobile CTA
- No tiene dependencias de assets locales (solo Google Fonts CDN) → funciona en cualquier entorno
- Hub actualizado: **8 variantes** en revisión

---

## GitHub Issues

| # | Título | Estado |
|---|---|---|
| [#1](https://github.com/brentag/bresca-app/issues/1) | bug: usuario registrado ve onboarding al volver a entrar | ✅ Cerrado con `a10f0bd` |

---

## QA post-deploy

| Run | Commit | Resultado | Notas |
|---|---|---|---|
| 2026-05-07 | `a10f0bd` | ⚠️ 12/14 | T01c + T11 cold-start Render (esperado, sin regresiones) |

---

## Decisiones de diseño discutidas (sin implementar)

### A/B testing para landing page
- **Qué se discutió:** elegir 2 variantes del hub y dejarlas activas en prueba A/B para medir cuál convierte más.
- **Conclusión:** no es complejo técnicamente. El split con Vercel Middleware es ~15 líneas sin infraestructura nueva. Lo que requiere cuidado es el **tracking de conversión**: propagar el variant tag hasta el evento de signup en Supabase para poder atribuir correctamente.
- **Estimación:** split solo → 2h; split + tracking de conversión con atribución correcta → ~1 día.
- **Estado:** en backlog — primero elegir las 2 variantes finalistas.

---

## Backlog activo

| Item | Prioridad | Detalle |
|---|---|---|
| **Deploy Edge Function** | 🔴 Alta | `supabase functions deploy process-study-draft --project-ref mkacuagcvwxoduhdthwg` — el fix de `EdgeRuntime.waitUntil` (`55e8577`) no está activo en producción hasta correr esto |
| **Elegir 2 variantes finalistas** | 🟡 Media | De las 8 en `/landing/`, elegir 2 para A/B. Luego implementar split + tracking |
| **A/B testing landing** | 🟡 Media | Vercel Middleware para split aleatorio + propagar variant tag al signup event en Supabase |
| **Bundle size web-cro** | 🟢 Baja | 773kB chunk recharts → `React.lazy` |

---

## Hub de landing — 8 variantes activas

| Variante | Archivo | Descripción |
|---|---|---|
| 01 | `index1.html` | Light, logo texto gradiente, phone derecha |
| 02 | `index2.html` | Ídem 01, fix CDN + links locales |
| 03 | `index3.html` | Dark/navy, accent teal, logo blanco |
| 04 | `index4.html` | Light, logos PNG reales, phone izquierda |
| 05 | `landing-b2c-uikit.html` | **Hostinger** — hero centrado + phone mockup + footer completo |
| V1 | `landing-v1-clinical-trust.html` | Light, Plus Jakarta Sans + Lora, bento asimétrico, GSAP |
| V2 | `landing-v2-human-warm.html` | Crema, Fraunces serif, editorial luxury, grain overlay, GSAP |
| V3 | `landing-v3-tech-forward.html` | OLED dark, Space Grotesk + JetBrains Mono, dashboard mockup, GSAP |

Hub accesible en: `bresca-app-api.vercel.app/landing/`

---

## Log de publicaciones

| Hash | Hora | Descripción |
|---|---|---|
| `ccaa6ff` | 00:xx | docs: checkpoint 2026-05-06 final — upload async + landing hub + GPT Salud |
| `a10f0bd` | ~01:00 | fix(auth): separar flujo Acceder / Crear cuenta en Welcome |
| `d525d0e` | ~01:30 | feat(landing): agregar variante B2C UI Kit (Hostinger) al hub |
