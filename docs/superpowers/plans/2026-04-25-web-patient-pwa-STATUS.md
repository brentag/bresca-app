# Bresca `apps/web-patient` PWA — Estado de Desarrollo

**Fecha de última actualización:** 2026-04-25  
**Commit base:** `b886c61` — feat(web-patient): PWA React+Vite completa  
**Branch:** `main`  
**TypeScript:** ✅ Sin errores (`pnpm --filter=@bresca/web-patient typecheck` = 0 errores)

---

## Resumen ejecutivo

El MVP de la PWA B2C está **100% implementado localmente** y corre en `localhost:5174`. El login vía Supabase OTP funciona. Todos los flows de UI están construidos. Lo que falta es exclusivamente **infraestructura de producción**: API deployada, OCR real, y el proyecto Vercel conectado al repo.

---

## Estado por task

| # | Task | Estado | Archivos clave |
|---|---|---|---|
| 1 | Scaffold PWA (Vite, manifest, icons, iOS meta) | ✅ Completo | `apps/web-patient/package.json`, `vite.config.ts`, `index.html`, `public/manifest.json` |
| 2 | Design tokens + global CSS | ✅ Completo | `src/styles/tokens.css`, `src/styles/global.css` |
| 3 | Lib layer (supabase, session, vault, api) | ✅ Completo | `src/lib/*.ts`, `src/lib/session.tsx` |
| 4 | Routing + App.tsx + ProtectedRoute | ✅ Completo | `src/App.tsx`, `src/components/ProtectedRoute.tsx` |
| 5 | Layout + bottom nav (4 tabs) | ✅ Completo | `src/components/Layout.tsx` |
| 6 | Auth: Welcome → Email OTP → Verify | ✅ Completo | `src/pages/auth/*.tsx` |
| 7 | Onboarding: Name → Year → Conditions → Consent | ✅ Completo | `src/pages/onboarding/*.tsx` |
| 8 | Vault: lista, skeleton, filtros, EmptyState | ✅ Completo | `src/pages/app/Vault.tsx`, `src/components/StudyCard.tsx`, `CategoryChip.tsx` |
| 9 | Upload: 3 pasos (cámara → mock OCR → review → save) | ✅ Completo (mock OCR) | `src/pages/app/Upload.tsx` |
| 10 | StudyDetail + QRGenerate + QRView (público) | ✅ Completo | `src/pages/app/StudyDetail.tsx`, `QRGenerate.tsx`, `QRView.tsx` |
| 11 | Copilot: chat IA, auto-scroll, rate limit display | ✅ Completo | `src/pages/app/Copilot.tsx` |
| 12 | Family (placeholder) + Menu (perfil, logout) | ✅ Completo | `src/pages/app/Family.tsx`, `Menu.tsx` |
| 13 | API fixes: extracted_fields allowlist, try/catch Anthropic, CRO fail-closed | ✅ Completo | `apps/api/src/qr/router.ts`, `copilot/router.ts`, `cro/router.ts` |
| 14 | Deploy config: vercel.json con SPA rewrites | ✅ Completo | `apps/web-patient/vercel.json` |

**Post-implementación (este commit):**
- ✅ Responsive fix: removido `max-width: 430px` de `#root` — full width en desktop, acotado en mobile (`≤767px`)

---

## Lo que funciona hoy (localhost:5174)

- [x] Login email OTP via Supabase (envía código al mail)
- [x] Onboarding completo 4 pasos con guardado en `profiles`
- [x] Vault lista estudios desde Supabase, skeleton mientras carga, filtros por categoría
- [x] Upload: cámara trasera en Android/iOS, galería, PDF — sube archivo a Supabase Storage, muestra datos extraídos (mock), guarda en `studies`
- [x] StudyDetail muestra campos extraídos
- [x] QRGenerate: selección de estudios + TTL + QR visual + copy URL
- [x] QRView: vista pública del médico sin auth (consume endpoint `/qr/:token`)
- [x] Copilot: chat UI funcional (requiere API con `ANTHROPIC_API_KEY` corriendo)
- [x] Menu: logout funciona
- [x] PWA instalable en Android (Chrome install prompt automático)
- [x] iOS: meta tags para "Añadir a inicio"

---

## Lo que falta para producción

### 1. Deploy del API (Railway) — BLOQUEANTE

El API (`apps/api`) necesita estar deployado antes de que la PWA sea funcional en producción. Sin él:
- Copilot: no funciona (llamada a Anthropic)
- QRView: no carga estudios (endpoint `/qr/:token`)
- QRGenerate: no genera tokens

**Pasos:**
```bash
# Variables de entorno requeridas en Railway:
SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key — solo en API>
ANTHROPIC_API_KEY=<key de Anthropic>
QR_TOKEN_SECRET=<string aleatorio seguro>
CORS_ORIGIN=https://bresca-patient.vercel.app   # URL del deploy en Vercel
NODE_ENV=production
CRO_ALLOWED_EMAILS=email@cro.com,otro@cro.com   # emails autorizados para panel CRO
```

**Comando de start del API:**
```bash
pnpm --filter=api build && pnpm --filter=api start
```

---

### 2. Deploy web-patient en Vercel — BLOQUEANTE

Crear un **nuevo proyecto** en Vercel (separado del proyecto `web-cro` existente).

**Configuración del proyecto:**
- **Root directory:** `. ` (raíz del monorepo)
- **Build command:** `pnpm --filter=@bresca/web-patient build`
- **Output directory:** `apps/web-patient/dist`
- **Install command:** `pnpm install`
- **Framework:** Other (no framework preset)

**Variables de entorno en Vercel:**
```
VITE_SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (anon key — pública por diseño)
VITE_API_URL=https://[tu-proyecto].railway.app
```

El `vercel.json` en `apps/web-patient/vercel.json` ya tiene las SPA rewrites configuradas.

---

### 3. OCR real — Feature pendiente

El upload hoy usa `mockExtract()` que devuelve datos hardcodeados según categoría. Para activar OCR real:

**Archivo a modificar:** `apps/web-patient/src/pages/app/Upload.tsx`

Reemplazar el bloque mock OCR (líneas ~1290-1303):
```typescript
// ACTUAL (mock):
await new Promise<void>(r => setTimeout(r, 1500));
const extracted = mockExtract(category);
setDraft({ ...extracted, category, storagePath });

// REEMPLAZAR CON (real):
const formData = new FormData();
formData.append('file', file);
formData.append('category', category);
const session = await supabase.auth.getSession();
const res = await fetch(`${BASE}/ocr/extract`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
  body: formData,
});
if (!res.ok) throw new Error('OCR failed');
const extracted = await res.json();
setDraft({ ...extracted, category, storagePath });
```

**Endpoint API a crear:** `apps/api/src/ocr/router.ts`  
Recibe el archivo, lo manda a Google Document AI, devuelve `{ study_type, lab_name, study_date, extracted_fields }`.

**Variables de entorno adicionales en Railway:**
```
GOOGLE_DOCAI_KEY=<API key>
GOOGLE_DOCAI_PROCESSOR_ID=<processor ID>
GOOGLE_DOCAI_PROJECT_ID=<project ID>
```

---

### 4. Supabase — Verificaciones en producción

El proyecto Supabase `mkacuagcvwxoduhdthwg` ya está configurado. Verificar antes del launch:

```sql
-- Verificar que el bucket 'studies' existe y es privado:
SELECT id, public FROM storage.buckets WHERE id = 'studies';
-- Debe retornar: studies | false

-- Verificar RLS activo en todas las tablas:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
-- rowsecurity debe ser TRUE en todas

-- Verificar la vista CRO k-anonymity (fix ya aplicado):
SELECT * FROM cro_anonymous_patients LIMIT 5;
```

**Supabase Auth — configuración requerida:**
- En Dashboard → Auth → URL Configuration:
  - Site URL: `https://bresca-patient.vercel.app`
  - Redirect URLs: `https://bresca-patient.vercel.app/**`
- Esto es necesario para que los magic links y OTP redirijan correctamente en producción.

---

### 5. CORS — fix pendiente (seguridad)

**Archivo:** `apps/api/src/index.ts:13`

Hoy el API usa `origin: process.env.CORS_ORIGIN ?? '*'`. En producción debe setearse explícitamente:

```typescript
// Cambiar de:
origin: process.env.CORS_ORIGIN ?? '*'

// A:
origin: process.env.CORS_ORIGIN?.split(',') ?? (process.env.NODE_ENV === 'production' ? false : '*')
```

Y setear en Railway: `CORS_ORIGIN=https://bresca-patient.vercel.app,https://bresca-cro.vercel.app`

---

## Pendientes de producto (V2)

Estos no bloquean el MVP pero son los siguientes pasos lógicos post-validación:

| Feature | Complejidad | Descripción |
|---|---|---|
| OCR real (Google Document AI) | Media | Reemplazar `mockExtract()` con llamada real al API |
| Family screen | Media | Gestión de perfiles familiares vinculados |
| Centro de consentimiento | Media | UI en Menu → Shield para gestionar consent_audit |
| Push notifications | Alta | Expo/FCM para alertas de estudios nuevos (solo aplica a la app nativa futura) |
| App nativa (React Native) | Alta | Launch de marketing post-validación PWA |
| Rate limit persistente | Media | Reemplazar Map en memoria por Redis para sobrevivir restarts |
| QR library local | Baja | Reemplazar `api.qrserver.com` con `qrcode` npm package |

---

## Estructura de archivos generados

```
apps/web-patient/
├── index.html                          ← iOS meta tags, font link, manifest
├── vite.config.ts                      ← PWA plugin (autoUpdate), alias @/
├── tsconfig.json
├── package.json                        ← @bresca/web-patient v0.0.1
├── vercel.json                         ← SPA rewrites para Vercel
├── .env                                ← Variables locales (no commiteado)
├── .env.example                        ← Template commiteado
├── public/
│   ├── manifest.json                   ← PWA: name, icons, display:standalone
│   └── icons/
│       ├── icon-192.png               ← Logo cuadrado (copiado de Design System)
│       └── icon-512.png
└── src/
    ├── main.tsx                        ← Entry point con StrictMode
    ├── App.tsx                         ← React Router v7, todas las rutas
    ├── env.d.ts                        ← Types para import.meta.env
    ├── styles/
    │   ├── tokens.css                  ← Design System (Space Grotesk, colores, spacing)
    │   └── global.css                  ← Reset, 100dvh, safe-areas, skeleton, responsive
    ├── lib/
    │   ├── supabase.ts                 ← Cliente anon con tipos Database
    │   ├── session.tsx                 ← SessionProvider + useSession hook
    │   ├── useProfile.ts               ← Hook para perfil del usuario autenticado
    │   ├── vault.ts                    ← CATEGORIES, categoryColor, formatStudyDate, mockExtract
    │   └── api.ts                      ← sendCopilotMessage, generateQR, revokeQR, getQRView
    ├── components/
    │   ├── ProtectedRoute.tsx          ← Redirect a /welcome si no hay sesión
    │   ├── Layout.tsx                  ← Wrapper con bottom nav 4 tabs + safe-area
    │   ├── StudyCard.tsx               ← Card + Skeleton (color-coded por categoría)
    │   ├── CategoryChip.tsx            ← Chip toggle ≥44px touch target
    │   └── Spinner.tsx                 ← Spinner + FullPageSpinner
    └── pages/
        ├── auth/
        │   ├── Welcome.tsx             ← Splash con gradient + CTA
        │   ├── Email.tsx               ← Input email → signInWithOtp
        │   └── Verify.tsx              ← Input 6 dígitos → verifyOtp → routing
        ├── onboarding/
        │   ├── _styles.ts              ← Estilos compartidos (wrap, btn, skip, etc.)
        │   ├── ProgressDots.tsx        ← Dots animados (paso activo expandido)
        │   ├── Name.tsx                ← Insert en profiles.display_name
        │   ├── Year.tsx                ← Update profiles.birth_year (opcional)
        │   ├── Conditions.tsx          ← Toggle chips → profiles.conditions
        │   └── ConsentIntro.tsx        ← Explicación investigación → /app/vault
        └── app/
            ├── Vault.tsx               ← Lista estudios, filtros, skeleton x4, EmptyState
            ├── Upload.tsx              ← 3 pasos: source → processing → review → save
            ├── StudyDetail.tsx         ← Detalle con campos extraídos + botón QR
            ├── QRGenerate.tsx          ← Multi-select estudios + TTL + QR image + copy URL
            ├── QRView.tsx              ← Vista médico pública (sin auth, consume /qr/:token)
            ├── Copilot.tsx             ← Chat IA con rate limit display y auto-scroll
            ├── Family.tsx              ← Placeholder "Próximamente"
            └── Menu.tsx                ← Email del usuario, perfil, consentimiento, logout
```

---

## API fixes aplicados (commit b886c61)

| Fix | Archivo | Descripción |
|---|---|---|
| `extracted_fields` allowlist | `apps/api/src/qr/router.ts:103` | Filtra campos contra whitelist de 22 campos clínicos seguros antes de devolver al médico. Previene exposición de campos PII. |
| try/catch Anthropic | `apps/api/src/copilot/router.ts:68` | Envuelve `anthropic.messages.create` en try/catch → responde 503 si la API de Anthropic falla. Antes crasheaba el proceso. |
| CRO fail-closed | `apps/api/src/cro/router.ts:14` | En producción, si `CRO_ALLOWED_EMAILS` está vacío → 403 (antes dejaba pasar a todos). En desarrollo sigue sin restricción. |

---

## Cómo correr localmente

```bash
# Terminal 1 — Supabase local (opcional, usa el proyecto cloud por ahora)
supabase start

# Terminal 2 — API
pnpm --filter=api dev
# Corre en http://localhost:3000

# Terminal 3 — PWA paciente
pnpm --filter=@bresca/web-patient dev
# Corre en http://localhost:5174

# Terminal 4 — Panel CRO (si se necesita)
pnpm --filter=web-cro dev
# Corre en http://localhost:5173
```

**Variables de entorno necesarias en `apps/api/.env` para correr el API local:**
```
SUPABASE_URL=https://mkacuagcvwxoduhdthwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ANTHROPIC_API_KEY=<anthropic key>
QR_TOKEN_SECRET=cualquier-string-secreto-local
NODE_ENV=development
```

---

## Criterios de éxito V1 — Estado

| Criterio | Estado |
|---|---|
| Usuario puede registrarse con email en mobile browser (Android + iOS) | ✅ Implementado |
| Usuario puede subir foto de estudio con cámara del dispositivo | ✅ Implementado (mock OCR) |
| Usuario ve sus estudios en vault, puede filtrar por categoría | ✅ Implementado |
| Usuario puede chatear con Copilot IA sobre sus estudios | ✅ UI lista — requiere API deployada |
| Usuario puede generar QR y el médico puede verlo sin instalar nada | ✅ UI lista — requiere API deployada |
| App instalable en Android (Chrome install prompt) | ✅ Implementado |
| Deploy en Vercel, URL pública, sin App Store | ⏳ Pendiente — vercel.json listo, falta crear proyecto |
