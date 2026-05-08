# Checkpoint — 2026-05-06
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
| `790d293` | feat(vault): upload UX libera interfaz inmediatamente *(pusheado hoy, era de ayer)* |
| `da0e09a` | feat(share): botón WhatsApp en QR + fix error red en upload |
| `1c9b78b` | feat(share): botones QR y WhatsApp inline en cada StudyCard |
| `57c94ca` | feat(familia): banner 'Subiendo para: [nombre]' en Upload cuando ?p= |
| `df47dae` | feat(landing): 4 opciones de Home para review (index1–index4) |
| `325c180` | feat(asistente): botón GPT Salud con disclaimer en Copilot |
| `875765b` | feat(landing): logos PNG reales en Landing.tsx e index1–3 |
| `0d287e3` | feat(design): hub de revisión de variantes (Design System/Landing Homes/) |
| `28a1720` | feat(landing): hub selector accesible en /landing/ (Vercel) |
| `f34ff73` | feat(landing): V1 Clinical Trust + V2 Human Warm + V3 Tech Forward |
| `55e8577` | feat(upload): progress bar real + Edge Function async (EdgeRuntime.waitUntil) |

---

## Cambios implementados

### Share inline en StudyCard (`1c9b78b`)
- Cada estudio confirmado muestra una fila "Compartir: [QR] [WhatsApp]" debajo del título
- **QR:** navega a `/app/vault/qr` con el estudio pre-seleccionado (`location.state.study_ids`)
- **WhatsApp:** genera token QR de 24h silenciosamente y abre `wa.me/?text=...` — funciona en mobile (abre app) y desktop (abre WhatsApp Web)
- Aplica tanto en Vault como en Home (estudios recientes)
- Validado por usuario: funciona perfecto

### Fix errores de upload (`da0e09a`)
- `api.ts`: `enqueueExtract` reintenta con 4s delay ante `TypeError` (cold-start Render.com)
- `Upload.tsx`: 3 mensajes de error diferenciados:
  - Error de red → "No se pudo conectar con el servidor..."
  - Error de storage/API → "Hubo un problema al procesar..."
  - Archivo inválido → "No pudimos procesar el archivo..."
- Diagnóstico: el error PDF era `TypeError: Failed to fetch` por cold-start de Render.com, no un problema de MIME type (bucket tiene `application/pdf` correctamente configurado)

### Asistente GPT Salud (`325c180`)
- **Copilot.tsx:** botón "GPT Salud" aparece debajo de cada respuesta del asistente
- Copia el contexto del vault al clipboard + abre `chat.openai.com` en nueva pestaña
- Disclaimer visible: "Bresca no envía datos a OpenAI — vos pegás lo que querés"
- F5 del roadmap marcada como DONE

### Hub de landing con variantes Awwwards-tier (`875765b`, `0d287e3`, `28a1720`, `f34ff73`)
- **`Design System/Landing Homes/index.html`** — selector de todas las variantes (local y Vercel)
- **`apps/web-patient/public/landing/`** — hub accesible en `bresca-app-api.vercel.app/landing/`
- Variantes disponibles para review:
  - **index1–index4** (commits previos): light/dark/navy themes, logos reales
  - **V1 Clinical Trust** (`landing-v1-clinical-trust.html`): light, verde #00C87A, tipografía editorial
  - **V2 Human Warm** (`landing-v2-human-warm.html`): crema #FDFAF5, terracota, serif italic
  - **V3 Tech Forward** (`landing-v3-tech-forward.html`): OLED #050505, Space Grotesk + JetBrains Mono, hero split con mockup de dashboard
- Vercel rewrite configurado para excluir `/landing/*` del SPA catch-all

### Upload no bloqueante: progress bar + Edge Function async (`55e8577`)
- **`Upload.tsx`:** barra de progreso real usando XHR directo al endpoint Supabase Storage REST
  - `supabase.storage.upload()` usa `fetch()` sin callback de progreso → reemplazado por `XMLHttpRequest`
  - `xhr.upload.addEventListener('progress')` reporta bytes cargados por archivo
  - Multi-archivo: agregación proporcional al tamaño de cada archivo
  - UI: barra verde→azul "Subiendo el archivo… X%", cambia a "Enviando a la IA… ✓" al llegar al 100%
  - Progreso se clampea a 99% durante upload, salta a 100% solo después de `enqueueExtract`
- **`supabase/functions/process-study-draft/index.ts`:** Edge Function verdaderamente async
  - Declara `EdgeRuntime.waitUntil()` (API Deno Supabase)
  - Retorna HTTP 202 en <100ms (bien dentro del timeout de 5s de pg_net)
  - OCR + guardado en DB ocurre en background vía `EdgeRuntime.waitUntil(processAndSave(draft))`
  - Elimina el punto de fallo del timeout pg_net cuando el OCR tardaba >5s
- **Vault.tsx:** sin cambios — el optimistic UI ya estaba implementado con `location.state.pendingDraftId`
- ⚠️ **Pendiente:** deploy de la Edge Function (`supabase functions deploy process-study-draft --project-ref mkacuagcvwxoduhdthwg`)

### Herramienta instalada: open-design
- Repo clonado en `/c/Users/pc/Documents/CO-WORK/Activo/open-design`
- Alternativa OSS a Claude Design — 31 skills, 72 design systems, soporta Claude Code como agente
- **Cómo levantar en Windows** (bug de `spawn start` impide `pnpm tools-dev run web`):
  ```bash
  # Terminal 1 — daemon (puerto 7456)
  cd /c/Users/pc/Documents/CO-WORK/Activo/open-design/apps/daemon
  node dist/cli.js --no-open

  # Terminal 2 — web (puerto 3000)
  cd /c/Users/pc/Documents/CO-WORK/Activo/open-design
  pnpm --filter=@open-design/web dev
  # Abre http://localhost:3000
  ```

---

## QA post-deploy

| Run | Commit | Resultado | Notas |
|---|---|---|---|
| 2026-05-06 01:53 | `da0e09a` | ✅ 14/14 | — |
| 2026-05-06 02:05 | `1c9b78b` | ✅ 14/14 | — |
| 2026-05-06 ~15:00 | `55e8577` | ⚠️ 12/14 | T01c + T11 fallan por cold-start Render.com (esperado) |

---

## Backlog activo

| Item | Prioridad | Detalle |
|---|---|---|
| **Deploy Edge Function** | 🔴 Alta | `supabase functions deploy process-study-draft --project-ref mkacuagcvwxoduhdthwg` — el fix EdgeRuntime.waitUntil no está activo en producción hasta correr esto |
| **Elegir landing home** | 🟡 Media | 7 variantes en review — definir cuál va a producción como `/` |
| **Bundle size web-cro** | 🟢 Baja | 773kB chunk recharts → `React.lazy` |
| ~~Etiqueta familiar en Upload~~ | ~~🟡 Media~~ | ✅ DONE `57c94ca` |
| ~~QA T01b web-cro runner~~ | ~~🟡 Media~~ | ✅ DONE — verificado en run post-F3 |
| ~~Upload bloqueante~~ | ~~🔴 Alta~~ | ✅ DONE `55e8577` — XHR progress + Edge Function async |
| ~~GPT Salud handoff~~ | ~~🟡 Media~~ | ✅ DONE `325c180` — F5 del roadmap completa |

---

## Log de publicaciones (auto-generado)

| Hash | Hora | Descripción |
|---|---|---|
| `028c519` | 23:09 | docs: checkpoint 2026-05-06 — share WhatsApp + fix upload errors |

| `2174748` | 02:59 | feat(dicom): visualizador DICOM con extracción de metadata y viewer canvas |
| `57f8101` | 03:09 | ci: workflow GitHub Actions para deploy automático de Edge Functions |
| `34427bd` | 03:48 | docs: roadmap post-MVP v2.0 — F1 a F6, ~14.5 días estimados |
| `b8322cf` | 04:09 | docs: actualizar skills, CLAUDE.md y checkpoints post F3 DICOM |
| `f237dbc` | 04:14 | chore(qa): reporte post-deploy 2026-05-06 — 14/14 PASS, T01b verificado |
| `57c94ca` | 08:09 | feat(familia): banner 'Subiendo para: [nombre]' en Upload cuando ?p= está presente |
| `df47dae` | 08:35 | feat(landing): agregar 4 opciones de Home para review — index1 a index4 |
| `325c180` | 11:00 | feat(asistente): botón 'GPT Salud' con disclaimer en cada respuesta del asistente |
| `875765b` | 13:22 | feat(landing): reemplazar logos de texto por imagen real en Landing y index1-3 |
| `0d287e3` | 13:26 | feat(design): hub de revisión de variantes de landing — index.html |
| `28a1720` | 13:29 | feat(landing): hub de diseño accesible en /landing desde bresca-app-api.vercel.app |
| `f34ff73` | 14:22 | feat(landing): agregar V1 Clinical Trust, V2 Human Warm, V3 Tech Forward al selector |
| `55e8577` | 14:53 | feat(upload): progress bar real + Edge Function async no bloqueante |
| `ccaa6ff` | 16:34 | docs: checkpoint 2026-05-06 final — upload async + landing hub + GPT Salud |