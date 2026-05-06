# Checkpoint — 2026-05-06
**Estado general:** ✅ Todos los servicios en producción — QA 14/14.

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

| Run | Commit | Resultado |
|---|---|---|
| 2026-05-06 01:53 | `da0e09a` | ✅ 14/14 |
| 2026-05-06 02:05 | `1c9b78b` | ✅ 14/14 |

---

## Backlog activo

| Item | Prioridad | Detalle |
|---|---|---|
| **Etiqueta familiar en Upload** | 🟡 Media | Banner con nombre del familiar cuando `?p=` está presente |
| **QA T01b web-cro runner** | 🟡 Media | Ya pasa como T01b — verificar que el runner lo reporta correctamente |
| **Bundle size web-cro** | 🟢 Baja | 773kB chunk recharts → `React.lazy` |
