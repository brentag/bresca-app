# System Design Document
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.1 |
| **Autor** | Engineering Lead |
| **Fecha** | Mayo 2026 |
| **Horizonte de diseño** | MVP → 100K usuarios |
| **Relacionado con** | ADR-001 a ADR-006, Tech Spec v1.1 |

---

## 1. Principios de diseño del sistema

- **Privacy by design:** los datos PII nunca viajan fuera del contexto del usuario dueño.
- **Consent as first-class citizen:** ningún dato del vault puede fluir hacia CRO sin `consent_audit` verificable.
- **Fail secure:** si un componente falla, el default es acceso denegado. El sistema nunca falla abierto.
- **Horizontal scalability:** API stateless. El estado vive en Supabase. La API escala en réplicas sin cambios de código.
- **Separation of concerns:** el auth B2C y el auth CRO son sistemas separados. No comparten tokens ni sesiones.

---

## 2. Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients                                                            │
│  ┌──────────────────────┐      ┌──────────────────────────────────┐ │
│  │  React SPA web-patient│      │  React SPA web-cro               │ │
│  │  (Vercel — B2C)       │      │  (Vercel — B2B, pendiente deploy)│ │
│  └──────────┬────────────┘      └──────────────┬───────────────────┘ │
└─────────────┼─────────────────────────────────┼───────────────────┘
              │ HTTPS                            │ HTTPS
┌─────────────▼─────────────────────────────────▼───────────────────┐
│  API Layer — Node.js + Express (Render.com)                        │
│  /extract  /copilot  /qr  /consent  /family  /cro  /health        │
└─────────────┬──────────────────────────────────┬───────────────────┘
              │                                  │
┌─────────────▼──────────────┐   ┌──────────────▼───────────────────┐
│  Supabase                  │   │  External Services                │
│  ├─ PostgreSQL 15          │   │  ├─ DeepSeek Vision (OCR imágenes)│
│  ├─ Auth (anon+email)      │   │  ├─ pdf-parse (OCR PDFs)          │
│  ├─ Storage (buckets)      │   │  ├─ DeepSeek Chat (Copilot)       │
│  ├─ Edge Functions         │   │  └─ FCM / APNs (Push — pendiente) │
│  │   └─ process-study-draft│   └──────────────────────────────────┘
│  ├─ Realtime               │
│  └─ pg_net (triggers async)│
└────────────────────────────┘
```

---

## 3. Flujos críticos de seguridad

### 3.1 Flujo consentimiento → matching CRO

```
Paciente activa consent en app
  → INSERT consent_audit (profile_id, layer='research', granted=true)
  → Vista cro_anonymous_patients se actualiza (Supabase Realtime)

CRO define criterios del estudio
  → Query sobre cro_anonymous_patients (vista anónima, sin PII)
  → PostgreSQL function calcula fit_score (nunca en app CRO)
  → CRO ve patient_hash (md5 del profile_id) con score — NUNCA el UUID real

CRO envía invitación
  → API traduce patient_hash → profile_id (solo en backend, nunca expuesto)
  → Push notification al paciente
  → CRO no sabe a quién invitó hasta que el paciente acepta

Paciente acepta
  → INSERT consent_audit (layer='specific_study', study_id=..., granted=true)
  → CRO ve estado 'enrolled' en funnel
```

### 3.2 Flujo upload de estudio (OCR non-blocking)

```
1. Paciente selecciona archivo(s) en web-patient
2. POST /extract → Storage upload → INSERT study_drafts (status='pending') → 202
3. Frontend navega al Vault INMEDIATAMENTE — sin esperar OCR
4. pg_net trigger → Edge Function process-study-draft (async)
5. Edge Function: DeepSeek Vision (jpg/png) o pdf-parse (pdf) → extracted_fields
6. UPDATE study_drafts SET status='done', extracted_fields={...}
7. Supabase Realtime → frontend actualiza card del draft
8. POST /extract/confirm → study_draft → studies (confirmed=true)
```

### 3.3 Flujo QR sharing (médico sin registro)

```
1. Paciente selecciona estudios → POST /qr/generate
2. API genera token HMAC firmado con QR_TOKEN_SECRET
3. INSERT qr_tokens (token, study_ids, expires_at = now() + ttl)
4. App muestra QR con URL + token

5. Médico abre URL → GET /qr/:token
6. API verifica: token válido, no revocado, expires_at > now()
7. API retorna solo campos no-PII de los estudios seleccionados (SAFE_FIELDS whitelist)
   → study_type, study_date, category, extracted_fields
   → NUNCA: name, birth_date, DNI, profile_id

8. pg_cron job: limpia qr_tokens expirados periódicamente
```

> ⚠️ El médico ve los estudios del paciente pero nunca su nombre, DNI, ni ningún identificador en la vista QR.

### 3.4 Flujo Copilot

```
1. Usuario envía mensaje al Copilot
2. Rate limit check: max 20 queries/usuario/hora
3. Cargar estudios confirmados del perfil (sanitizados — sin PII)
4. Construir prompt:
   system: COPILOT_SYSTEM_PROMPT_V1 (constante inmutable)
   user:   <estudios_relevantes>{estudios}</estudios_relevantes>
           Pregunta: {mensaje_usuario}
5. POST DeepSeek API (deepseek-chat) → max_tokens: 1024
6. Retornar respuesta al usuario
```

---

## 4. Escalabilidad: de MVP a 100K usuarios

| Escala | Cambios de arquitectura requeridos |
|---|---|
| **< 1.000 usuarios (MVP)** | Arquitectura actual. Single Render.com instance. Supabase pro. |
| **1.000 – 10.000 usuarios** | PgBouncer activado (incluido en Supabase Pro). Render.com autoscaling activo. CDN para archivos de estudios. |
| **10.000 – 100.000 usuarios** | Read replica para queries CRO (separar writes de reads). Particionado de `consent_audit` por `profile_id`. Queue async para OCR (BullMQ o Supabase Queue). |
| **100.000+ usuarios** | Supabase Enterprise. Múltiples regiones (São Paulo + Buenos Aires). Separación write/read DB. Evaluación de pgvector vs Pinecone para retrieval semántico. |

### Bottlenecks identificados en el diseño actual

| Componente | Bottleneck potencial | Solución en escala |
|---|---|---|
| OCR pipeline | DeepSeek Vision tiene rate limits por minuto | Queue con retry + backoff exponencial |
| Copilot | Latencia de API call acumulada | Cache de respuestas frecuentes. Precomputar contexto. |
| Matching CRO | La vista `cro_anonymous_patients` es una query pesada | Materializar la vista con refresh periódico (5 min) |
| `consent_audit` | Tabla crece ilimitadamente | Particionado por `profile_id` hash en v2 |

---

## 5. Observabilidad

| Tipo | Herramienta | Qué se monitorea |
|---|---|---|
| Logs | Render.com logs + Supabase logs | Errores API, fallos OCR, latencia de endpoints |
| Errores | Sentry (free tier) | Excepciones no manejadas en API y apps |
| Costos IA | DeepSeek Console + alertas | Gasto diario por servicio (OCR + Copilot). Alerta si > $20/día |
| DB performance | Supabase Dashboard | Query latency, conexiones activas, slow queries > 1s |
| Uptime | UptimeRobot (free) | Ping cada 5 min a `GET /health` de la API |

### Health check endpoint

```typescript
// apps/api/src/health.ts
GET /health → {
  status: 'ok',
  ts: ISO8601
}
```

---

## 6. Decisiones de seguridad del sistema

| Decisión | Implementación |
|---|---|
| Service role key nunca en cliente | Solo en `apps/api/src/lib/supabase.ts`. Validado en code review. |
| Tokens QR firmados con HMAC | `crypto.createHmac('sha256', QR_TOKEN_SECRET).update(token_id).digest('hex')` |
| Rate limiting del Copilot | Tabla `copilot_usage (profile_id, created_at)`. Check antes de cada request. |
| Rotación de API keys | Proceso documentado en Runbook. Mensual para DEEPSEEK_API_KEY. |
| Mínimo de cohorte en CRO | `HAVING count(*) >= 5` en vista anónima. Hardcodeado en migración, no configurable por CRO. |
| patient_hash solo como output | Ningún endpoint `/cro/` acepta `patient_hash` como parámetro de entrada (TS-023). |
| CORS en API | Solo dominios de Vercel configurados + `localhost:*` en desarrollo. |

---

*Relacionado: ADR-001 a ADR-006 | Tech Spec v1.1 | Runbook v1.1*
