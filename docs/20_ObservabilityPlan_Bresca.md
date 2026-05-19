# 11 — Observability, Resilience & SRE Plan — Bresca

**Autor:** SRE / Backend Architecture
**Fecha:** 2026-05-09
**Estado:** Propuesta — pendiente revisión técnica
**Audiencia:** dev (1) + Claude Code como co-developer
**Contexto:** MVP en producción (web-patient + api), web-cro pendiente deploy, mobile no iniciado

---

## TL;DR

Plan de observabilidad y resiliencia diseñado para un MVP con un solo dev, presupuesto chico (target < USD 50/mes), y restricciones de privacidad fuertes (PII médica, RLS, consent_audit). Stack propuesto: **Sentry + Axiom + Grafana Cloud Free + UptimeRobot + opossum (circuit breaker) + pino (logs estructurados) + OpenTelemetry**. Rollout en 4 fases (4 semanas), sin refactor mayor.

Lo más importante: **no es un problema de "qué tool meter" sino de qué eventos son críticos para Bresca**. Para nosotros los tres dolores reales son (1) RLS rompiéndose silenciosamente y exponiendo PII, (2) DeepSeek cayéndose y dejando al Copilot/OCR sin servicio, (3) consent_audit no siendo append-only por un bug. Todo el plan se construye alrededor de eso.

---

## 1) Architecture Overview

### Diagrama (en texto)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USUARIOS (Pacientes / CROs)                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│ web-patient  │    │  web-cro     │   │  mobile      │
│ (Vercel)     │    │  (Vercel)    │   │  (Expo)      │
│              │    │              │   │  pendiente   │
│ - Sentry SDK │    │ - Sentry SDK │   └──────────────┘
│ - web-vitals │    │ - web-vitals │
│ - PostHog    │    │ - PostHog    │
└──────┬───────┘    └──────┬───────┘
       │                   │
       │  HTTPS + JWT      │
       ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              apps/api (Node 20 + Express en Render.com)             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Middleware   │→ │ Pino (JSON)  │→ │ Axiom (logs estructurados)│  │
│  │ requestId    │  └──────────────┘  └──────────────────────────┘   │
│  │ userIdHash   │                                                    │
│  └──────┬───────┘  ┌──────────────┐  ┌──────────────────────────┐   │
│         │          │ prom-client  │→ │ Grafana Cloud Free        │   │
│         │          │ (/metrics)   │  │ (Prometheus + Loki+Tempo) │   │
│         │          └──────────────┘  └──────────────────────────┘   │
│         │                                                            │
│         │          ┌──────────────┐                                 │
│         │          │ OTel SDK     │→ Tempo (traces)                 │
│         │          └──────────────┘                                 │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Outbound HTTP wrapper (axios + opossum + retry-axios)        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │   │
│  │  │ DeepSeek    │  │ Supabase    │  │ Otros providers       │ │   │
│  │  │ (chat+OCR)  │  │ (REST/RPC)  │  │ futuros               │ │   │
│  │  │ Circuit Brk │  │ retry only  │  │ Circuit Brk + retry   │ │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────┬────────────────────────────┬──────────────────────────────┘
          │                            │
          ▼                            ▼
┌──────────────────────┐     ┌────────────────────────────────────┐
│ Supabase (PostgreSQL)│     │ DeepSeek API                       │
│ - RLS policies       │     │ - deepseek-chat (Copilot)          │
│ - consent_audit      │     │ - Vision (OCR vía Edge Function)   │
│ - Edge Functions OCR │     └────────────────────────────────────┘
│ - DB metrics export  │
│ - Logs nativos       │
└──────────┬───────────┘
           │
           ▼  (vía pg_stat_statements + supabase_functions_logs)
┌─────────────────────────────────────────────────────────────────────┐
│                  CONTROL PLANE / OBSERVABILITY                      │
│                                                                     │
│  Sentry          → errores frontend+backend, performance traces     │
│  Axiom           → logs estructurados (free 500GB/mes)              │
│  Grafana Cloud   → metrics + traces + dashboards (free tier)        │
│  PostHog Cloud   → analytics de producto (free 1M events/mes)       │
│  UptimeRobot     → black-box probes (free 50 monitors)              │
│  Better Stack    → status page público (free)                       │
│                                                                     │
│  Alerts → Slack #alerts-bresca + email de guardia                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Capas

| Capa | Qué se observa | Tool primaria | Backup/redundancia |
|---|---|---|---|
| **Frontend (web-patient/web-cro)** | errores JS, web-vitals, navegación, eventos producto | Sentry + PostHog | console fallback |
| **Backend (apps/api)** | requests, errores, latencia, dependencias externas | Pino → Axiom + Sentry | logs Render nativos |
| **Edge Functions (Supabase)** | OCR pipeline, jobs async | Supabase Logs Explorer | webhook a Axiom |
| **DB (PostgreSQL)** | slow queries, RLS hits, conexiones | pg_stat_statements + Grafana | Supabase dashboard |
| **External APIs (DeepSeek)** | latencia, errores, costo, tokens | prom-client + Sentry | circuit breaker + cache |
| **Black-box (uptime real)** | probes desde el exterior | UptimeRobot | Better Stack heartbeats |

---

## 2) Observability Strategy

### 2.1 Logs

**Principio:** todo log es JSON estructurado, con `requestId`, `userIdHash` (md5 del user_id real), `route`, `latency_ms`, y `outcome`. Nunca PII en claro.

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'bresca-api',
    env: process.env.NODE_ENV,
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 7),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.email',
      '*.dni',
      '*.phone',
      '*.extracted_fields',  // OCR raw output
      '*.copilot_query',     // queries del usuario al Copilot
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Middleware Express
export const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] ?? crypto.randomUUID()
  const userIdHash = req.user?.id
    ? crypto.createHash('md5').update(req.user.id).digest('hex').slice(0, 12)
    : null
  req.log = logger.child({ requestId, userIdHash, route: req.path })
  res.setHeader('x-request-id', requestId)
  const start = performance.now()
  res.on('finish', () => {
    req.log.info({
      status: res.statusCode,
      latency_ms: Math.round(performance.now() - start),
      method: req.method,
    }, 'request_completed')
  })
  next()
}
```

**Shipping:** Render no tiene egress de logs nativo barato. Solución: agregamos un sidecar liviano usando el [Axiom transport para pino](https://axiom.co/docs/send-data/pino). Costo: free hasta 500GB/mes, sobra para nuestro tráfico.

**Niveles de log:**
- `trace` — solo en dev
- `debug` — desactivado en prod (toggle por env)
- `info` — request completados, jobs ejecutados, eventos de negocio
- `warn` — degradación (DeepSeek lento, retry exitoso, rate limit cerca del límite)
- `error` — fallas que un humano debería revisar (excepción no manejada, RLS violation, circuit breaker abierto)
- `fatal` — proceso a punto de morir (DB unreachable > 30s)

### 2.2 Metrics

**Stack:** `prom-client` en Express → endpoint `/metrics` (autenticado con bearer estático) → Grafana Cloud scrape vía Prometheus remote_write desde un job liviano en GitHub Actions cada 60s, **o** push directo desde el proceso (más simple para Render).

**Métricas obligatorias del MVP:**

```typescript
// apps/api/src/lib/metrics.ts
import { Counter, Histogram, Gauge, register } from 'prom-client'

// HTTP
export const httpRequestsTotal = new Counter({
  name: 'bresca_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
})

export const httpRequestDuration = new Histogram({
  name: 'bresca_http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
})

// DeepSeek (Copilot + OCR)
export const deepseekLatency = new Histogram({
  name: 'bresca_deepseek_latency_seconds',
  help: 'DeepSeek API call latency',
  labelNames: ['operation'], // 'copilot_chat' | 'ocr_vision'
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
})

export const deepseekErrors = new Counter({
  name: 'bresca_deepseek_errors_total',
  labelNames: ['operation', 'error_type'], // timeout|5xx|4xx|circuit_open
})

export const deepseekTokensUsed = new Counter({
  name: 'bresca_deepseek_tokens_total',
  labelNames: ['operation', 'direction'], // prompt|completion
})

// Negocio
export const copilotRateLimitHits = new Counter({
  name: 'bresca_copilot_rate_limit_hits_total',
  help: 'Usuarios que pegaron contra el rate limit (20/h)',
})

export const ocrJobsQueueDepth = new Gauge({
  name: 'bresca_ocr_jobs_queue_depth',
  help: 'study_drafts pendientes de procesamiento',
})

export const ocrProcessingDuration = new Histogram({
  name: 'bresca_ocr_processing_duration_seconds',
  buckets: [5, 10, 20, 30, 60, 120, 300],
})

export const consentAuditAppends = new Counter({
  name: 'bresca_consent_audit_appends_total',
  labelNames: ['type'], // 'grant' | 'revoke' | 'cro_share'
})

// Seguridad — métrica crítica
export const rlsViolationsDetected = new Counter({
  name: 'bresca_rls_violations_total',
  help: 'Cuando una query devuelve datos que no deberían — detectado por checks defensivos',
})

export const qrTokensGenerated = new Counter({
  name: 'bresca_qr_tokens_generated_total',
})

// Circuit breaker
export const circuitBreakerState = new Gauge({
  name: 'bresca_circuit_breaker_state',
  help: '0=closed, 1=half_open, 2=open',
  labelNames: ['provider'],
})
```

**Frontend metrics:** Sentry Performance ya nos da web-vitals (LCP, INP, CLS) y custom transactions. No agregamos otro tool, evitamos el overhead.

### 2.3 Traces (distributed tracing)

OpenTelemetry SDK auto-instrumenta Express, axios y `pg`. Lo exportamos a **Grafana Tempo** (free tier 50GB/mes). Para nuestro tamaño actual no necesitamos sampling agresivo, pero dejamos head sampling al 20% en endpoints high-traffic y 100% en endpoints sensibles (consent, QR, CRO):

```typescript
// apps/api/src/lib/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: { Authorization: `Basic ${process.env.GRAFANA_OTLP_TOKEN}` },
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false }, // ruido
  })],
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.2),
  }),
})

sdk.start()
```

Endpoints sensibles fuerzan sampling 100% con un decorator: `withFullSampling(handler)` que setea el `samplingDecision` en el span padre.

### 2.4 Correlación entre servicios

El header `x-request-id` se propaga desde el frontend (lo genera Sentry o lo generamos nosotros si no hay Sentry). Llega al backend, va al log de pino, va al span OTel, y se devuelve en el response header. Cuando el usuario reporta un bug, le pedimos el request-id (lo mostramos en error pages) y con eso el dev encuentra logs + traces + Sentry event en < 30 segundos.

```typescript
// web-patient/src/lib/api.ts
const requestId = crypto.randomUUID()
fetch(url, { headers: { 'x-request-id': requestId } })
Sentry.setTag('requestId', requestId)
```

---

## 3) Alerting Design

### 3.1 Filosofía

- **Cada alerta debe ser accionable.** Si no podés hacer nada, no es alerta, es métrica de dashboard.
- **Severidad clara.** SEV-1 te despierta, SEV-3 te llega el lunes.
- **Sin alert fatigue.** Si una alerta se repite 5 veces en 24h sin acción, la silenciamos y revisamos el threshold.
- **Anomaly detection liviana.** Para tráfico, comparamos contra baseline de la misma hora hace 7 días (z-score simple en una query Prometheus). No metemos ML.

### 3.2 Catálogo de alertas

| Severidad | Alerta | Condición | Canal | Acción esperada |
|---|---|---|---|---|
| **SEV-1** | RLS violation detectada | `bresca_rls_violations_total` > 0 en 1m | Slack #alerts + SMS | Apagar endpoint, revisar query, postmortem obligatorio |
| **SEV-1** | API down | UptimeRobot 3 fails consecutivos a `/health` | SMS + email | Verificar Render status, rollback si fue deploy |
| **SEV-1** | DB unreachable | `pg_up == 0` por 1m | SMS + email | Supabase status page, escalation |
| **SEV-1** | consent_audit UPDATE/DELETE intentado | Trigger SQL → log → alerta | Slack + email | **Bug crítico de seguridad** |
| **SEV-2** | Error rate alto | rate(http 5xx) / rate(http total) > 5% por 5m | Slack #alerts | Investigar en Sentry, decidir rollback |
| **SEV-2** | DeepSeek circuit breaker abierto | `bresca_circuit_breaker_state{provider="deepseek"} == 2` por > 2m | Slack | Ver provider status, activar fallback de Copilot |
| **SEV-2** | OCR queue backed up | `bresca_ocr_jobs_queue_depth` > 50 por 10m | Slack | Edge Function caída o cuota DeepSeek agotada |
| **SEV-2** | API p99 latency degradado | `histogram_quantile(0.99, …) > 2s` por 10m | Slack | Investigar slow queries, traces |
| **SEV-3** | Rate limit Copilot saturando | `rate(copilot_rate_limit_hits) > 5/min` por 30m | Slack #notifs | Considerar ajustar límite o cache |
| **SEV-3** | Costo DeepSeek mensual > 80% budget | Cron diario, comparado contra USD limit | Email semanal | Optimizar prompts, evaluar cache |
| **SEV-3** | Storage Supabase > 80% | Métrica diaria | Email semanal | Archivar studies viejos, comprar quota |
| **SEV-4** | Web Vitals regresión | LCP p75 > 2.5s en web-patient por 24h | Slack #notifs | Lighthouse en próximo PR |

### 3.3 Anti-fatiga

- **Agrupación:** alertas idénticas se agrupan por 1 hora (Grafana alertmanager `group_by`).
- **Inhibition rules:** si "API down" está activa, suprimimos "p99 alto" y "error rate" — son consecuencia.
- **Mantenimiento programado:** banner en Slack `/maintenance start 30m` silencia SEV-2/3 durante deploys.
- **Review semanal:** los viernes, runbook check — alertas que dispararon, falsos positivos, ajustes.

### 3.4 Escalation

```
SEV-1 → Gabriel (única persona on-call) — SMS + Slack mention
        Si no acknowledge en 10m → email de seguimiento + push a la app
        Si no acknowledge en 30m → status page público pasa a "Investigating"
SEV-2 → Slack #alerts-bresca con @here
SEV-3 → Slack #alerts-notifs sin mention
SEV-4 → Email digest semanal
```

Mientras seamos un solo dev, no tiene sentido un PagerDuty. Cuando entre la 2da persona, sí.

---

## 4) Resilience & Failover

### 4.1 Outbound wrapper unificado

Toda llamada externa pasa por un wrapper que aplica: timeout, retry con jitter, circuit breaker, métricas, logs estructurados. Nada de `axios.get` suelto en el código.

```typescript
// apps/api/src/lib/http-client.ts
import axios, { AxiosRequestConfig } from 'axios'
import CircuitBreaker from 'opossum'
import { deepseekLatency, deepseekErrors, circuitBreakerState } from './metrics'
import { logger } from './logger'

interface ProviderConfig {
  name: string
  timeout: number
  maxRetries: number
  circuitBreaker: { errorThresholdPercentage: number; resetTimeout: number }
}

const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek_chat: {
    name: 'deepseek_chat',
    timeout: 15_000,
    maxRetries: 2,
    circuitBreaker: { errorThresholdPercentage: 50, resetTimeout: 30_000 },
  },
  deepseek_vision: {
    name: 'deepseek_vision',
    timeout: 45_000,
    maxRetries: 1,
    circuitBreaker: { errorThresholdPercentage: 50, resetTimeout: 60_000 },
  },
}

const breakers = new Map<string, CircuitBreaker>()

function getBreaker(provider: string, fn: (cfg: AxiosRequestConfig) => Promise<any>) {
  if (!breakers.has(provider)) {
    const cfg = PROVIDERS[provider]
    const breaker = new CircuitBreaker(fn, {
      timeout: cfg.timeout,
      errorThresholdPercentage: cfg.circuitBreaker.errorThresholdPercentage,
      resetTimeout: cfg.circuitBreaker.resetTimeout,
      rollingCountTimeout: 60_000,
      rollingCountBuckets: 10,
    })
    breaker.on('open', () => {
      circuitBreakerState.set({ provider }, 2)
      logger.warn({ provider }, 'circuit_breaker_opened')
    })
    breaker.on('halfOpen', () => circuitBreakerState.set({ provider }, 1))
    breaker.on('close', () => circuitBreakerState.set({ provider }, 0))
    breakers.set(provider, breaker)
  }
  return breakers.get(provider)!
}

export async function callExternal<T>(
  provider: keyof typeof PROVIDERS,
  config: AxiosRequestConfig,
): Promise<T> {
  const cfg = PROVIDERS[provider]
  const start = performance.now()

  const fn = async (c: AxiosRequestConfig) => {
    let lastErr: any
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        const res = await axios({ ...c, timeout: cfg.timeout })
        return res.data
      } catch (err: any) {
        lastErr = err
        const status = err.response?.status
        if (status && status >= 400 && status < 500 && status !== 429) throw err // no reintentar 4xx no-rate-limit
        if (attempt < cfg.maxRetries) {
          const backoff = Math.min(1000 * 2 ** attempt + Math.random() * 500, 8000)
          await new Promise(r => setTimeout(r, backoff))
        }
      }
    }
    throw lastErr
  }

  try {
    const breaker = getBreaker(provider, fn)
    const data = await breaker.fire(config) as T
    deepseekLatency.observe({ operation: provider }, (performance.now() - start) / 1000)
    return data
  } catch (err: any) {
    const errorType = err.code === 'EOPENBREAKER' ? 'circuit_open'
      : err.code === 'ETIMEDOUT' ? 'timeout'
      : err.response?.status >= 500 ? '5xx'
      : err.response?.status >= 400 ? '4xx' : 'unknown'
    deepseekErrors.inc({ operation: provider, error_type: errorType })
    throw err
  }
}
```

### 4.2 Estrategias por servicio

**DeepSeek Copilot (chat):**
- Circuit breaker abierto → respuesta degradada al usuario: *"El asistente está temporalmente fuera de servicio, podés volver a intentar en 1 minuto."*
- Cache LRU en memoria de las últimas 100 respuestas a prompts idénticos (TTL 1h) — útil para preguntas frecuentes.
- Fallback futuro: cliente OpenAI/Anthropic compatible — el wrapper acepta swap del `provider` por feature flag, sin tocar callers.

**DeepSeek Vision (OCR):**
- Job en `study_drafts` queda en estado `failed_retry` con `attempt_count`.
- pg_cron reintenta cada 5 minutos hasta `attempt_count = 3`.
- Después de 3 fails → estado `failed_manual` y notificación al usuario en la app: *"No pudimos procesar tu documento. Podés cargarlo manualmente o reintentar."*
- Edge Function tiene timeout de 60s, retry exponencial dentro de la función para errores transitorios.

**Supabase:**
- Retry transparente solo para errores de conexión transitorios (network reset, 503 esporádicos). Nunca retry de queries que ya commitearon.
- Read replicas no aplica todavía (free tier).
- Para escrituras críticas (consent_audit), usamos `INSERT ... ON CONFLICT DO NOTHING` con idempotency key, así un retry no duplica.

**Frontend (web-patient/web-cro):**
- Service worker cachea el shell + tokens estáticos.
- React Query con `staleTime: 30s` y `retry: 2` con backoff exponencial.
- Banner de estado: si `/health` devuelve degraded, mostramos *"Servicio con demoras"* en el header.

### 4.3 Detección de degradación

Más allá del circuit breaker, corremos un **synthetic check** cada 60s desde una GitHub Action:

```yaml
# .github/workflows/synthetic-check.yml
name: synthetic-check
on:
  schedule: [{ cron: '*/5 * * * *' }] # cada 5min, gratis
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -m 10 https://bresca-api.onrender.com/health || exit 1
          curl -fsS -m 10 https://bresca-app-api.vercel.app/api/ping || exit 1
      - if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"⚠️ synthetic check fallando"}'
```

Para checks más sofisticados (login real anonymous, crear study_draft) usamos UptimeRobot keyword monitor.

---

## 5) Tooling Recommendations

### Stack recomendado

| Tool | Uso | Costo MVP | Por qué (vs. alternativas) |
|---|---|---|---|
| **Sentry** | errores frontend + backend, performance traces, session replay opcional | Free hasta 5k errores/mes | Estándar de la industria, SDK maduro para React + Node, ya lo conocés. Alternativa OSS: GlitchTip (compatible con SDK Sentry, self-hosted). |
| **Axiom** | logs estructurados centralizados | Free 500GB/mes | Ingest gratis y generoso, query SQL-like, sin vendor lock-in (export a S3). Alternativa: Better Stack Logs (similar), Loki (más DIY). |
| **Grafana Cloud Free** | métricas (Prometheus) + traces (Tempo) + dashboards | Free 10k series + 50GB traces | El paquete más completo gratis. Sin lock-in: si se queda chico, montamos Prometheus self-hosted con la misma config. |
| **PostHog Cloud** | analytics de producto, funnels, session replay | Free 1M events/mes | Es OSS, autohosteable cuando crezca. Privacy-first (podemos hashear identifiers). Alternativa: Plausible (más liviano pero sin funnels). |
| **UptimeRobot** | uptime probes externos | Free 50 monitors / 5min interval | Simple, confiable, multi-región. Alternativa: Better Stack Uptime. |
| **Better Stack Status Page** | status page público para usuarios | Free 1 página | Útil cuando empiece a haber CROs B2B mirando si "está caído". |
| **opossum** | circuit breaker en Node | OSS | Maduro, mantenido por Red Hat. Sin alternativa real en Node. |
| **pino** | logger JSON estructurado | OSS | Más rápido que winston, ecosystem grande, integra con Sentry y Axiom out-of-the-box. |
| **OpenTelemetry SDK** | tracing vendor-agnostic | OSS | Standard CNCF. Cambiamos backend (Tempo→Honeycomb→Datadog) sin tocar código. |
| **prom-client** | exposer Prometheus en Node | OSS | Estándar. |

### Lo que **NO** vamos a meter (todavía)

- ❌ **Datadog/New Relic:** > USD 200/mes mínimo, overkill.
- ❌ **ELK self-hosted:** infra-heavy, requiere ops.
- ❌ **APM full (Dynatrace, etc.):** carísimo.
- ❌ **Service mesh (Istio):** no tenemos microservicios.
- ❌ **Kubernetes:** Render + Vercel hacen el deploy bien.
- ❌ **Custom analytics pipeline:** PostHog cubre todo lo que necesitamos.

### Tabla de costos estimada (mes 1, MVP)

| Item | Costo |
|---|---|
| Sentry Free | USD 0 |
| Axiom Free | USD 0 |
| Grafana Cloud Free | USD 0 |
| PostHog Cloud Free | USD 0 |
| UptimeRobot Free | USD 0 |
| Better Stack Free | USD 0 |
| **Total observabilidad** | **USD 0** |
| Buffer para overage (Sentry events extras) | USD 26 (plan Team si nos pasamos) |

A los 6 meses, con tráfico real, el techo razonable es ~USD 50/mes. Si hay que escalar, Grafana Cloud Pro arranca en USD 49.

---

## 6) Integration Plan (rollout incremental, 4 semanas)

### Fase 0 — Pre-trabajo (medio día)

1. Crear cuentas: Sentry, Axiom, Grafana Cloud, PostHog, UptimeRobot, Better Stack.
2. Guardar tokens en Render dashboard (NO en `.env` commiteado): `SENTRY_DSN`, `AXIOM_TOKEN`, `GRAFANA_OTLP_TOKEN`, `POSTHOG_KEY`.
3. Crear canal Slack `#alerts-bresca` y `#alerts-notifs`.

### Fase 1 — Visibilidad básica (semana 1)

**Goal:** ver errores y logs estructurados sin dolor.

- [ ] Instalar `@sentry/node` + `@sentry/react` en api, web-patient, web-cro.
- [ ] Configurar `pino` + transport a Axiom.
- [ ] Middleware `requestLogger` con requestId + userIdHash.
- [ ] Endpoint `/health` y `/health/deep` (con DB ping y DeepSeek ping).
- [ ] UptimeRobot apuntando a `/health` cada 5min.
- [ ] **Verificación:** romper algo a propósito en preview, ver el error en Sentry con contexto completo. Buscar el requestId en Axiom y matchear.

### Fase 2 — Métricas y dashboards (semana 2)

**Goal:** dashboards "salud del sistema" y "salud de DeepSeek".

- [ ] `prom-client` con métricas de la sección 2.2.
- [ ] Endpoint `/metrics` autenticado (bearer estático en env).
- [ ] Conectar Grafana Cloud Prometheus al endpoint vía remote_write o scrape.
- [ ] Dashboard 1: **Bresca — System Health** (RPS, error rate, p50/p95/p99 por route, DB connections).
- [ ] Dashboard 2: **Bresca — DeepSeek Health** (latency por operation, error rate, tokens consumidos, costo estimado USD/día).
- [ ] Dashboard 3: **Bresca — Producto** (signups/día, vault uploads, copilot queries, QR shares).
- [ ] **Verificación:** mirar dashboards 24h después, validar que las series tienen datos creíbles.

### Fase 3 — Alertas y resiliencia (semana 3)

**Goal:** sistema que avisa solo cuando algo pasa, y se autoprotege de cascadas.

- [ ] Alertas SEV-1 y SEV-2 en Grafana Alerting → Slack webhook.
- [ ] Trigger SQL en `consent_audit` que abortea UPDATE/DELETE y loggea.
- [ ] Wrapper `callExternal()` (sección 4.1) implementado.
- [ ] Migrar todas las llamadas a DeepSeek al wrapper.
- [ ] Cache LRU para Copilot (in-memory, 100 entries, TTL 1h).
- [ ] Cron retry de OCR en Edge Function via pg_cron.
- [ ] Status page Better Stack pública.
- [ ] **Verificación:** simulación de caída de DeepSeek (mock URL inválida), confirmar que (a) circuit breaker abre, (b) usuario ve mensaje degradado, (c) alerta llega a Slack en < 3 min, (d) cuando se recupera, el breaker cierra solo.

### Fase 4 — Tracing, producto, polish (semana 4)

**Goal:** debugging E2E + analytics de producto.

- [ ] OpenTelemetry SDK en api con auto-instrumentation.
- [ ] Tempo configurado, traces visibles en Grafana.
- [ ] PostHog en web-patient + web-cro con eventos del modelo 6.5.
- [ ] Página de error en frontend muestra requestId visible para soporte.
- [ ] Runbook de incidentes (apéndice A) escrito en `docs/06_Runbook_Bresca.md`.
- [ ] Sesión de juego: chaos test manual — 30 min apagando cosas y midiendo MTTR.

### 6.5 — Modelo de eventos de usuario (PostHog)

Schema fijo, naming convention `domain.action.outcome`:

```typescript
// Ejemplos
posthog.capture('auth.signin.success', { method: 'anonymous' })
posthog.capture('vault.upload.started', { mime: 'application/pdf', size_kb: 234 })
posthog.capture('vault.upload.ocr_completed', { latency_ms: 12000, fields_count: 8 })
posthog.capture('copilot.query.sent', { query_length_chars: 124 }) // NO el texto
posthog.capture('copilot.query.rate_limited')
posthog.capture('qr.share.created', { ttl_minutes: 60 })
posthog.capture('family.member.added')
posthog.capture('consent.granted', { study_id_hash: 'md5...' })

// Identificación
posthog.identify(userIdHash, { /* NO email, NO nombre */ })
```

**Privacidad:** PostHog en modo "no autocapture" para que no grabe inputs. Identifier es hash, no UUID real. Disable session replay en production hasta tener consentimiento explícito en T&C.

---

## 7) Trade-offs and Risks

### Trade-offs explícitos

| Decisión | Trade-off |
|---|---|
| Free tiers en todo | Si crecemos rápido (>100k requests/día) hay que migrar partes a paid. Riesgo bajo en el MVP. |
| OpenTelemetry en vez de Sentry-only para traces | Más código upfront, menos lock-in. Vale la pena si en 12 meses cambiamos backend. |
| pino + Axiom en vez de logs nativos Render | Un dependency más, pero queryable y retainable más allá del retention de Render (7 días). |
| Sin self-hosted para arrancar | Menos control, depende de SaaS. Aceptable porque tenemos export en cada tool. |
| Circuit breaker in-process (opossum) | Si tenemos N instancias en Render, cada una tiene su propio breaker — la decisión de "abrir" no se comparte. Para N=1 (hoy) es correcto. Cuando escalemos a N>1, considerar Redis-backed state. |
| Cache LRU en memoria | Misma observación: no compartido entre instancias. Mejor que nada para el MVP. |
| pg_cron para retry OCR | Acopla retry policy a la DB. Más simple que un worker dedicado. Si crece, mover a un worker en Render con BullMQ. |

### Riesgos

1. **Free tier overage en Sentry.** Si un bug genera 50k errors en 1 hora, blow del cuota. **Mitigación:** sample rate del 50% en errores idénticos (`beforeSend` hook con dedup), alerta en `events_sent / day`.

2. **PII filtrándose a logs.** El `redact` de pino ayuda pero no es infalible. **Mitigación:** test unitario que valida que ningún log contiene fields de la allowlist (regex contra DNI, email patterns), gate en CI.

3. **Render single instance.** Si el proceso muere, perdemos métricas in-memory hasta el siguiente push a Prometheus. **Mitigación:** push interval 15s (no scrape), aceptamos hasta 15s de gap.

4. **DeepSeek como single point of failure.** Sin DeepSeek, el Copilot y el OCR no funcionan. **Mitigación corto plazo:** UX degradada explicada al usuario. **Mitigación largo plazo:** wrapper acepta provider switching (OpenAI/Anthropic compatibility) con feature flag.

5. **Costo de DeepSeek explotando.** Un loop bug podría hacer cientos de calls/min. **Mitigación:** rate limit hardcoded por usuario (ya existe), métrica `deepseek_tokens_total` con alerta SEV-3 a USD 80% del budget mensual.

6. **Falta de personal on-call.** Somos 1 dev. **Mitigación:** SEV-1 limitadas a las 4 alertas más críticas (no spam), runbook claro para que un humano que entre nuevo pueda resolver.

7. **Vendor lock-in oculto.** Sentry tiene event format propio. **Mitigación:** logs y metrics son OSS-compatible (pino JSON, Prometheus), traces son OTel — solo Sentry tiene lock-in y es aceptable porque migrar a GlitchTip (compatible con SDK) toma 1 día.

### Lo que NO resuelve este plan

- **Auditoría regulatoria de salud (HIPAA-like).** Esto es un plan de SRE, no de compliance. Cuando entremos a regulación seria habrá que sumar audit logs inmutables y BAA con providers.
- **Disaster recovery completo.** Tenemos backups Supabase nativos pero no tenemos drill de restore. Próximo plan separado.
- **Load testing.** No incluido. Recomendado: k6 contra preview env antes de marketing pushes.

---

## Apéndice A — Runbook básico de incidentes (resumen)

Cuando llega una alerta SEV-1 a tu celular:

1. **ACK** en Slack thread de la alerta.
2. **Status page** → "Investigating".
3. Abrir Grafana dashboard "System Health" + Sentry últimos 30 min.
4. Si fue un deploy reciente (< 1h) → `git revert` + `git push` y rollback en Render dashboard.
5. Buscar requestId del primer error en Axiom + Tempo, sacar la causa.
6. Comunicar en status page cada 30 min hasta resolver.
7. Postmortem en `docs/07_PostMortem_Bresca.md` dentro de 48h (sin culpables, foco en sistema).

---

## Apéndice B — Checklist de validación post-implementación

- [ ] Generar un error 500 a propósito y verlo en Sentry en < 30s.
- [ ] Buscar el requestId en Axiom y encontrar todos los logs relacionados.
- [ ] Encontrar el trace en Tempo desde el span padre.
- [ ] Apagar Render manual, ver alerta SEV-1 en Slack en < 5 min.
- [ ] Mockear DeepSeek con timeout, verificar circuit breaker abre y usuario ve mensaje degradado.
- [ ] Intentar UPDATE en consent_audit, verificar trigger lo bloquea y dispara alerta.
- [ ] Crear evento PostHog y verlo en el dashboard.
- [ ] Lighthouse score web-patient > 85 en mobile.
- [ ] Costo total mensual del stack < USD 10 en MVP, < USD 50 en 6 meses.

---

**Siguiente paso recomendado:** validar este plan en revisión técnica, después abrir issue #observability-phase-1 con la checklist de Fase 1 y arrancar.
