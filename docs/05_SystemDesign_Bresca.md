# System Design Document
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Autor** | Engineering Lead |
| **Fecha** | Abril 2026 |
| **Horizonte de diseño** | MVP → 100K usuarios |
| **Relacionado con** | ADR-001 a ADR-005, Tech Spec v1.0 |

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
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                                        │
│  ┌──────────────────┐        ┌──────────────────────────────┐  │
│  │  React Native App │        │   React SPA (Vercel Edge)    │  │
│  │  (iOS + Android)  │        │   CRO Panel — B2B            │  │
│  └────────┬─────────┘        └──────────────┬───────────────┘  │
└───────────┼──────────────────────────────────┼─────────────────┘
            │ HTTPS                            │ HTTPS
┌───────────▼──────────────────────────────────▼─────────────────┐
│  API Layer — Node.js + Express (Railway, autoscaling)          │
│  /auth  /upload  /ocr  /copilot  /qr  /consent  /cro          │
└───────────┬──────────────────────────────────┬─────────────────┘
            │                                  │
┌───────────▼──────────┐        ┌──────────────▼───────────────┐
│  Supabase            │        │  External Services            │
│  ├─ PostgreSQL 15    │        │  ├─ Google Document AI (OCR)  │
│  ├─ Auth (anon+email)│        │  ├─ Claude API (Copilot)      │
│  ├─ Storage (buckets)│        │  └─ FCM / APNs (Push)         │
│  └─ Edge Functions   │        └──────────────────────────────┘
│     (async tasks)    │
└──────────────────────┘
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
  → CRO ve PAC-XXXX (md5 del profile_id) con score

CRO envía invitación
  → API traduce PAC-XXXX → profile_id (solo en backend, nunca expuesto)
  → Push notification al paciente
  → CRO no sabe a quién invitó hasta que el paciente acepta

Paciente acepta
  → INSERT consent_audit (layer='therapeutic_area', granted=true)
  → CRO ve estado 'enrolled' en funnel
```

### 3.2 Flujo QR sharing (médico sin registro)

```
1. Paciente selecciona estudios → POST /qr/create
2. API genera token HMAC firmado con QR_TOKEN_SECRET
3. INSERT qr_tokens (token, study_ids, expires_at = now() + 24h)
4. App muestra QR con URL https://bresca.health/qr/{token}

5. Médico abre URL → GET /qr/{token}
6. API verifica: token válido, no revocado, expires_at > now()
7. API retorna solo campos no-PII de los estudios seleccionados
   → study_type, study_date, category, extracted_fields
   → NUNCA: name, birth_date, DNI, profile_id

8. pg_cron job: DELETE FROM qr_tokens WHERE expires_at < now() - INTERVAL '7 days'
```

> ⚠️ El médico ve los estudios del paciente pero nunca su nombre, DNI, ni ningún identificador en la vista QR.

### 3.3 Flujo Copilot (retrieval + API call)

```
1. Usuario envía mensaje al Copilot
2. API genera embedding de la pregunta (text-embedding-3-small)
3. Cosine similarity query en study_embeddings WHERE profile_id = usuario
4. Top-5 estudios más relevantes recuperados
5. Construir prompt:
   system: COPILOT_SYSTEM_PROMPT (constante inmutable)
   user:   <estudios_relevantes>{top5}</estudios_relevantes>
           Pregunta: {mensaje_usuario}
6. POST Claude API → max_tokens: 1024
7. Rate limit check: max 20 queries/usuario/hora
8. Retornar respuesta al usuario
```

---

## 4. Escalabilidad: de MVP a 100K usuarios

| Escala | Cambios de arquitectura requeridos |
|---|---|
| **< 1.000 usuarios (MVP)** | Arquitectura actual. Single Railway instance. Supabase pro. |
| **1.000 – 10.000 usuarios** | PgBouncer activado (incluido en Supabase Pro). Railway autoscaling activo. CDN para archivos de estudios. |
| **10.000 – 100.000 usuarios** | Read replica para queries CRO (separar writes de reads). Particionado de `consent_audit` por `profile_id`. Queue async para OCR (BullMQ o Supabase Queue). |
| **100.000+ usuarios** | Supabase Enterprise. Múltiples regiones (São Paulo + Buenos Aires). Separación write/read DB. Evaluación de Pinecone/Weaviate si pgvector tiene latencia > 200ms. |

### Bottlenecks identificados en el diseño actual

| Componente | Bottleneck potencial | Solución en escala |
|---|---|---|
| OCR pipeline | Google Doc AI tiene rate limits (1000 req/min en plan básico) | Queue con BullMQ + retry con backoff exponencial |
| Copilot | Latencia de embedding + API call acumulada | Cache de embeddings frecuentes. Precomputar en background. |
| Matching CRO | La vista `cro_anonymous_patients` es una query pesada | Materializar la vista con refresh periódico (5 min) |
| `consent_audit` | Tabla crece ilimitadamente | Particionado por `profile_id` hash en v2 |

---

## 5. Observabilidad

| Tipo | Herramienta | Qué se monitorea |
|---|---|---|
| Logs | Railway logs + Supabase logs | Errores API, fallos OCR, latencia de endpoints |
| Errores | Sentry (free tier) | Excepciones no manejadas en API y apps |
| Costos IA | Anthropic Console + alertas | Gasto diario por usuario y total. Alerta si > $50/día |
| DB performance | Supabase Dashboard | Query latency, conexiones activas, slow queries > 1s |
| Uptime | UptimeRobot (free) | Ping cada 5 min a `GET /health` de la API |
| Costos OCR | Google Cloud Console | Uso de Document AI. Alerta si > baseline + 30% |

### Health check endpoint

```typescript
// apps/api/src/routes/health.ts
GET /health → {
  status: 'ok',
  db: 'connected' | 'error',
  storage: 'connected' | 'error',
  timestamp: ISO8601
}
```

---

## 6. Decisiones de seguridad del sistema

| Decisión | Implementación |
|---|---|
| Service role key nunca en cliente | Solo en `apps/api`. Validado en ESLint rule custom. |
| Tokens QR firmados con HMAC | `crypto.createHmac('sha256', QR_TOKEN_SECRET).update(token_id).digest('hex')` |
| Rate limiting del Copilot | Tabla `copilot_rate_limits (profile_id, window_start, count)`. Check antes de cada request. |
| Rotación de API keys | Proceso documentado en Runbook. Mensual para DOCAI y Anthropic. |
| Mínimo de cohorte en CRO | `HAVING count(*) >= 5` en vista anónima. Hardcodeado en migración, no configurable por CRO. |
| CORS en API | Solo `bresca.health`, `*.bresca.health`, y `localhost:*` en desarrollo. |

---

*Relacionado: ADR-001 a ADR-005 | Tech Spec v1.0 | Runbook v1.0*
