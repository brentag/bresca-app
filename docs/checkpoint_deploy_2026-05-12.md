# Checkpoint de Deploy — Bresca MVP
**Fecha:** 2026-05-12

---

## Log de publicaciones

| Hash | Hora | Descripción |
|---|---|---|
| `69af32db` | sesión anterior | feat(copilot): Copilot Consent Gate — disclaimer legal por sesión |
| `fdd5f574` | 22:57 | fix(upload): corregir loop de redirect a onboarding por perfiles duplicados |

---

## Resumen de la sesión

### Bugs resueltos

**1. Upload flow → loop de onboarding** (`fdd5f574`)
- **Causa raíz:** `extract/router.ts` usaba `.single()` que falla con múltiples rows. El bug de redirect de commit `7bc1300` mandaba usuarios a `/onboarding/name`, que hacía INSERT sin verificar existencia → se acumulaban perfiles duplicados con el mismo `user_id`. En la siguiente subida, `.single()` encontraba 2+ rows → error → redirect → nuevo duplicado → loop infinito.
- **Fix código:** `.single()` → `.limit(1).order('created_at',asc).maybeSingle()` en API; redirect a onboarding en Upload reemplazado por mensaje de error; `setLoading(true)` en `useProfile` antes del fetch.
- **Fix DB:** eliminados 2 perfiles Gabriel duplicados (creados el 7/5 y 11/5) + 1 perfil Monica bugueada (11/5 con `owner_user_id = NULL` incorrecto).

**2. Copilot Consent Gate — consent persistente → por sesión** (`69af32db` → ajuste en sesión)
- Cambiado `localStorage` → `sessionStorage`: el disclaimer aparece cada sesión nueva.
- Bresca mantiene visible su posición de no-aval al uso de IA en decisiones médicas.

### QA post-deploy
**14/14 tests pasaron** — reporte: `docs/qa-reports/2026-05-12_01-59_fdd5f574.md`

| ID | Test | Resultado |
|---|---|---|
| T01a | web-patient HTTP 200 | ✅ |
| T01b | web-cro HTTP 200 | ✅ |
| T01c | API /health 200 | ✅ |
| T02 | Auth: crear usuario test | ✅ |
| T03 | Auth: anon key login | ✅ |
| T04 | Perfil: crear con RLS | ✅ |
| T05–T07 | Vault: upload + listado | ✅ |
| T08–T09 | Familia: perfil + vault | ✅ |
| T10 | RLS: aislamiento entre usuarios | ✅ |
| T11 | QR: token válido | ✅ |
| T12 | consent_audit append-only | ✅ |

### Estado de la DB (brentag@gmail.com)
- Perfiles activos: **Gabriel** (`1a5ca3b7`, principal) + Monica, Ce, Pepo (familia)
- Estudios: 0 (limpiados para retesting)
- Perfiles duplicados eliminados: 3

### Pendientes para próxima sesión
- Agregar `UNIQUE(user_id) WHERE user_id IS NOT NULL` en tabla `profiles` (migración preventiva)
- Testear upload PDF end-to-end en producción con el fix deployado
- Decidir si avanzar con mejoras funcionales o infra (Render Starter, dominio)

---

## Estado de servicios

| Servicio | URL | Estado |
|---|---|---|
| Web B2C | `https://bresca-app-api.vercel.app` | ✅ LIVE |
| Web B2B (CRO) | `https://bresca-cro.vercel.app` | ✅ LIVE |
| API Backend | `https://bresca-api.onrender.com` | ✅ LIVE (free tier) |
| DB + Auth | Supabase `mkacuagcvwxoduhdthwg` | ✅ LIVE |
