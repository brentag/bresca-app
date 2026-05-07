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

### Consentimiento, privacidad y feedback MVT (`4ea20ce` → `65fe589`)

Bloque de 5 commits que implementó el módulo completo de consentimiento y privacidad:

- **`4ea20ce` — feat(db): módulo consentimiento, feedback y privacidad — Fase 1:** migración SQL con tablas `consent_documents`, `consent_audit`, `user_feedback`, RLS policies. `consent_audit` es append-only.
- **`5c0800b` — feat(consent): gateway T&C + pantalla aceptación — Fase 2:** `TermsAcceptance.tsx` — pantalla intermedia entre login/onboarding y la app. Muestra T&C + Política de privacidad. Llama a `accept_terms_and_conditions()` RPC.
- **`8164114` — feat(privacy): Centro de Privacidad — Fase 3:** `PrivacyCenter.tsx` — historial de consentimientos del usuario, exportar datos, opciones de eliminación.
- **`623f6da` — feat(mvt): módulo feedback MVT — Capas A, B y C:** sistema de feedback in-app (NPS, thumbs, abierto). Tres capas: trigger automático, modal overlay, storage en `user_feedback`.
- **`65fe589` — fix(responsive): auditoría mobile — Fase 5:** overflow horizontal en pantallas pequeñas. Ajuste de padding y max-width en componentes críticos.

### Fix perfiles duplicados + T&C desbloqueado (`554e114`)

**Problema raíz:** usuario de desarrollo `4e4f9cda` tenía 4 filas en `profiles` con el mismo `user_id` (artefacto de tests). Supabase `.maybeSingle()` lanza error cuando hay más de una fila → `profile = null` en toda la app.

**Consecuencias:** (1) pantalla T&C bloqueada — botón nunca habilitaba porque `!tcDoc` estaba en el condition de `disabled`; (2) onboarding se mostraba a usuarios registrados aunque ya lo habían completado.

**Fixes aplicados:**
- **`useProfile.ts`:** `.maybeSingle()` → `.order('created_at', { ascending: true }).limit(1)` con acceso `data?.[0]`.
- **`Verify.tsx`:** misma corrección en `redirectAfterLogin` — `.limit(1)` en lugar de `.maybeSingle()`.
- **`TermsAcceptance.tsx`:** removido `!tcDoc` de la condición `disabled` del botón; `tcDoc.id` → `tcDoc?.id ?? null` para no crashear si la query falla.
- **DB cleanup:** eliminados 3 perfiles duplicados vacíos (artefactos de dev); conservado el perfil original `1a5ca3b7` (creado 2026-05-02, tiene 3 estudios + 1 consentimiento).

### CTAs landing hub → `/welcome` (`0129e65`)

Todos los botones del hub de landing apuntaban a destinos incorrectos o no hacían nada:

| Variante | Problema anterior | Fix |
|---|---|---|
| `index1.html` — `index4.html` | `href="#signup"` (scroll interno) | `href="/welcome"` |
| `landing-b2c-uikit.html` | `<button>` sin onclick | JS inline `window.location.href = '/welcome'` |
| `landing-v1-clinical-trust.html` | `handleRegister()` mostraba modal falso ("Cuenta creada!") | `window.location.href = '/welcome'` |
| `landing-v2-human-warm.html` | Ídem V1 — modal falso | `window.location.href = '/welcome'` |
| `landing-v3-tech-forward.html` | `openModal()` abría modal in-page | `window.location.href = '/welcome'` |

### Version badge + fix magic link (`a3a7f52`)

**Version badge** — aparece en cada pantalla publicada para verificar qué código está activo:
- **`vite.config.ts`:** inyecta `__BUILD_VERSION__` desde `VERCEL_GIT_COMMIT_SHA` (en Vercel) o `git rev-parse --short HEAD` (local). También escribe `public/version.json` para páginas HTML estáticas.
- **`vite-env.d.ts`:** declaración TypeScript de `__BUILD_VERSION__`.
- **`Layout.tsx`:** badge 8px monoespacio en esquina top-right del nav, color `#E2E8F0` (casi invisible en fondo blanco).
- **`Landing.tsx`:** versión 9px junto al copyright del footer.
- **`public/landing/index.html`** (hub): `fetch('/version.json')` en runtime → `<p id="build-ver">`.

**Fix magic link** — el link que enviaba Supabase al email abría el browser en un contexto fresco, sin `location.state`. El `mode` (login/register) se perdía y el usuario llegaba siempre al flujo de registro:
- **`Email.tsx`:** `emailRedirectTo` ahora incluye `?mode=${mode}` — el mode viaja codificado en la URL.
- **`Verify.tsx`:** lee `mode` primero de `location.state`, luego de `window.location.search` como fallback — cubre el caso del link en browser fresco.
- **`Verify.tsx`:** `await supabase.auth.getSession()` antes de la query de profiles — flush explícito para garantizar que los headers de auth estén listos cuando `SIGNED_IN` se dispara antes de que RLS propague el contexto.

**⚠️ Paso manual pendiente en Supabase Dashboard:**
Supabase ignora `emailRedirectTo` si la URL no está en la allowlist. Hay que agregar manualmente:
1. Supabase Dashboard → Proyecto `mkacuagcvwxoduhdthwg` → **Authentication → URL Configuration**
2. En **Allowed Redirect URLs** agregar: `https://bresca-app-api.vercel.app/**`
3. Sin este paso, el magic link sigue redirigiendo a la Site URL raíz en lugar de `/auth/verify?mode=...`

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
| **⚠️ Supabase Allowed Redirect URLs** | 🔴 Alta | Dashboard → Auth → URL Configuration → agregar `https://bresca-app-api.vercel.app/**`. Sin esto el magic link ignora `?mode=` y redirige al root. |
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

| `3f1a1bc` | 13:04 | docs: checkpoint 2026-05-07 — auth fix + landing hub 8 variantes + A/B backlog |
| `4ea20ce` | 15:52 | feat(db): módulo consentimiento, feedback y privacidad — Fase 1 |
| `5c0800b` | 15:58 | feat(consent): gateway de T&C + pantalla de aceptación — Fase 2 |
| `8164114` | 16:01 | feat(privacy): Centro de Privacidad — Fase 3 |
| `623f6da` | 16:16 | feat(mvt): módulo de feedback MVT — Capas A, B y C |
| `65fe589` | 16:29 | fix(responsive): auditoría mobile — Fase 5 |
| `554e114` | 17:07 | fix(auth): corregir maybeSingle() con perfiles duplicados + desbloquear T&C |
| `0129e65` | 17:19 | fix(landing): CTAs de variantes redirigen a /welcome en vez de simular registro |
| `a3a7f52` | 18:17 | feat(build): version badge + fix magic link auth redirect |