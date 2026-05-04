# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-05-04
**Estado general:** ✅ Todos los servicios core en producción — QA 12/14 PASS

---

## Estado de servicios

| Servicio | Plataforma | URL / Referencia | Estado |
|---|---|---|---|
| DB + Auth + Storage | Supabase | `mkacuagcvwxoduhdthwg` | ✅ LIVE |
| Código fuente | GitHub | repo principal | ✅ LIVE |
| Web B2C (paciente) | Vercel | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| API Backend | Render.com | `https://bresca-api.onrender.com` | ✅ LIVE |
| Web B2B (CRO) | Vercel | — | ⏳ PENDIENTE |

---

## Features deployadas hoy

- **Módulo familiar completo** — Crear perfiles dependientes (hijo/a, padre/madre, etc.), selector para alternar entre perfil propio y familiares, vault aislado por `profile_id`. Migración `20260504095647_family_profiles` aplicada.
- **Multi-foto en upload** — Soporte para subir múltiples páginas por estudio. Se guardan todas en `storage_paths TEXT[]`. La pantalla de detalle las muestra todas.
- **OCR non-blocking** — Al subir un archivo, el frontend navega al Vault inmediatamente sin esperar al OCR. Supabase Realtime actualiza la card cuando el draft cambia a `status='done'` o `status='error'`.
- **QR Generate + lista de QRs activos** — Componente `QRGenerate.tsx` implementado con `react-qr-code`. Incluye selector de estudios, TTL configurable, lista de QRs activos con botón de revocación.
- **Error card en Vault** — Cuando `study_draft.status='error'`, se muestra card roja con CTA "Ingresar datos manualmente" o "Descartar".
- **Páginas de entrada (Landing)** — `Landing.tsx` (B2C) y `LandingCRO.tsx` (B2B) como componentes React standalone para ambas apps.

---

## Commits del día

| Hash | Hora | Descripción |
|---|---|---|
| `6bad579` | 06:50 | feat(family): módulo familiar completo — agregar perfiles + ver vault por familiar |
| `a673ec2` | 06:54 | feat(upload): soporte multi-foto completo — guarda todas las páginas y las muestra en detalle |
| `7459820` | 07:01 | chore(types): regenerar database.types.ts + eliminar casts workaround |
| `7049e2b` | 07:36 | feat(qa): subagente QA post-deploy con Haiku |
| `560ed9d` | 08:00 | feat(qa): Haiku recibe contexto completo del deploy |
| `7309cb7` | 11:02 | feat(landing): páginas de entrada B2C y CRO — componentes React standalone |
| `abaee9b` | 11:02 | docs(qa): plan de pruebas + resultados Orange + checkpoint 05-04 |
| `7c9f799` | 11:12 | fix(ux): QR con react-qr-code + lista de QRs activos + error card en Vault (TS-006/TS-011) |
| `e692672` | 15:07 | fix(qa): corregir 4 falsos positivos en post-deploy QA |
| `b958e53` | 15:17 | fix(qa): URL API corregida a Render + bug double-read body en T11 |
| `b885b1d` | 21:43 | feat(upload): non-blocking OCR — navega al Vault inmediatamente post-enqueue |

---

## QA post-deploy (12/14 ✅)

| ID | Descripción | Resultado | Nota |
|---|---|---|---|
| T01a | Health check web-patient | ⏭ SKIP | `QA_WEB_PATIENT_URL` no configurada en entorno QA |
| T01b | Health check web-cro | ⏭ SKIP | web-cro no deployado aún |
| T01c | Health check API (`/health`) | ✅ PASS | `https://bresca-api.onrender.com/health` |
| T02 | Registro anónimo + JWT válido | ✅ PASS | |
| T03 | RLS — usuario B no ve datos de usuario A | ✅ PASS | |
| T04 | Crear perfil propio | ✅ PASS | |
| T05 | Subir estudio — encolado OCR async | ✅ PASS | |
| T06 | Draft status polling / Realtime | ✅ PASS | |
| T07 | Confirmar estudio (confirmed=true) | ✅ PASS | |
| T08 | Crear perfil familiar | ✅ PASS | |
| T09 | RLS familiar — vault aislado por perfil | ✅ PASS | |
| T10 | Generar QR — endpoint API | ✅ PASS | |
| T11 | Leer QR sin auth (vista médico) | ✅ PASS | |
| T12 | consent_audit append-only (UPDATE/DELETE bloqueado) | ✅ PASS | |

Los 2 SKIPs no son fallas — son entornos no configurados/no deployados aún.

---

## Issues cerrados hoy

| ID | Descripción | Commit | Estado |
|---|---|---|---|
| TS-015 | Family multi-perfil no implementado | `6bad579` | ✅ Resuelto |
| TS-016 | Consentimiento multi-perfil (bloqueado por TS-015) | `6bad579` | ✅ Desbloqueado y verificado |
| TS-011 | QRGenerate.tsx faltante | `7c9f799` | ✅ Resuelto |
| TS-006 | OCR timeout sin UX de error/retry | `7c9f799` + `b885b1d` | ✅ Resuelto |

---

## Pendientes próxima sesión

| Item | Prioridad | Detalle |
|---|---|---|
| TS-023 — patient_hash policy | 🟡 Media | Agregar test que bloquea `patient_hash` como input en endpoints CRO. Riesgo latente, no activo. |
| Configurar `QA_WEB_PATIENT_URL` | 🟠 Alta | Una vez que web-patient tenga URL estable, habilitar T01a en el QA runner. |
| Deploy web-cro | 🟠 Alta | Conectar `apps/web-cro` a Vercel. Habilitar T01b en QA. |

---

## Decisiones técnicas del día

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| OCR non-blocking (navegar al Vault inmediatamente) | Bloquear UI hasta que OCR termine | El OCR puede tardar 10–30s. Bloquear la UI es inaceptable para onboarding. Realtime actualiza la card cuando el draft está listo. |
| `storage_paths TEXT[]` para multi-foto | Una sola columna `storage_path` | Estudios de múltiples páginas son comunes (analíticas, imágenes). La columna legacy `storage_path` se mantiene para retrocompatibilidad. |
| `QA_WEB_PATIENT_URL` como variable de entorno del QA runner | Hardcodear la URL | La URL de Vercel puede variar entre previews y producción. Parametrizar evita falsos negativos. |
