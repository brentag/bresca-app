# Bresca — Roadmap post-MVP v2.0

## Contexto

El MVP de Bresca está 100% en producción (2026-05-06) con QA 14/14. Todos los features del PRD original están implementados:
- ✅ F-001 Onboarding, F-002 Health Vault + OCR, F-003 AI Copilot
- ✅ F-004 QR Sharing (+ WhatsApp inline), F-005 Familia, F-006 Consentimiento 3 capas
- ✅ F-007/F-008/F-009 Panel CRO (dashboard, matching anónimo, invitaciones)

Este plan reorganiza el backlog existente más los 4 items nuevos (DICOM, Email-to-Vault, ChatGPT Health handoff, P2P Vault) en un roadmap por fases con orden de dependencias correcto.

---

## Estado de partida (2026-05-06)

| App | URL | Estado |
|---|---|---|
| web-patient | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| api | `https://bresca-api.onrender.com` | ✅ LIVE |
| web-cro | `https://bresca-cro.vercel.app` | ✅ LIVE |
| mobile | — | ❌ No iniciado |

Backlog heredado (pre-existente):
- Etiqueta familiar en Upload (🟡 ~0.5 día)
- QA T01b web-cro en runner (🟡 ~0.5 día)
- Bundle size web-cro: React.lazy en recharts (🟢 ~0.5 día)

---

## Fase 1 — Polish + Deuda técnica (estimado: 1.5 días)
*Objetivo: cerrar pendientes del MVP antes de abrir nuevas features.*

### 1.1 Etiqueta familiar en Upload
- `apps/web-patient/src/pages/Upload.tsx`
- Cuando `?p=<profile_id>` está presente en la URL, mostrar banner: "Subiendo para: [nombre del familiar]"
- Leer `display_name` del perfil desde Supabase o del estado de navegación (`location.state`)
- Sin nuevos endpoints — el `profile_id` ya va en el body del upload

### 1.2 QA T01b en runner
- `scripts/post-deploy-qa.mjs`
- `QA_WEB_CRO_URL` ya está configurada — verificar que T01b pasa como PASS (no SKIP)
- Ajustar condición de skip si sigue fallando

### 1.3 Bundle size web-cro
- `apps/web-cro/src/pages/Dashboard.tsx` (y cualquier página que importe recharts)
- Aplicar `React.lazy` + `Suspense` en las páginas que usan recharts
- Target: bajar el chunk de 773kB a < 200kB

---

## Fase 2 — Email-to-Vault (estimado: 3.5 días)
*Objetivo: habilitar ingesta por el canal más común en LATAM — el email.*

**Por qué va antes que DICOM:** no requiere cambios en el schema de `studies`, reutiliza el pipeline OCR existente completo, y abre un canal de adquisición de datos de alta calidad (PDFs de laboratorio directamente del prestador).

### 2.1 Setup infraestructura email (0.5 día)
- Registrar subdominio MX `estudios.bresca.io` → Cloudflare Email Routing (opción gratuita) o Postmark Inbound
- Configurar routing: `*@estudios.bresca.io` → webhook `POST /api/inbound-email`
- Agregar variable de entorno: `INBOUND_EMAIL_SECRET` para validar origen del webhook

### 2.2 Migración DB: `email_slug` en profiles (0.5 día)
- Nueva migración: `supabase/migrations/YYYYMMDDHHMMSS_add_email_slug.sql`
```sql
ALTER TABLE profiles ADD COLUMN email_slug TEXT UNIQUE;
-- Solo profiles propios (user_id IS NOT NULL) pueden tener slug
-- Constraint: email_slug solo minúsculas, sin espacios, 3-30 chars
CREATE INDEX idx_profiles_email_slug ON profiles(email_slug);
```
- RLS: el usuario puede leer/actualizar su propio `email_slug`
- Generar slug inicial = username del email de auth (si existe), o pedir al usuario en Settings

### 2.3 Endpoint `POST /api/inbound-email` (1 día)
- `apps/api/src/routes/inbound-email.ts`
- Validar firma del webhook (header `X-Webhook-Secret`)
- Extraer `email_slug` del `To:` header → buscar `profile_id` en DB
- Rechazar con 404 si no existe → genera bounce automático
- Por cada adjunto (PDF / imagen):
  - Validar MIME (aceptar solo `application/pdf`, `image/*`)
  - Rechazar si > 25 MB
  - Subir a Supabase Storage en el bucket del perfil
  - Llamar `enqueueExtract()` (mismo helper que Upload) → pipeline OCR existente
- Rate limit: máximo 10 emails/día por slug (tabla `inbound_email_log`)
- El body de texto del email se descarta (no se guarda como nota — MVP)

### 2.4 UI: Settings → "Tu casilla de estudios" (1 día)
- `apps/web-patient/src/pages/Settings.tsx` (o crear sección nueva)
- Mostrar casilla: `{email_slug}@estudios.bresca.io`
- Botón "Copiar" (clipboard API)
- Botón "Regenerar" (genera nuevo slug UUID corto, invalida el anterior)
- Si no tiene slug asignado → formulario para elegirlo
- Badge en StudyCard: origen `"email"` vs `"upload"` (nuevo campo `source` en `studies`)

### 2.5 Badge de origen en Vault (0.5 día)
- Agregar `source TEXT DEFAULT 'upload'` a `studies` y `study_drafts`
- El endpoint inbound-email pasa `source: 'email'` al enqueue
- `StudyCard.tsx` muestra ícono de email cuando `source === 'email'`

---

## Fase 3 — Visualizador DICOM (estimado: 4 días) ✅ IMPLEMENTADO
*Objetivo: completar el vault para que cubra imágenes médicas nativas.*

**Estado:** F3 completo al 2026-05-06. DicomViewer.tsx, DICOM upload, Edge Function process-study-draft con rama DICOM, StudyCard con botón "Ver imagen", GitHub Actions para auto-deploy de Edge Functions.

### 3.1 Edge Function: DICOM metadata extractor ✅
- `supabase/functions/process-study-draft/index.ts` — rama DICOM integrada
- Extrae tags seguros (Modalidad, Parte del cuerpo, Fecha, Descripción, Resolución)
- Descarta todos los tags `(0010,xxxx)` — PII del paciente

### 3.2 Upload handler: detección MIME `.dcm` ✅
- `apps/web-patient/src/pages/app/Upload.tsx` — acepta `.dcm`/`application/dicom`
- `apps/api/src/extract/router.ts` — valida mime_type `application/dicom`

### 3.3 DicomViewer.tsx ✅
- `apps/web-patient/src/components/DicomViewer.tsx` — canvas-based con windowing
- Controles: zoom, Window Center/Width sliders, reset
- Lazy-loaded via `React.lazy`

### 3.4 StudyCard: botón "Ver imagen" ✅
- `apps/web-patient/src/components/StudyCard.tsx` — botón ScanEye para DICOM confirmados

---

## Fase 4 — P2P Vault Transfer (estimado: 3.5 días)
*Objetivo: habilitar transferencia de estudios entre usuarios Bresca.*

**Por qué va aquí:** depende de que el vault esté completo (Fases 1-3). El P2P hace más valioso tener estudios DICOM y de email en el vault — si los podés compartir directamente a tu médico con Bresca, el ecosistema crece.

### 4.1 Migración DB: `vault_transfers` (0.5 día)
- `supabase/migrations/YYYYMMDDHHMMSS_vault_transfers.sql`
```sql
CREATE TABLE vault_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id UUID REFERENCES profiles(id) NOT NULL,
  to_profile_id   UUID REFERENCES profiles(id) NOT NULL,
  study_ids       UUID[] NOT NULL,
  status          TEXT CHECK (status IN ('pending','accepted','rejected','expired'))
                  NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ DEFAULT now() + interval '48 hours',
  accepted_at     TIMESTAMPTZ
);
-- RLS: emisor ve sus envíos, receptor ve los recibidos — nadie más
-- pg_cron: expirar transfers con expires_at < now() y status = 'pending'
```
- `consent_audit` entry se crea **solo** cuando status → `'accepted'`

### 4.2 Endpoints API (1 día)
- `POST /api/vault/transfer` — crea transfer_request
  - Middleware: `requireOwnProfile` (from_profile_id debe ser del usuario autenticado)
  - Body: `{ to_email: string, study_ids: uuid[] }`
  - Busca `to_profile_id` por email del receptor (solo profiles propios, no familiares)
  - Crea `vault_transfers` con status `'pending'`
- `GET /api/vault/transfers/incoming` — lista transfers pendientes para el usuario
- `POST /api/vault/transfer/:id/accept` — receptor acepta
  - Copia los estudios al vault del receptor (INSERT en `studies` con los campos del original)
  - Crea `consent_audit` entry (layer: `'p2p_transfer'`)
  - Actualiza status → `'accepted'`, registra `accepted_at`
- `POST /api/vault/transfer/:id/reject` — receptor rechaza
  - Status → `'rejected'` solamente

### 4.3 UI: Enviar desde StudyCard (0.5 día)
- `apps/web-patient/src/components/StudyCard.tsx`
- Agregar opción "Enviar a usuario Bresca" en el menú de la card
- Modal: input de email + lista de estudios seleccionados → `POST /api/vault/transfer`

### 4.4 UI: Pantalla "Estudios recibidos" (1 día)
- Nueva página `apps/web-patient/src/pages/IncomingTransfers.tsx`
- Lista de transfers pendientes con preview: "Juan Pérez te envió 2 estudios — tipo/fecha"
- Botón "Aceptar" y "Rechazar" por transfer
- Accessible desde Home (badge de notificación si hay pendientes)

### 4.5 Notificación (0.5 día)
- Email de notificación via Supabase `auth.send_email` (o Resend si está configurado) cuando llega un transfer
- Push (mobile): implementar cuando mobile esté listo — el canal ya existe en la arquitectura

---

## Fase 5 — Copilot → ChatGPT Health handoff (estimado: 2 días)
*Objetivo: posicionar Bresca como capa de datos, no como competidor de LLMs especializados.*

**Por qué va al final:** es el feature de menor riesgo técnico y el que más depende de tener un vault rico (estudios DICOM, de email, transferidos). Más datos en el vault = mejor context card.

### 5.1 Endpoint: `POST /api/copilot/context-card` (0.5 día)
- `apps/api/src/copilot/context-card.ts`
- Genera un texto estructurado con los estudios del vault del usuario:
  - Sin PII — solo tipos, fechas, categorías, valores agregados
  - Máximo 500 tokens para que quepa en cualquier chat
  - Formato: "Tengo los siguientes estudios en mi historial médico: [lista]. Mi pregunta es: [pregunta del usuario]"
- Reutiliza la lógica de retrieval del Copilot existente

### 5.2 UI: CTA al final de cada respuesta del Copilot (1 día)
- `apps/web-patient/src/pages/Copilot.tsx` (o componente de chat)
- Después de cada respuesta del Copilot, mostrar un bloque sutil:
  ```
  ¿Querés profundizar con ChatGPT Health?
  [Copiar contexto y abrir →]
  ```
- Click: llama a `POST /api/copilot/context-card` → copia al clipboard → abre `chat.openai.com` en nueva pestaña
- Toggle en Settings: "Mostrar sugerencia de ChatGPT Health" (default: ON, opt-out)

### 5.3 Toggle en Settings (0.5 día)
- `apps/web-patient/src/pages/Settings.tsx`
- `show_chatgpt_health_cta BOOLEAN DEFAULT true` en `profiles` (o en localStorage — MVP)
- Preferencia local en localStorage es suficiente para MVP, sin nueva migración

---

## Fase 6 — Mobile (React Native / Expo) [planificación futura]
*No se estima en este plan — requiere sesión de diseño dedicada.*

Bloqueantes antes de iniciar:
- Apple Developer Account activa
- Google Play Developer Account activa
- Decisión: Expo Go (demo) vs EAS Build (producción)

Features mínimas del MVP mobile:
- Auth (reutiliza Supabase anon sign-in)
- Vault viewer + upload desde cámara
- Copilot
- Push notifications (expo-notifications + FCM/APNs)
- P2P Vault (acepta transfers — UI ya diseñada en Fase 4)

---

## Resumen de esfuerzo

| Fase | Features | Días | Estado |
|---|---|---|---|
| **F1 Polish** | Etiqueta familiar, QA T01b, bundle recharts | 1.5 | 🔜 Pendiente |
| **F2 Email-to-Vault** | Casilla personal, OCR pipeline, Settings UI | 3.5 | 🔜 Pendiente |
| **F3 DICOM** | Edge Function extractor, viewer canvas, StudyCard | 4.0 | ✅ Completo |
| **F4 P2P Vault** | vault_transfers, API endpoints, UI enviar/recibir | 3.5 | 🔜 Pendiente |
| **F5 Copilot handoff** | context-card, CTA UI, Settings toggle | 2.0 | 🔜 Pendiente |
| **Total estimado** | | **~14.5 días** | |

---

## Orden de dependencias

```
F1 (polish)
  └→ F2 (email-to-vault)          -- no deps técnicas en F1, pero cierra deuda antes
       └→ F3 (DICOM) ✅           -- F2 ya maneja el storage path; F3 agrega viewer
            └→ F4 (P2P)          -- vault completo antes de habilitar sharing P2P
                 └→ F5 (handoff) -- más datos en vault = mejor context card
```

F1 y F2 pueden ejecutarse en paralelo si se decide acelerar.

---

## Reglas que aplican a todas las fases

- Toda migración nueva va en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_*.sql`
- RLS policies en la misma migración que la tabla nueva
- Nunca auto-commit de datos extraídos (OCR, DICOM metadata) — siempre `confirmed=true` del usuario
- Ningún dato del vault fluye a CRO sin `consent_audit` verificable
- `MINIMUM_COHORT_SIZE = 5` en todas las vistas CRO
- Post-deploy QA (`node scripts/post-deploy-qa.mjs`) antes de cerrar cada fase

---

## Verificación por fase

- **F1:** `pnpm test` verde + QA 14/14 con T01b como PASS (no SKIP)
- **F2:** enviar email con PDF adjunto a `test@estudios.bresca.io` → aparece en vault como pendiente de confirmación
- **F3:** subir `.dcm` de prueba → StudyCard muestra metadata → click abre viewer con windowing ✅
- **F4:** usuario A envía estudio a usuario B → B ve notificación → acepta → estudio aparece en vault de B → `consent_audit` tiene entry
- **F5:** hacer pregunta al Copilot → aparecer CTA → click copia texto al clipboard y abre chat.openai.com
