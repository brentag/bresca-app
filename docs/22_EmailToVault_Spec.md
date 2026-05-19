---
tags: [módulo, email, vault, api, inbound, postmark, ocr]
created: 2026-05-18
---

# 22 — Email-to-Vault — Especificación del módulo

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | `IMPLEMENTED — flag off` |
| **Fecha** | 2026-05-18 |
| **Migración** | `supabase/migrations/20260518120000_email_to_vault.sql` |
| **Commit** | `986d0c9e` — feat(email-to-vault): módulo completo de recepción de estudios por email |
| **Relacionado con** | [[CLAUDE]] · [[04_TechSpec_Bresca|Tech Spec]] · [[05_SystemDesign_Bresca|System Design]] · [[11_Roadmap_PostMVP|Roadmap Fase 2]] · [[14_Security_Audit_2026-05-07|Auditoría Seguridad]] |

---

## 1. Propósito

Permitir que un usuario reenvíe un email con un resultado de laboratorio (PDF, JPG, PNG, WebP, GIF, DICOM) a una casilla pública de Bresca, y que el archivo aparezca en su `Vault` como un `study_draft` listo para confirmar — sin abrir la app.

Cubre el canal de ingesta más natural en LATAM: los laboratorios envían PDFs por mail al paciente, y el paciente quiere reenviarlos a un único lugar de consolidación. Reutiliza al 100% el pipeline OCR existente (Edge Function `process-study-draft`) — no duplica lógica de extracción ni de sanitización.

Es la primera entrega de la **Fase 2 del Roadmap Post-MVP** ([[11_Roadmap_PostMVP]]) y antecede a DICOM nativo en mobile y a P2P Vault Transfer (Fase 4).

## 2. Arquitectura

```
Usuario reenvía mail → estudios@<dominio configurado en Postmark>
                                │
                                ▼
                    Postmark Inbound Server
                                │
                                │  (HTTPS POST JSON con Attachments base64
                                │   y Authorization: Bearer <secret>)
                                ▼
              POST https://bresca-api.onrender.com/inbound-email
                                │
                                ▼
   apps/api/src/inbound-email/router.ts
        │
        ├── validator.ts        — Bearer auth (timingSafeEqual)
        │                          + lookup user por From + rate limit DB
        ├── parser.ts           — parseAttachments (magic bytes)
        │                          + parseLinks (scoring médico LATAM)
        ├── downloader.ts       — SSRF + DNS rebinding + Content-Length
        ├── enqueuer.ts         — Storage upload + INSERT study_drafts
        │                          (source='email')
        │
        └── inbound_email_log   — métricas + status + rate limit
                                │
                                ▼
                study_drafts.INSERT trigger pg_net
                                │
                                ▼
              Edge Function process-study-draft (Deno)
                                │  (DeepSeek Vision · pdf-parse · DICOM)
                                ▼
                      study_drafts.status = 'completed'
                                │
                                ▼
                Usuario abre Vault → confirma → studies INSERT
```

Todos los archivos del módulo viven en `apps/api/src/inbound-email/`:
- `router.ts` — endpoint y orquestación (200 lines)
- `validator.ts` — auth + user lookup + rate limit (80 lines)
- `parser.ts` — magic bytes + link scoring (115 lines)
- `downloader.ts` — anti-SSRF + descarga con límites (96 lines)
- `enqueuer.ts` — upload + INSERT study_draft (63 lines)
- `types.ts` — tipos compartidos

## 3. Flujo completo (paso a paso)

1. **Postmark recibe el mail** en `mx.postmarkapp.com` para el dominio configurado.
2. **Postmark POSTea** el payload JSON al webhook con `Authorization: Bearer <POSTMARK_INBOUND_SECRET>`.
3. **Feature flag check** — si `INBOUND_EMAIL_ENABLED !== 'true'` → 503 inmediato.
4. **Auth check** — `validatePostmarkAuth(authHeader)` compara el bearer en tiempo constante (`timingSafeEqual`). Si falla → 401.
5. **Crear log inicial** — INSERT en `inbound_email_log` con `from_email`, `to_address`, `subject`, `status='queued'`, `source_ip`.
6. **Lookup user** — `lookupUserByEmail(from)` llama a la RPC `get_user_id_by_email` (SECURITY DEFINER) que mira `auth.users.email` case-insensitive. Si no existe → `rejection_reason='unknown_sender'`, 200 OK.
7. **Lookup profile propio** — `getOwnProfile(userId)` busca el profile más viejo con `owner_user_id IS NULL` (siempre el self-profile, no familiar). Si no existe → `rejection_reason='no_profile'`.
8. **Rate limit** — `checkRateLimit(userId)` cuenta filas en `inbound_email_log` del usuario en las últimas 24 h donde `status != 'rejected'`. Límite `INBOUND_EMAIL_MAX_PER_DAY` (default 10). Si excede → `rejection_reason='rate_limited'`.
9. **Status → processing** — UPDATE `inbound_email_log` con `user_id`.
10. **emitEvent('email_inbound_start', 'api', profileId)** — métrica fire-and-forget.
11. **Parsear adjuntos** — `parseAttachments(payload)` itera `payload.Attachments`:
    - Filtra por `ContentLength <= MAX_SIZE_BYTES` (25 MB default).
    - Verifica que el declared MIME esté en `ALLOWED_MIMES` o sea `application/octet-stream`.
    - Decodifica base64 → `Buffer`.
    - **Verifica magic bytes** con `detectMimeFromBuffer`. Si no reconoce → descarta.
    - Toma máximo `MAX_FILES_PER_EMAIL = 10`.
12. **Si no hay adjuntos** — `parseLinks(payload)` extrae URLs del HTML body y el text body, scoring por keywords médicos LATAM (resultado, informe, laboratorio, estudio, .com.ar, .com.br, etc.). Excluye unsubscribe/tracking/redes sociales. Devuelve top-5.
13. **Descarga links** — para cada link (hasta `MAX_LINKS_TO_TRY = 3`), `isSafeUrl` filtra protocolos/IPs privadas/hosts bloqueados, luego `downloadFile`:
    - Verifica DNS resolution con `dnsLookup({ all: true })` y rechaza si alguna IP es privada (anti-rebinding).
    - `fetch` con `AbortController` (timeout 15s) y `User-Agent: Bresca-EmailBot/1.0`.
    - Lee con `ReadableStream` y cancela si excede `MAX_SIZE_BYTES`.
    - Re-detecta MIME con magic bytes — descarta si no reconoce.
14. **Si no hay archivos procesables** → `rejection_reason='no_content'`, 200 OK con `drafts: 0`.
15. **Upload + enqueue por cada archivo** — `enqueueFileForOCR`:
    - Storage path: `{userId}/{randomUUID()}{ext}` en bucket `studies`.
    - INSERT `study_drafts` con `source='email'`, `storage_path`, `storage_paths`, `mime_type`, `status='pending'`.
    - Si falla el INSERT, intenta limpiar el archivo de Storage.
    - El trigger `pg_net` en `study_drafts` dispara la Edge Function OCR automáticamente.
16. **UPDATE final del log** — `status='completed'`, `draft_ids`, métricas de duración.
17. **emitEvent('email_inbound_complete', 'api', profileId, { count })**.
18. **Response 200** — `{ received: true, drafts: N }`. Postmark no reintenta.

Cualquier excepción inesperada → catch → `failLog` + `emitEvent('email_inbound_failed')` + 200 OK (nunca 5xx al webhook).

## 4. Infraestructura (DNS, Postmark, MX)

Activación pendiente de configurar en producción. Tres dominios candidatos:
- **`estudios.bresca.io`** — subdominio dedicado, no rompe el mail principal `@bresca.io`. Recomendado.
- **`mail.bresca.io`** — similar, alternativa de naming.
- **`bresca.io` raíz** — desaconsejado, mezcla el mail transaccional Supabase Auth con la ingesta.

Pasos en Postmark:
1. Crear Server "Bresca Inbound" en `https://postmarkapp.com`.
2. Configurar Inbound Stream → asignar dominio `estudios.bresca.io`.
3. Copiar MX records al DNS provider (Cloudflare / Google Domains):
   - `estudios.bresca.io. MX 10 inbound.postmarkapp.com.`
4. Configurar Inbound Webhook URL: `https://bresca-api.onrender.com/inbound-email`.
5. Configurar Inbound HTTP Auth (Bearer token) — guardar el secret como `POSTMARK_INBOUND_SECRET` en Render.

Verificación: enviar mail a cualquier `*@estudios.bresca.io` desde un usuario registrado en Bresca con un PDF adjunto. Verificar en Dashboard Postmark que el webhook responde 200 y en `inbound_email_log` que aparece `status='completed'` con `draft_ids` no vacío.

## 5. Seguridad

### 5.1 Validación de webhook
- `Authorization: Bearer <POSTMARK_INBOUND_SECRET>` comparado con `crypto.timingSafeEqual` (anti-timing-attack).
- Adicionalmente disponible `validateHmacSignature(rawBody, signature, secret)` para futuras integraciones que firmen el body.

### 5.2 SSRF y DNS rebinding
- `isSafeUrl` rechaza:
  - Protocolos != http/https
  - Hosts en `BLOCKED_HOSTS` (`localhost`, `metadata.google.internal`, `metadata`)
  - TLDs en `BLOCKED_TLDS` (`.local`, `.internal`, `.localhost`, `.localdomain`)
  - IPs en rangos privados (RFC 1918, loopback, link-local, metadata cloud, IPv6 ULA / link-local)
- `isDnsResolutionSafe` resuelve el hostname con `dnsLookup({ all: true })` y rechaza si **cualquier** IP devuelta cae en un rango privado — protege contra DNS rebinding (dominio público que resuelve a IP interna).

### 5.3 Validación de archivos
- **Magic bytes obligatorio** — `detectMimeFromBuffer` verifica:
  - PDF: `%PDF` (0x25 0x50 0x44 0x46)
  - JPEG: `FF D8`
  - PNG: `89 50 4E 47`
  - GIF: `GIF8`
  - WebP: `RIFF` + `WEBP` en offsets 0 y 8
  - DICOM: `DICM` en offset 128
- Content-Type del remitente NUNCA se confía — solo se usa como filtro inicial barato.

### 5.4 Rate limit en DB (no en memoria)
- `inbound_email_log` con índice `(user_id, received_at) WHERE status NOT IN ('rejected')`.
- Cuenta filas en últimas 24h y compara contra `INBOUND_EMAIL_MAX_PER_DAY`.
- Sobrevive a restarts de Render — crítico porque Render free tier reinicia con cold start.

### 5.5 RLS en `inbound_email_log`
- `ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY`
- Policy `inbound_email_log_service_role_only`: `USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')`
- La tabla es invisible al cliente — solo la API con service_role la lee/escribe.

### 5.6 SECURITY DEFINER en `get_user_id_by_email`
- Función necesaria porque `auth.users` no es accesible con anon key.
- `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO service_role` — solo el API la puede invocar.
- `SET search_path = auth, public` para evitar search path hijacking.

### 5.7 Webhook responde 200 SIEMPRE
- Incluso en rechazos (`unknown_sender`, `rate_limited`, `no_content`) → 200 con `received: true`.
- Postmark interpreta 5xx como retry → cascada infinita si la API tiene un bug. Por eso se logguea el error en `inbound_email_log.error_detail` y se sigue.

## 6. Variables de entorno

```
POSTMARK_INBOUND_SECRET=<bearer-token-generado-en-postmark>
INBOUND_EMAIL_ENABLED=false      # cambiar a 'true' cuando MX esté propagado
INBOUND_EMAIL_MAX_PER_DAY=10     # rate limit por usuario por día
INBOUND_EMAIL_MAX_SIZE_MB=25     # tamaño máx por adjunto / descarga
```

Configurar en `Render Dashboard → bresca-api → Environment`. No tocar `.env.local` (zona prohibida por `AGENTS.md`).

## 7. Activación en producción (3 pasos)

1. **DNS** — agregar registro `MX 10 inbound.postmarkapp.com.` para `estudios.bresca.io` en Cloudflare/Google Domains. Esperar propagación (5-15 min).
2. **Postmark** — crear Inbound Server, copiar webhook URL `https://bresca-api.onrender.com/inbound-email`, configurar HTTP Auth, copiar el secret.
3. **Render** — setear `POSTMARK_INBOUND_SECRET=<secret>` e `INBOUND_EMAIL_ENABLED=true`. Deploy automático tras editar las env vars.

Verificación end-to-end: enviar email de prueba desde la cuenta auth de un usuario real → revisar `inbound_email_log` en Supabase Studio → confirmar `study_drafts` apareció con `source='email'` → confirmar en el Vault del usuario.

## 8. Métricas (tabla `inbound_email_log`)

```sql
SELECT
  date_trunc('hour', received_at)        AS hour,
  count(*) FILTER (WHERE status='completed') AS completed,
  count(*) FILTER (WHERE status='rejected')  AS rejected,
  count(*) FILTER (WHERE status='failed')    AS failed,
  avg(total_duration_ms)                     AS avg_ms,
  avg(attachment_count)                      AS avg_files,
  count(DISTINCT user_id)                    AS users
FROM inbound_email_log
WHERE received_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;
```

Eventos en `events` (visible en `/admin/live` y `Admin.tsx`):
- `email_inbound_start` — recibido del webhook, listo para procesar
- `email_inbound_complete` — al menos un draft creado, `props.count` = cantidad
- `email_inbound_failed` — excepción inesperada en el pipeline

## 9. Fuera de alcance (no implementado en v1.0)

- **Email_slug en profiles** — la versión propuesta en [[11_Roadmap_PostMVP]] sec. 2.2 sugería casillas por usuario (`paciente.gonzalo@estudios.bresca.io`). En v1.0 cualquier email a `*@estudios.bresca.io` se rutea al user que coincide con el `From`, ignorando el `To`. Más simple, menos seguro contra suplantación de From → mitigado parcialmente por SPF/DKIM/DMARC de Postmark.
- **Bounce explicativo al usuario** — si el From no matchea ningún usuario o supera el rate limit, no se envía bounce. Postmark recibe 200 y el remitente nunca sabe que falló.
- **Reenvíos de cuidadores** — un familiar que reenvía al mail propio no encola en el profile del familiar, encola en el self-profile del cuidador. Para multi-profile email-routing hay que implementar email_slug por profile.
- **Verificación SPF/DKIM/DMARC propia** — confiamos en que Postmark filtre los failures antes del webhook. No re-verificamos los headers.
- **OCR de bodies de email** — si el laboratorio mete el resultado en el cuerpo del mail sin adjunto ni link, no se procesa. Decision: 99% de los labs LATAM mandan PDF.
- **Pantalla "Tu casilla de estudios"** — Settings page que muestre el email del usuario y el rate limit consumido — pendiente del Product Designer (ver `agents/product-designer-mobile-first/role.md`).

## 10. Decisiones técnicas relevantes

- **No usar JWT del usuario** — el webhook viene de Postmark, no del cliente. Por eso se usa Bearer secret + lookup por From.
- **No re-firmar en HMAC del body** — Postmark soporta Bearer y no firma el body por default. `validateHmacSignature` queda como opt-in para otros providers.
- **No usar `multer`** — Postmark manda JSON con `Attachments[].Content` en base64. No hay multipart.
- **No usar el path OCR async genérico de upload manual** — Email-to-Vault encola directo `study_drafts` con `source='email'`. La Edge Function ve el source y trackea métrica diferenciada.
- **No filtrar por dominio del remitente** — un usuario puede reenviar desde Gmail, Outlook, mail corporativo, etc. El From es el identificador, no el dominio.

## Ver también
[[CLAUDE]] · [[04_TechSpec_Bresca]] · [[05_SystemDesign_Bresca]] · [[11_Roadmap_PostMVP]] · [[14_Security_Audit_2026-05-07]]
