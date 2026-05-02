# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-05-02  
**Estado general:** MVP funcional en producción. Auth, Vault, Consent y OCR deployados. API en Render.com operativa.

---

## Estado de servicios

| Servicio | Estado | URL |
|---|---|---|
| Supabase (DB + Auth + Storage) | ✅ LIVE | mkacuagcvwxoduhdthwg.supabase.co |
| GitHub repo | ✅ LIVE | https://github.com/brentag/bresca-app — branch `main` |
| Vercel web-patient | ✅ LIVE | https://bresca-app-api.vercel.app |
| Render API | ✅ LIVE | https://bresca-api.onrender.com |
| Vercel web-cro | ❌ Pendiente | — |
| EAS Build (mobile) | ❌ No iniciado | — |

---

## Cambios desde checkpoint anterior (2026-04-27)

### Decisiones técnicas que cambiaron vs plan original

| Componente | Plan original | Decisión actual | Motivo |
|---|---|---|---|
| OCR | Google Document AI | Tesseract.js + pdf-parse + DeepSeek | Sin costo, sin API key externa |
| AI Copilot | Anthropic Claude | DeepSeek (`deepseek-chat`) | Créditos disponibles, API OpenAI-compatible |
| Deploy API | Railway | Render.com | Free tier más simple para Express |
| pdf-parse | v2.4.5 | v1.1.1 | v2 usa DOMMatrix (browser API) → crash en Node.js |

### Nuevas features construidas (sesiones 2026-04-30 a 2026-05-02)

- **OCR real** — reemplazó mock completo
  - `apps/api/src/extract/ocr.ts`: Tesseract.js (imágenes) + pdf-parse (PDFs)
  - `apps/api/src/extract/router.ts`: endpoint `POST /extract`
  - Pipeline: Supabase Storage → OCR → DeepSeek estructura → retorna JSON
  - `Upload.tsx`: 3 estados visuales (Subiendo → Leyendo → Analizando con IA)

- **Home screen** — `apps/web-patient/src/pages/app/Home.tsx`
  - Saludo dinámico por hora del día + avatar con iniciales
  - Stats strip con datos reales de Supabase (total estudios / meses / categorías)
  - Banner CRO dismissible → navega a Consent Center
  - Quick actions 2×2 + estudios recientes + empty state

- **Asistente** (rebrand de Copilot)
  - `buildVaultContext()` enriquecido con `extracted_fields` reales
  - Responde preguntas como "¿cuál fue mi última glucemia?"

- **Consent Center** — `apps/web-patient/src/pages/app/ConsentCenter.tsx`
  - Toggle maestro "Investigación médica" (layer: `research`)
  - 6 toggles por área terapéutica (layer: `therapeutic_area`)
  - Escribe a `consent_audit` (append-only, triggers bloquean UPDATE/DELETE)
  - Estado cargado desde DB al montar, con reversión si falla el write

- **ConsentIntro** — ahora escribe a DB
  - "¡Entendido!" → INSERT `{layer: 'research', granted: true}` + navega a `/app/home`
  - "Configurar más tarde" → navega sin escribir (sin consentimiento por defecto)

- **Tab bar** — 5 tabs, Home como pantalla inicial post-login
- **Magic link fix** — `Verify.tsx` detecta `access_token` en hash URL y redirige automáticamente

### Deploy — problemas resueltos

| Problema | Causa | Fix |
|---|---|---|
| Vercel: "No Output Directory named dist" | Turbo detection ignoraba vercel.json | Root Directory → `apps/web-patient`, vercel.json simplificado |
| Vercel: pantalla en blanco | Env vars no cargadas | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL agregadas |
| Auth: magic link → "Cannot GET /" | Supabase Site URL apuntaba a localhost | Site URL actualizado en Supabase dashboard + emailRedirectTo dinámico |
| Auth: pantalla de código en lugar de redirect | Verify.tsx no manejaba token en hash | useEffect + onAuthStateChange agregados |
| Render: ReferenceError DOMMatrix | pdf-parse v2 bundleado por esbuild usa browser APIs | Downgrade a v1.1.1 + marcado external en build.mjs |

---

## Configuración de producción

### Vercel — web-patient
- **Root Directory:** `apps/web-patient`
- **vercel.json activo:** `apps/web-patient/vercel.json`
- **Build Command:** `pnpm run build`
- **Output Directory:** `dist`
- **Env vars:**
  - `VITE_SUPABASE_URL` = https://mkacuagcvwxoduhdthwg.supabase.co
  - `VITE_SUPABASE_ANON_KEY` = (JWT anon key)
  - `VITE_API_URL` = https://bresca-api.onrender.com

### Render — API
- **Build Command:** `pnpm install && pnpm --filter=@bresca/api build`
- **Start Command:** `node apps/api/dist/index.js`
- **Plan:** Free (duerme tras 15min de inactividad)
- **Env vars:** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, QR_TOKEN_SECRET, CORS_ORIGIN

### Supabase Auth — URL Configuration
- **Site URL:** https://bresca-app-api.vercel.app
- **Redirect URLs:** https://bresca-api.onrender.com/**

---

## Último commit deployado

```
081e142 — fix(api): pdf-parse downgrade a v1 + marcar como external en esbuild
```

---

## Pendientes priorizados

1. **Verificar OCR en producción** — probar subida de PDF y ver que extrae campos correctamente
2. **Deploy web-cro** — segundo proyecto en Vercel para el portal B2B
3. **Módulo Familiar** — actualmente placeholder "próximamente"; decidir si implementar para demo con Esteban
4. **Rotar DeepSeek API key** — fue expuesta en historial de chat; rotar en dashboard.deepseek.com
5. **Dominio custom** — si el usuario tiene Hostinger con dominio, configurar en Vercel

---

## Funcionalidades por estado

### ✅ Funcionando en producción
- Login email (magic link + OTP)
- Onboarding completo (4 pasos, escribe a profiles + consent_audit)
- Home screen con stats reales
- Vault: lista, filtros, upload, detalle
- OCR: Tesseract.js + pdf-parse + DeepSeek (pendiente verificar en prod)
- QR: generar, compartir, vista pública médico
- Asistente con contexto real del vault
- Consent Center (toggles por área + escribe a consent_audit)
- Panel CRO: dashboard, pacientes anónimos, matching

### ⚠️ Parcial / pendiente
- Módulo Familiar: placeholder UI
- OCR en imágenes: funcional pero Tesseract puede tener calidad variable

### ❌ No implementado
- Mobile en stores (EAS Build)
- Push notifications
- Matching CRO con fit score real (usa datos mock por ahora)
- Flujo invitación CRO → paciente → consentimiento
