# Bresca — Definición de Equipo y Roles Recomendados

**Fecha:** 2026-05-17
**Estado del proyecto:** MVP en producción (B2C live · CRO live · API live · mobile no iniciado)
**Autor del documento:** CTO/Advisor (sesión estratégica)

---

## Contexto del proyecto

Bresca es una plataforma two-sided de datos de salud para LATAM. El B2C (`web-patient`) está en producción en `bresca-app-api.vercel.app`: health vault con OCR async, DICOM viewer client-side (5 transfer syntaxes, CharLS y OpenJPEG vía WASM), copilot IA con DeepSeek, QR sharing con HMAC, gestión familiar con multi-profile bajo un solo `auth.user`, consentimiento append-only en 3 capas, y monitoring `/admin/*` para email `@bresca.io`. El B2B (`web-cro`) está live en `bresca-cro.vercel.app` con dashboard de cohortes anónimas vía vistas SQL (k-anonimato ≥ 5), matching con fit score, y panel de admin con Recharts + Supabase Realtime.

El equipo actual es **un dev (founder/CTO) + Claude Code como co-developer**. La arquitectura es Turborepo (pnpm) con tres apps (`web-patient`, `web-cro`, `api` en Render), `packages/shared` y `supabase/` (migraciones + 1 Edge Function). Stack: React 18 + Vite 5 + TS, Node 20 + Express, Postgres 15 + Supabase, DeepSeek (OCR Vision + chat), WASM (CharLS + OpenJPEG) para descompresión DICOM en navegador.

Hay 24 ítems bloqueantes en `docs/17_PreLaunch_Checklist.md` para el go-live público con dominio propio: pendientes legales (AAIP, política de privacidad humanizada, transferencia internacional US Ohio), pendientes de infra (Supabase Pro con PITR, Render Starter, SMTP propio en `@bresca.io`), 5 hallazgos abiertos de la auditoría de seguridad (`docs/14_Security_Audit_2026-05-07.md` — S-03 ownership en Edge Function, S-06 allowlist QR incompleta, S-07 secret en `current_setting`, S-08 MD5 anonimización, S-10/S-11 cron/integridad), y dos placeholders bloqueados por decisiones de negocio (número WA en `Menu.tsx`, nombre del asistente).

El roadmap post-MVP (`docs/11_Roadmap_PostMVP.md`) incluye Email-to-Vault, P2P Vault Transfer, ChatGPT Health handoff, y mobile (React Native + Expo todavía sin iniciar).

El target inmediato (`docs/000_Plan de Lanzamiento.md`) es 50–100 usuarios B2C activos en 90 días con NSM "3+ estudios cargados en 30 días", y 4 demos B2B agendadas para día 90.

Este documento define el equipo necesario para pasar de "MVP en producción técnica" a "producto con tracción real + compliance verificable + roadmap de escala".

---

## Resumen ejecutivo

| Rol | Prioridad | Engagement | Razón principal |
|---|---|---|---|
| Abogado de protección de datos (LATAM) | 🔴 Inmediata | Consultor puntual + retainer | AAIP pendiente, transferencia internacional US Ohio sin cláusulas modelo, base de datos de salud sensible en producción sin registro legal |
| DPO (Data Protection Officer) formal | 🔴 Inmediata | Part-time / fundador delegado | Disp. 9/2017 Argentina lo exige; hoy no hay figura designada por escrito |
| Founding Product Engineer (full-stack) | 🔴 Inmediata | Full-time | Bus factor = 1; el sistema completo (DICOM + OCR + consent + CRO) depende de una sola persona |
| Diseñador Product (UX/UI) con foco mobile-first | 🔴 Inmediata | Part-time (3 días/sem) | Dark mode incompleto, onboarding sin UX writing pulido, sin diseño nativo mobile, 9 landings A/B sin curaduría profesional |
| Security/Healthtech Compliance Engineer | 🟡 Próximos 3 meses | Freelance puntual + auditoría trimestral | 5 hallazgos abiertos post-audit, sin pentest externo, sin auditoría de integridad de `consent_audit`, sin SOC2 light para B2B |
| Growth / Performance Marketer LATAM | 🟡 Próximos 3 meses | Part-time / freelance | NSM "3+ estudios en 30d" sin plan de medición real, 9 landings sin tracking de conversión, plan de marketing existe pero sin owner ejecutor |
| Content Lead bilingüe (ES rioplatense + PT-BR futuro) | 🟡 Próximos 3 meses | Freelance | Brand voice definido pero no operacionalizado (blog, comunidades, SEO de autoridad sobre derechos del paciente) |
| BD/Sales B2B con red en CROs / farma LATAM | 🟡 Próximos 3 meses | Comisión + base | Panel CRO live pero sin pipeline; "primer partner B2B" mencionado en roadmap sin owner |
| Médico clínico advisor (consultor médico) | 🟡 Próximos 3 meses | Advisor (equity + horas) | `SAFE_FIELDS` definido sin validación clínica, presets de windowing DICOM sin revisión radiológica, copilot system prompt sin médico en el loop |
| QA Engineer / Tester manual mobile-first | 🟡 Próximos 3 meses | Part-time / freelance | Checklist de 180 ítems en `18_UserTestingChecklist.md` sin owner que lo corra, post-deploy QA automatizado solo cubre 14 escenarios |
| Mobile Engineer (React Native + Expo) | 🔵 Scaling (mes 4+) | Freelance proyecto cerrado | iOS push requiere app nativa; segmento 40-55 instala apps si vienen recomendadas; ADR-003 ya pre-decidió Expo |
| SRE / DevOps part-time | 🔵 Scaling (mes 6+) | Freelance | Sin staging, sin CI/CD con tests, sin observabilidad estructurada (Sentry hoy es "free tier mencionado en docs"); rate limit en memoria; cold start Render |
| Data / Backend Engineer (Postgres + RLS) | 🔵 Scaling (mes 6+) | Freelance | Materializar vistas CRO al escalar, particionar `consent_audit`, retrieval pgvector para copilot v2, métricas de funnel `events` con `duration_ms` |
| Customer Success / Soporte L1 | 🔵 Scaling (cuando haya >100 MAU) | Part-time | Tab "Asistente Soporte" tiene placeholder "XYZ" sin nombre; WA hardcodeado sin operador real detrás |

---

## Roles recomendados

### 1. Abogado de protección de datos (LATAM, foco Argentina + LGPD Brasil)

**Por qué este rol ahora.** Bresca opera un banco de datos de salud (categoría "sensibles" por art. 7 inc. 3 Ley 25.326) en producción, con datos almacenados en Supabase `us-east-2 Ohio`, sin haber iniciado la inscripción ante la AAIP (Disposición 7/2010) — esto es bloqueante explícito en `docs/17_PreLaunch_Checklist.md` (Bloque 3). El briefing CTO→CEO (`docs/CTO_CEO_Briefing_Bresca.md` sec. 7.4) y el análisis en `docs/000_Plan de Lanzamiento.md` lo marcan como riesgo legal go/no-go. Sin cláusulas modelo o consentimiento explícito para transferencia internacional (art. 12), el producto técnicamente está fuera de cumplimiento desde el primer usuario real.

**Responsabilidades core:**
- Iniciar y gestionar inscripción del banco de datos ante la AAIP (trámite 30-45 días)
- Redactar política de privacidad humanizada para `/privacidad` mencionando explícitamente Supabase Ohio + base legal de transferencia internacional
- Validar el schema y los flujos de `consent_audit` (`docs/02_ADR_Bresca.md` ADR-004): consentimiento expreso, específico, libre y revocable según ICH GCP
- Diseñar e implementar el flujo de habeas data (acceso/rectificación/supresión en 10 días corridos) — hoy parcialmente cubierto por `handle_account_deletion` en SQL pero sin proceso operativo ni endpoint público
- Asesorar sobre LGPD Brasil (DPO local) y Ley 1581 Colombia (registro SIC) antes de cualquier expansión
- Revisar contratos B2B con CROs cuando se firme el primer partner

**Stack / skills requeridos:** Ley 25.326, Disp. 7/2010 y 9/2017 AAIP, LGPD (Brasil), Ley 1581/2012 (Colombia), ICH GCP, RGPD soft como referencia. No requiere conocimiento técnico profundo, sí necesita poder leer el modelo de `consent_audit` y las vistas anónimas CRO sin asustarse.

**Tipo de engagement sugerido:** Consultor puntual para los entregables iniciales (AAIP + privacidad + habeas data), luego retainer mensual de 4–6 hs.

**Prioridad de contratación:** 🔴 Inmediata. Bloquea launch público.

**Señales de fit cultural:**
- Experiencia previa con startups healthtech o fintech LATAM (no estudios jurídicos generalistas)
- Capacidad de redactar política de privacidad en lenguaje claro, no jurídico-defensivo — el plan de marketing posiciona "privacidad explicada como ventaja"

---

### 2. DPO (Data Protection Officer) formal

**Por qué este rol ahora.** Disp. 9/2017 AAIP exige DPO designado formalmente. El briefing CTO→CEO lo marca como pendiente (sec. 4.5). El protocolo INC-005 ("Brecha de seguridad sospechosa", `docs/06_Runbook_Bresca.md`) requiere notificación al DPO en T+0; si no existe la figura por escrito, el protocolo es inejecutable. Adicionalmente, el rol es contraparte legal del flujo `consent_audit → CRO matching` definido en `docs/05_SystemDesign_Bresca.md` sec. 3.1.

**Responsabilidades core:**
- Designación formal ante AAIP
- Owner del protocolo INC-005 (brecha de seguridad) — coordinación legal en < 1h
- Validación trimestral de que `MINIMUM_COHORT_SIZE = 5` no fue reducido (`packages/shared/src/constants.ts`)
- Validación trimestral de que `consent_audit` sigue siendo append-only (revisar trigger `block_consent_mutation` mencionado en auditoría)
- Punto de contacto para solicitudes de acceso/rectificación/supresión de usuarios
- Auditoría anual del modelo de anonimización (ADR-002): re-identificación teórica en cohortes < 5

**Stack / skills requeridos:** Misma base legal que el rol 1, más conocimiento operativo del producto (necesita entender qué hace una RLS policy y por qué `cro_anonymous_patients` es seguro).

**Tipo de engagement sugerido:** Part-time formal. En esta etapa puede ser el founder con designación escrita, **siempre que esté documentado por el abogado del rol 1** y haya un plan de delegación cuando haya equipo de 5+.

**Prioridad de contratación:** 🔴 Inmediata. Requisito legal explícito.

**Señales de fit cultural:**
- Si es el founder: voluntad de aceptar la responsabilidad personal y los plazos legales (no delegable)
- Si es externo: confiabilidad operativa, no busca rol estratégico

---

### 3. Founding Product Engineer (full-stack senior)

**Por qué este rol ahora.** El briefing CTO→CEO sec. 9.5 lo nombra explícitamente: *"Dependencia de un solo CTO: el sistema está documentado, pero la continuidad operativa depende de esta única persona."* El sistema en producción incluye: pipeline OCR async con Edge Functions + `pg_net` + trigger SQL + Realtime, DICOM viewer client-side con 5 transfer syntaxes incluyendo WASM (CharLS y OpenJPEG con `/wasm/*_decode.js`), windowing percentil p2–p98 muestreado del cuarto medio de serie con fallback a presets clínicos por modalidad, RLS multi-profile con `(user_id, owner_user_id)` para familia, vistas anónimas para CRO, y monitoring con `emitEvent` fire-and-forget + KPIs SQL `SECURITY DEFINER`. Si el CTO actual se enferma una semana, no hay quién haga deploy ni resuelva INC-001 a INC-005.

Adicionalmente, el roadmap post-MVP (`docs/11_Roadmap_PostMVP.md`) incluye Email-to-Vault (subdominio MX + webhook + slug en profiles), P2P Vault Transfer (nueva tabla `vault_transfers` + flujo de consent en `'p2p_transfer'`), y ChatGPT Health handoff — todas funcionalidades full-stack que requieren tocar Postgres, RLS, API Express, Vite/React, Storage, y Realtime. No se sostiene con 1 persona + Claude Code.

**Responsabilidades core:**
- Cerrar los 5 hallazgos abiertos de la auditoría de seguridad (S-03, S-06, S-07, S-08, S-10/S-11)
- Owner de las Fases 1, 2, 4 y 5 del roadmap post-MVP
- Co-owner del Edge Function `process-study-draft` (DeepSeek Vision + pdf-parse + rama DICOM)
- Co-owner del DicomViewer (`apps/web-patient/src/components/DicomViewer.tsx`, 519 líneas) — incluye WASM loading, windowing, cine player, frame sampling
- Mantener `scripts/post-deploy-qa.mjs` y ampliarlo más allá de 14 tests
- Implementar Admin Funnel (`avg duration_ms por node` ya está en DB, falta la vista) y Copilot deep link en backlog de `CLAUDE.md`
- Aplicar el patrón Result (`packages/shared/src/result.ts`) y mantener `supabase` singleton

**Stack / skills requeridos:** TypeScript senior, React 18 + Vite 5, Node 20 + Express, Postgres + RLS (no opcional — debe poder escribir migraciones con RLS policies y triggers), Supabase (Auth + Storage + Realtime + Edge Functions Deno), Turborepo + pnpm workspaces. Plus: experiencia previa con healthtech, DICOM, o procesamiento de imágenes médicas.

**Tipo de engagement sugerido:** Full-time, idealmente con equity. Es el rol que reduce bus factor de 1 a 2.

**Prioridad de contratación:** 🔴 Inmediata. Cuello de botella estructural identificado por el propio CTO.

**Señales de fit cultural:**
- Comodidad con "MVP funcional en producción, no prototipo, no enterprise" (CLAUDE.md sección final) — no agrega complejidad innecesaria
- Aceptación del patrón "Result, nunca throw en lógica de negocio" y de las reglas absolutas de seguridad (no son sugerencias)
- Capacidad de trabajar con Claude Code como par, no como competencia

---

### 4. Diseñador Product (UX/UI) con foco mobile-first y health UX

**Por qué este rol ahora.** Tres evidencias concretas:

1. **Dark mode incompleto.** `ConsentCenter.tsx` 🟡 pendiente diseño, `Welcome/Email/Verify` 🔵 backlog (`CLAUDE.md` sec. Backlog).
2. **Onboarding sin UX writing pulido.** El briefing CTO→CEO sec. 13 Fase 2 lo lista como bloqueante: *"Onboarding revisado con UX Writing de confianza (tono médico-profesional)"*. El plan de lanzamiento (`docs/000_Plan de Lanzamiento.md`) marca "Auditoría de UX Writing en toda la app" como semana 1-4 sin owner.
3. **9 variantes de landing sin curaduría.** Existen en `/landing/` pero sin un diseñador que decida cuáles son los 2-3 finales basándose en jerarquía visual y narrativa, no solo conversión.

Adicionalmente, el target demográfico es **cuidadores 40–55 en LATAM**. PRD sec. 2 lo identifica como segmento primario. Este segmento tiene tasas de instalación de apps 40-50% menores que 18-35 y baja completion de "Add to Home Screen" en iOS — necesita UI que reduzca fricción explícitamente, no UI experimental.

**Responsabilidades core:**
- Sistema de diseño dark mode completo: `ConsentCenter`, `Welcome`, `Email`, `Verify`, y cualquier pantalla restante
- Auditoría de UX writing en `Onboarding`, `Vault`, `Copilot`, `Upload`, `QRGenerate`, `Family` — tono médico-profesional, sin jerga ni marketing agresivo
- Curaduría de las 9 landings → seleccionar 2-3 finales con tracking definido
- Diseño de las nuevas pantallas de la roadmap: Settings → "Tu casilla de estudios" (Fase 2 Email-to-Vault), Incoming Transfers (Fase 4 P2P), CTA ChatGPT handoff (Fase 5)
- Diseñar el flujo "Modo demo sin registro con PDF muestra" (recomendado en `docs/000_Plan de Lanzamiento.md` sec. 1.3, +15% activación estimado)
- Diseño base para la futura app React Native (Fase 6 roadmap) — componentes traducibles a React Native, no Web-only
- Mantener consistencia con `Design System/` (tokens en `colors_and_type.css`, voice & tone en `README.md`, iconografía Lucide)

**Stack / skills requeridos:** Figma senior, sistemas de diseño con tokens (debe poder leer y modificar `Design System/colors_and_type.css`), conocimiento de Tailwind/CSS Modules (lo que se use en `apps/web-patient`), UX writing en español rioplatense, mobile-first y PWA. Plus: experiencia previa en healthtech / wellness / fintech LATAM.

**Tipo de engagement sugerido:** Part-time 3 días/semana durante 2-3 meses (lock-in de design system), luego retainer mensual para iteración.

**Prioridad de contratación:** 🔴 Inmediata. Sin diseñador, la conversión install→primer upload se queda en <15% (estimación del análisis en `000_Plan de Lanzamiento.md`).

**Señales de fit cultural:**
- No diseña para portfolio, diseña para activación y retención medibles
- Acepta restricciones: paleta y tipografía ya están definidas en Design System, no se rediseñan
- Entiende que en datos de salud la UX se evalúa por "el cuidador de 50 años abriendo en la guardia a las 2am", no por estética

---

### 5. Security / Healthtech Compliance Engineer

**Por qué este rol ahora.** La auditoría `docs/14_Security_Audit_2026-05-07.md` cerró con 10 de 15 hallazgos resueltos y 5 abiertos. Ninguno es crítico activo, pero todos son altos o medios pendientes de remediación. Adicionalmente:

- **S-03** Edge Function sin validación de propietario — depende solo de no leakear `WEBHOOK_SECRET`
- **S-06** allowlist `SAFE_FIELDS` incompleta — médico ve QR con campos descartados sin saberlo
- **S-07** `edge_secret` en `current_setting()` de Postgres, no en Supabase Vault (requiere plan Pro+)
- **S-08** MD5 para anonimización de `profile_id` al borrar cuenta — criptográficamente roto
- **S-10/S-11** integridad de `consent_audit` calculada pero nunca validada

La auditoría fue hecha por Claude Code, no por un humano externo. Para vender B2B a CROs/farma, **un pentest externo + reporte firmado** vale más que toda la documentación interna (`docs/000_Plan de Lanzamiento.md` sec. 1.2.A lo nombra explícitamente: "Auditoría externa de seguridad USD 800-1.500 con badge visible. Sin esto, ningún CRO te firma B2B").

**Responsabilidades core:**
- Pentest externo del API Render + Edge Function + RLS policies — focus en path traversal en Storage, bypass de RLS via JWT mal firmado, prompt injection persistente en `extracted_fields` consumido por el Copilot
- Validación independiente de las 5 fortalezas declaradas en auditoría: RLS en 8/8 tablas, `service_role` solo en server, `consent_audit` append-only por trigger, k-anonimato, storage path-based isolation
- Diseñar e implementar función `validate_consent_integrity()` periódica (S-11) con alerta si encuentra registros tampered
- Migrar `edge_secret` a Supabase Vault cuando se active Pro (S-07)
- Reemplazar MD5 por `anon_id` permanente en `handle_account_deletion` (S-08) — ya hay migración `20260508120000_anon_id_profiles.sql`, verificar que se use
- Definir y mantener proceso de rotación: `DEEPSEEK_API_KEY` mensual, `QR_TOKEN_SECRET` semestral (CLAUDE.md sec. variables de entorno)
- Configurar Sentry productivo (hoy solo es "free tier mencionado en docs"), alertas en Render, UptimeRobot sobre `/health`
- Preparar dossier de seguridad para diligencia de CRO/farma (SOC2 light o equivalente LATAM)

**Stack / skills requeridos:** Postgres RLS profundo (lectura crítica de policies con `USING` y `WITH CHECK`), Supabase internals, OWASP Top 10 + ASVS, conocimiento de HIPAA/HITRUST como referencia aunque no aplique en LATAM. Plus: experiencia previa en pentest de apps de salud, o background en `hsec` / `infosec` con foco en datos PII.

**Tipo de engagement sugerido:** Freelance puntual para el pentest inicial (1 sprint), luego auditoría recurrente trimestral. No requiere full-time hasta los 1.000 MAU.

**Prioridad de contratación:** 🟡 Próximos 3 meses (después de cerrar AAIP + DPO). Bloquea pipeline B2B.

**Señales de fit cultural:**
- No genera ruido innecesario — entiende que hay diferencia entre vulnerabilidad teórica y vulnerabilidad explotable
- Entrega remediaciones implementables, no solo reportes
- Comodidad con stack Supabase (no es AWS clásico)

---

### 6. Growth / Performance Marketer LATAM

**Por qué este rol ahora.** Hay un plan de marketing completo (`docs/12_Bresca_Plan_Marketing_2026.md` + `docs/12.1_Bresca_Plan_Marketing_2026.md` + `docs/000_Plan de Lanzamiento.md`) pero sin owner ejecutor. El briefing CTO→CEO sec. 7.5 lo marca como decisión pendiente: *"¿Cuál es la estrategia de adquisición de los primeros 50 usuarios?"*. El NSM definido es "3+ estudios cargados en 30 días" — esa métrica hoy no se mide automatizadamente; la tabla `events` y `useTrackNode('home')` están en código (CLAUDE.md sec. patrones) pero el funnel no está armado en `Admin.tsx`.

Adicionalmente, las 9 landings A/B sin tracking activo significan que las decisiones de copy y CTA hoy son intuición, no datos.

**Responsabilidades core:**
- Definir y armar el funnel real de NSM en el admin: install → primer upload → 3 uploads en 30d → primer QR generado → primer Copilot query
- Setear analytics privacy-first (el plan menciona Plausible.io, refuerza brand voice) — alternativa a Google Analytics dado el posicionamiento
- Ejecutar el plan de canales orgánicos definido: comunidades de cuidadores, Instagram/Facebook, TikTok/Reels, SEO blog, WhatsApp
- Tracking de costo CAC blended (target <USD 8 mes 1, <USD 5 mes 3 según `000_Plan de Lanzamiento.md`)
- Operacionalizar las 9 landings: tracking de conversión, decisión de las 2-3 ganadoras, kill de las restantes
- Diseño y monitoreo del soft launch del 15/6/2026
- Coordinación con Content Lead (rol 7) y Diseñador (rol 4)

**Stack / skills requeridos:** Plausible.io / GA4, Vercel Analytics, Supabase queries para reportes ad-hoc, atribución multi-touch básica, experimentación A/B con muestras chicas (<200), conocimiento del ecosistema LATAM (grupos FB de cuidadores, TikTok salud, micro-influencers médicos). No es paid media puro — es growth con sesgo orgánico dado el presupuesto USD 50/mes.

**Tipo de engagement sugerido:** Part-time / freelance con KPI claro (NSM mes 1, NSM mes 3) y bono por cumplimiento.

**Prioridad de contratación:** 🟡 Próximos 3 meses. Antes del soft launch 15/6.

**Señales de fit cultural:**
- Foco en NSM y D7/D30, no en vanity metrics
- Entiende posicionamiento "privacidad como ventaja, no como cost center"
- Trabaja con presupuesto bajo y prefiere orgánico/comunidad sobre paid

---

### 7. Content Lead bilingüe (ES rioplatense + PT-BR cuando entre Brasil)

**Por qué este rol ahora.** El plan de marketing tiene canales orgánicos (Instagram, TikTok, blog SEO de "Guía Bresca de Derechos del Paciente", WhatsApp Soberano) que requieren producción de contenido constante y de alta calidad. Hoy no hay quién los produzca. El brand voice por segmento ya está definido (B2C empático familiar, B2B autoridad ética) pero no está operacionalizado en piezas reales.

El posicionamiento "Soberanía Sanitaria Familiar" + "datos no se venden, se licencian" requiere autoridad construida en micro-validaciones (no marketing agresivo). Eso es trabajo de content, no de paid.

**Responsabilidades core:**
- Calendario editorial semanal: blog SEO, reels educativos, posts comunidad, WhatsApp Soberano
- Producción de los 10 artículos SEO iniciales sobre derechos del paciente LATAM, organización médica familiar, enfermedades crónicas
- Producción de carruseles informativos tipo "5 cosas que tenés que tener listas antes de la guardia"
- Coordinación con micro-influencers médicos (objetivo mes 3: 20 alianzas activas)
- Adaptación a PT-BR cuando se decida entrar a Brasil (Fase post-MVP)
- Voz consistente con el `Design System/README.md` (voice & tone Bresca) y `Reglas absolutas — nunca violar` del CLAUDE.md (no es "billetera médica", es "soberanía sanitaria")

**Stack / skills requeridos:** Español rioplatense nativo, redacción SEO, dominio de Instagram/TikTok/Reels en LATAM, capacidad de leer abstracts médicos sin sobre-interpretar, Notion/Figma para handoff con el diseñador. Plus: backgrouund periodístico de salud o experiencia en cuenta de salud digital en agencia.

**Tipo de engagement sugerido:** Freelance con retainer por volumen de piezas (X artículos + Y reels/mes), no por horas.

**Prioridad de contratación:** 🟡 Próximos 3 meses. Empieza 2-3 semanas después del Growth Marketer (rol 6) para tener el plan ejecutable antes de producir.

**Señales de fit cultural:**
- Capacidad de escribir sin jerga clínica pero con autoridad — un tono que el lector 40-55 sienta como "una amiga que sabe de salud"
- No prioriza viralidad sobre confianza
- Conocimiento del contexto regulatorio (no hace claims terapéuticos accidentales)

---

### 8. BD / Sales B2B con red en CROs y farma LATAM

**Por qué este rol ahora.** El panel CRO (`apps/web-cro`) está deployado en `bresca-cro.vercel.app` con features completas: dashboard de cohortes, matching con fit score, funnel de invitaciones, admin con KPIs (Recharts + Supabase Realtime). Pero **no hay pipeline B2B**. El briefing CTO→CEO sec. 8 propone "primera conversación B2B mes 2" y "primer partner B2B firmado en mes 2-4" sin owner. El target del plan de lanzamiento es "4 demos B2B agendadas día 90 post-launch".

La complejidad de la venta B2B aquí no es la demo del panel — es **navegar la cadena de aprobaciones de un Medical Affairs Manager en una farmacéutica o el CIO de un CRO**, donde la decisión depende de compliance + cumplimiento ICH GCP + un dossier de seguridad firmado (rol 5). No es venta consumer.

**Responsabilidades core:**
- Construir lista de las 20 principales farmacéuticas + 10 CROs activos en LATAM (mencionado en `12_Bresca_Plan_Marketing_2026.md` sec. ABM)
- Outbound a Medical Affairs Managers — el approach es ABM, no spray
- Producir el lead magnet "Reporte trimestral anonimizado: Brechas de Reclutamiento en LATAM" (con apoyo del rol 9 médico advisor)
- Owner del primer Acuerdo de Transparencia con asociación de pacientes (semana 9-12 del plan de marketing)
- Cierre de los primeros 1-3 partners B2B con contrato (coordinar con abogado del rol 1)
- Feedback loop al producto: el CRO Panel necesita features X según las primeras conversaciones, llevarlas al backlog

**Stack / skills requeridos:** Hubspot u otro CRM, conocimiento del proceso de compra de farma/CRO (no es SaaS B2B genérico), red previa en LATAM (este rol no se construye desde cero), inglés profesional (muchas farma reportan a casa matriz US/EU).

**Tipo de engagement sugerido:** Comisión por contrato cerrado + base mínima. No founding sales hire hasta que haya 2-3 partners pagantes.

**Prioridad de contratación:** 🟡 Próximos 3 meses, post-launch B2C.

**Señales de fit cultural:**
- Entiende que vender datos de salud no es vender un SaaS B2B genérico — el ciclo es 6-12 meses
- No promete data que el producto no tiene (cohortes < 5 no se muestran, k-anonimato es non-negotiable)
- Comodidad con discurso de "trazabilidad ética + auditoría" como diferenciador, no precio

---

### 9. Médico clínico advisor (consultor médico)

**Por qué este rol ahora.** Tres puntos de contacto crítico del producto donde no hay médico en el loop:

1. **`SAFE_FIELDS` allowlist (S-06 abierto).** 24 campos hardcodeados que filtran qué ve el médico al escanear el QR. Si DeepSeek extrae "Diagnóstico", "Medicamentos actuales", "Observaciones clínicas" — no aparecen. La decisión de qué campos exponer y cuáles ocultar debe ser clínica.
2. **Presets de windowing DICOM en `DicomViewer.tsx`.** Fallback por modalidad: CT(40/400), MR(500/1000), CR/DX(128/256), MG(2048/4096). Estos valores son standard pero deben ser revisados por un radiólogo antes de mostrarlos en producción a médicos reales.
3. **`COPILOT_SYSTEM_PROMPT_V1` (`apps/api/src/copilot/system-prompt.ts`).** Define las restricciones absolutas (no diagnóstico, no medicamentos, no datos de otros usuarios, no emergencias). El prompt actual está bien diseñado pero **nunca pasó por revisión clínica**, ni se han corrido los tests CT-001 a CT-007 mencionados en AGENTS.md.

Adicionalmente, para vender B2B (rol 8) y para producir contenido autoritativo (rol 7), tener un médico como cara visible eleva credibilidad.

**Responsabilidades core:**
- Revisión y expansión de `SAFE_FIELDS` con criterio clínico — qué campos un médico **necesita** ver vs qué campos pueden filtrarse
- Validación de presets de windowing por modalidad en `DicomViewer.tsx`
- Revisión del system prompt del Copilot (`COPILOT_SYSTEM_PROMPT_V1`) — incluye correr los tests CT-001 a CT-007 antes de cualquier merge según AGENTS.md
- Cara visible para contenido editorial (rol 7), webinars, y reuniones B2B (rol 8)
- Asesoramiento sobre categorías terapéuticas en consentimiento (`docs/03_PRD_Bresca.md` F-006 capa 3: diabetes, oncología, cardiología, salud mental)
- Validación clínica de los reportes "Brechas de Reclutamiento en LATAM" antes de publicar

**Stack / skills requeridos:** No técnico. Médico clínico (medicina general o interna preferentemente) con interés en salud digital. Plus: experiencia previa en ensayos clínicos LATAM, o en CRO.

**Tipo de engagement sugerido:** Advisor con equity (0.25-0.5%) + horas pagas mensuales (4-8 hs/mes).

**Prioridad de contratación:** 🟡 Próximos 3 meses. Bloquea cualquier merge al system prompt del Copilot y la expansión de SAFE_FIELDS.

**Señales de fit cultural:**
- Comodidad con "asistivo, no diagnóstico" como mensaje permanente (CLAUDE.md, PRD F-003)
- No empuja el producto hacia EMR ni telemedicina (fuera de alcance explícito por RFC-001 sec. 2.3)
- Comprende que el producto **no** reemplaza la consulta médica

---

### 10. QA Engineer / Tester manual mobile-first

**Por qué este rol ahora.** Existe `docs/18_UserTestingChecklist.md` con ~180 ítems concretos por pantalla, sin owner que lo corra. Existe `scripts/post-deploy-qa.mjs` con 14 escenarios automatizados, mínimo aceptable 12/14, pero no cubre nada de UX ni de mobile real (iPhone + Android reales). El checklist de pre-launch (`docs/17_PreLaunch_Checklist.md`) Bloque 4 lo marca como bloqueante: *"Flujo crítico B2C testeado end-to-end en mobile real (iPhone + Android)"*.

Adicionalmente, el roadmap incluye P2P Vault (Fase 4), Email-to-Vault (Fase 2), y eventualmente mobile (Fase 6) — todas funcionalidades nuevas que necesitan testing manual además del QA automatizado.

**Responsabilidades core:**
- Correr el checklist de 180 ítems del `18_UserTestingChecklist.md` en cada release mayor (mínimo cada 2 semanas)
- Testing en iPhone Safari real y Android Chrome real — incluye PWA instalable (Add to Home Screen)
- Testing exploratorio sobre nuevos flujos: P2P transfer, Email-to-Vault, DICOM upload de carpeta, multi-page upload
- Mantener y ampliar `scripts/post-deploy-qa.mjs` (en colaboración con Founding Engineer del rol 3)
- Validar regresiones después de cada deploy en Vercel y Render
- Reportar bugs estructurados con repro steps, screenshots, y device info
- Coordinar con el médico advisor (rol 9) para validar OCR sobre estudios reales

**Stack / skills requeridos:** Testing manual, Cypress/Playwright básico, dispositivos iOS + Android propios, capacidad de leer logs de Render y Supabase, Notion/GitHub Issues. No requiere skill de programación pesado.

**Tipo de engagement sugerido:** Part-time freelance, 10-15 hs/semana.

**Prioridad de contratación:** 🟡 Próximos 3 meses. Pre-launch o inmediatamente post-launch.

**Señales de fit cultural:**
- Atención al detalle en flujos de salud — no es testing genérico
- Comodidad reportando bugs reproducibles (no "no anda")
- Empatía con cuidadores 40-55 — entiende que un usuario que no encuentra el botón es un bug, no un usuario torpe

---

### 11. Mobile Engineer (React Native + Expo)

**Por qué este rol ahora.** El ADR-003 ya pre-decidió React Native + Expo SDK 52 managed workflow. Hoy `apps/mobile/` **no existe** — el monorepo solo tiene web-patient, web-cro y api (verificado en estructura). El briefing CTO→CEO Fase 3 lo marca como roadmap mes 2-4. El análisis del plan de lanzamiento (`docs/000_Plan de Lanzamiento.md` sec. 1.2.E) concluye: *"PWA es viable para beta de 200. Pero antes de escalar a 5K, necesitás React Native sí o sí — para iOS push y para presencia en stores"*.

iOS push notifications en PWA solo funcionan desde iOS 16.4 + Add to Home Screen, paso que el 70% del segmento 40-55 no completa. Sin push, la retención D7 cae fuerte.

**Responsabilidades core:**
- Setup inicial de `apps/mobile/` con Expo SDK 52 managed workflow
- Reutilización del Supabase auth (anon sign-in funcionará igual)
- Implementación de las features mínimas v1: Auth, Vault viewer + upload desde cámara, Copilot, Push (expo-notifications + FCM/APNs), P2P accept
- Adaptación visual del Design System a React Native (coordinar con diseñador rol 4)
- Configuración de EAS Build + signing iOS + Android
- TestFlight + Google Play Internal Testing
- Coordinación con Apple Developer Account + Google Play Developer Account (pre-req del PRD sec. 6)
- DICOM viewer: decidir si se reusa el path WASM (no trivial en RN — `expo-modules-core` permite, pero requiere validación), o se hace fallback a vista nativa con Cornerstone3D mobile build

**Stack / skills requeridos:** React Native + Expo SDK 52 senior, `expo-notifications`, `expo-camera`, EAS Build pipeline, conocimiento de FCM + APNs. Plus: experiencia previa en healthtech mobile, o experiencia portando Web a RN.

**Tipo de engagement sugerido:** Freelance por proyecto cerrado (3-4 semanas para v1, según estimación del plan). Si el resultado es bueno, retainer para v2.

**Prioridad de contratación:** 🔵 Scaling (mes 4+). Después de validar NSM con PWA.

**Señales de fit cultural:**
- No fuerza eject del managed workflow innecesariamente (decisión escalable a v2 según ADR-003)
- Entiende que la prioridad es paridad con web-patient, no features mobile-only nuevas
- Capacidad de leer el código de `web-patient` y trasladar lógica de forma fiel

---

### 12. SRE / DevOps part-time

**Por qué este rol ahora.** Hoy la operación tiene:

- **Sin staging.** Solo local + producción (`docs/06_Runbook_Bresca.md` sec. 1)
- **Sin CI/CD con tests automatizados.** Solo QA post-deploy manual con `node scripts/post-deploy-qa.mjs`
- **Sentry "free tier mencionado en docs"** — sin confirmación de que esté activo y configurado
- **Rate limit del Copilot en memoria** (auditoría S-02 marcado resuelto con "cleanup mínimo" pero no migrado a Redis/Supabase)
- **Cold start Render free tier** (briefing CTO→CEO sec. 9.1) — solución es Render Starter $7/mo, bloqueante en `17_PreLaunch_Checklist.md`
- **Sin observabilidad estructurada de OCR pipeline** — INC-003 está documentado pero los logs hoy se revisan a mano

A medida que el producto crezca, esto se convierte en deuda operativa. Antes de los 500 MAU (cuando se active Supabase Pro), conviene tener este rol resolviendo la base.

**Responsabilidades core:**
- CI/CD en GitHub Actions: lint + tipos + tests + RLS suite + post-deploy QA, bloqueando merge en main si falla
- Setup de staging environment (Vercel preview + Supabase branch DB)
- Sentry productivo con alertas de errores 500 y memoria
- Migración del rate limit Copilot a Supabase (no Redis, evitar infra extra como recomienda la auditoría S-02 opción 2)
- Health checks + UptimeRobot configurado y alertas a Slack/email del equipo
- Backups y PITR de Supabase Pro verificados periódicamente
- Documentar el proceso de rollback en Render y Vercel (Runbook sec. 6 ya lo lista pero sin ejecutarlo)
- Monitor de costos: DeepSeek diario (alerta > $20/día según `docs/05_SystemDesign_Bresca.md`), Render, Vercel, Supabase

**Stack / skills requeridos:** GitHub Actions, Vercel + Render APIs, Supabase CLI + management API, Sentry, UptimeRobot, conocimiento básico de Express + Node 20 deployment, pgBouncer (incluido en Supabase Pro pero hay que activarlo).

**Tipo de engagement sugerido:** Freelance part-time, 10 hs/semana durante 2 meses de setup, luego retainer mensual de mantenimiento.

**Prioridad de contratación:** 🔵 Scaling (mes 6+). Crítico antes de 500 MAU.

**Señales de fit cultural:**
- No introduce nuevas plataformas innecesariamente — Supabase + Render + Vercel + GitHub Actions son suficiente
- Documenta lo que toca en `docs/06_Runbook_Bresca.md`

---

### 13. Data / Backend Engineer (Postgres + RLS profundo)

**Por qué este rol ahora.** A escala, el sistema tiene varios cuellos identificados en `docs/05_SystemDesign_Bresca.md` sec. 4:

- **Vista `cro_anonymous_patients`** es query pesada (varios JOINs + aggregates + HAVING ≥ 5). A 10K+ usuarios hay que **materializar la vista con refresh periódico** (5 min según el doc)
- **`consent_audit` crece linealmente** — particionar por `profile_id` hash en v2
- **Retrieval del Copilot.** El ADR-005 original menciona `study_embeddings` con `text-embedding-3-small`. Hoy el `process-study-draft` produce `extracted_fields` pero **no hay evidencia de que el embedding/retrieval semántico esté implementado** (no aparece en CLAUDE.md ni en las migraciones listadas). El Copilot actual probablemente carga "estudios confirmados" tal cual — eso no escala
- **Admin funnel pendiente.** `avg duration_ms por node` está en la tabla `events` (migración `20260513160000_events_session_tracking.sql`) pero falta la vista en `Admin.tsx`

Estos no son trabajos de full-stack — son trabajos de alguien que vive en Postgres.

**Responsabilidades core:**
- Materializar `cro_anonymous_patients` con `MATERIALIZED VIEW` + refresh cron
- Implementar pgvector + `study_embeddings` para el retrieval del Copilot
- Particionado de `consent_audit` por hash de `profile_id`
- Funciones SQL `SECURITY DEFINER` para KPIs adicionales (`get_funnel(period)`, `get_retention(period)`) reusando el patrón de `get_kpis`
- Validación de integridad de `consent_audit` (S-11 abierto) — función + cron
- Diseño de schema migrable a FHIR en v2 (mencionado en RFC-001 sec. 4 como tradeoff aceptado)
- Coordinación con Security Engineer (rol 5) en cualquier cambio que toque RLS

**Stack / skills requeridos:** Postgres 15 profundo (window functions, materialized views, partitioning, pgvector), RLS senior, Supabase pg_cron + pg_net, pgBouncer, performance tuning con EXPLAIN ANALYZE. Plus: experiencia previa con datos médicos o de privacidad sensible.

**Tipo de engagement sugerido:** Freelance por entregables (materialización vista CRO, embeddings copilot, particionado consent_audit). 6-8 semanas de trabajo cerrado.

**Prioridad de contratación:** 🔵 Scaling (mes 6+). Activa cuando el sistema mostre cuellos reales medidos.

**Señales de fit cultural:**
- Comodidad con la regla "nunca editar migración existente — crear nueva" (CLAUDE.md)
- No introduce ORM ni layer de abstracción innecesaria — el equipo escribe SQL directo
- Valida cambios en local con `supabase db reset --local` antes de proponer

---

### 14. Customer Success / Soporte L1

**Por qué este rol ahora.** Dos elementos del backlog visible bloqueados por "nadie atrás":

- **`Menu.tsx` placeholder `5491100000000`** (CLAUDE.md backlog 🔴 bloqueado) — un usuario clickea WA soporte y va a un número falso
- **Nombre del Asistente Soporte placeholder "XYZ"** (CLAUDE.md backlog 🔴 bloqueado) — no hay decisión de branding ni hay persona detrás

Adicionalmente, todo el flujo de feedback y onboarding asistido del soft launch (50–100 usuarios beta) necesita que alguien responda. El briefing CTO→CEO sec. 8.4 lo lista: *"Onboarding de primeros 50 usuarios B2C + monitoreo activo + recolección de feedback estructurado"*. Hoy ese rol lo cubriría el founder, descapacitando otras prioridades.

**Responsabilidades core:**
- Responder WA soporte real (número definitivo + cuenta de Bresca, no personal)
- Owner del Asistente Soporte (asignar nombre, voz, scripts iniciales según `Design System/README.md` voice & tone)
- Onboarding asistido de los primeros 50-100 usuarios beta — sesiones 1:1 si hace falta
- Recolección estructurada de feedback (probable Notion + plantilla con: pantalla, paso, expectativa, lo que pasó, criticidad)
- Triage de bugs reportados → escalado a QA (rol 10) o Founding Engineer (rol 3)
- NPS post-primer-upload (target >35 mes 1, >40 mes 3 según `docs/000_Plan de Lanzamiento.md`)

**Stack / skills requeridos:** WhatsApp Business, Notion, empatía clínica básica (entender qué es un "estudio de sangre" sin sobre-interpretar), español rioplatense nativo. No técnico.

**Tipo de engagement sugerido:** Part-time, 15-20 hs/semana en período beta. Escala con usuarios.

**Prioridad de contratación:** 🔵 Scaling (cuando haya >100 MAU). En la beta de 50, el founder puede absorberlo.

**Señales de fit cultural:**
- Capacidad de mantener el tono empático y profesional definido en Design System
- Discreción con datos médicos (entiende que no se hablan casos puntuales fuera del soporte)
- Capacidad de escalar problemas sin pelear con el dev

---

## Modelo de equipo por etapa

### Equipo mínimo para lanzar (30-60 días — soft launch 15/6/2026)

```
- Founder / CTO (full-stack actual)              [ya está]
- Founding Product Engineer (rol 3)              [contratar ya — bus factor]
- Abogado protección datos LATAM (rol 1)         [consultor — AAIP en curso]
- DPO formal (rol 2)                             [founder con designación legal]
- Diseñador Product part-time (rol 4)            [contratar ya — dark mode + onboarding]
- Médico advisor (rol 9)                         [advisor con equity]
- Claude Code                                    [ya está]
```

**Total head count nuevo: ~3-4 personas + 2 advisors.**

### Equipo Series Seed (3-6 meses post-launch)

```
[Equipo mínimo anterior] +
- Growth / Performance Marketer (rol 6)          [part-time, dueño del NSM]
- Content Lead (rol 7)                           [freelance retainer]
- BD/Sales B2B (rol 8)                           [comisión + base, post primeras demos]
- Security/Compliance Engineer (rol 5)           [freelance + auditoría inicial]
- QA Engineer (rol 10)                           [part-time freelance]
- Customer Success L1 (rol 14)                   [part-time]
```

**Total head count nuevo: ~5-6 personas más. Equipo total: 8-10 personas (algunas part-time).**

### Equipo Series A (12+ meses)

```
[Equipo seed anterior] +
- Mobile Engineer React Native + Expo (rol 11)   [proyecto + retainer]
- SRE / DevOps part-time (rol 12)                [10 hs/sem]
- Data/Backend Engineer (rol 13)                 [proyecto, materializar vistas + pgvector]
- 2do Product Engineer full-time                 [escalar dev capacity]
- Brand / Marketing Lead full-time               [si la categoría escala]
- BD/Sales B2B full-time (rol 8 promovido)       [si pipeline crece]
- DPO externo formal (rol 2 promovido a externo) [si el founder no puede sostenerlo]
- Customer Success L1 full-time + L2             [con >1K MAU]
```

**Equipo total: 12-15 personas (mezcla full + part-time).**

---

## Recomendaciones de proceso

### Rituales

- **Daily async (Slack/Notion)**: cada miembro publica en un canal `#daily` "ayer / hoy / blockers" antes de las 11am ART. No hay daily sincrónico — el equipo es chico y la mayoría part-time.
- **Weekly sync (45 min, lunes 10am ART)**: founder + product engineer + diseñador. Agenda: estado del NSM, blockers de la semana, prioridades. Otros roles se suman según agenda.
- **Sprint de 2 semanas con planning ligero**: el roadmap post-MVP ya está fasiado (F1-F5). Cada sprint cierra una fase o sub-fase. Sin story points — estimaciones en días según el doc.
- **Retro mensual (1 hora)**: equipo completo. Foco en proceso, no personas. Usar plantilla "qué empezamos / dejamos / seguimos".
- **Security review trimestral (1 día completo, todo el equipo técnico)**: re-correr la auditoría sobre lo nuevo desde la última revisión. Owner: rol 5 (Security Engineer) cuando exista; mientras tanto, founder + Claude Code.
- **Médico-in-the-loop antes de cualquier merge que toque `COPILOT_SYSTEM_PROMPT_V*`, `SAFE_FIELDS`, o presets clínicos del DicomViewer.** Documentado en AGENTS.md como zona de confirmación.

### Herramientas

- **Repo + CI/CD:** GitHub + GitHub Actions (lint + tipos + RLS suite + post-deploy QA bloqueando merge)
- **Deploy:** Vercel (B2C + CRO) + Render (API) + Supabase (DB + Storage + Edge Functions). Ya está, no cambiar
- **Comunicación:** Slack (equipo) + Notion (docs operativos, calendario editorial, feedback de usuarios)
- **Docs técnicos:** `docs/` en el repo, escritos en Markdown con backlinks tipo Obsidian. Ya está la convención
- **Diseño:** Figma con Design System tokenizado vinculado a `Design System/colors_and_type.css`
- **Analytics:** Plausible.io (privacy-first, refuerza brand) + tabla `events` interna para funnel
- **Errores:** Sentry productivo (free tier suficiente para la beta)
- **Uptime:** UptimeRobot sobre `/health`
- **CRM B2B:** HubSpot free tier (sec. ABM del plan de marketing)
- **Soporte:** WhatsApp Business + Notion para tickets
- **Secretos:** Bitwarden o 1Password familiar (no Slack, no email — verificado en `17_PreLaunch_Checklist.md` Bloque 6)

### Integración de Claude Code / IA en el workflow

Bresca ya integra Claude Code como co-developer. Las reglas operativas están en `AGENTS.md` y se mantienen al crecer el equipo:

- **Zonas de autonomía del agente** se respetan independientemente de quién prompteé: UI + lógica de negocio sin RLS = autonomía total; migraciones SQL, RLS, system prompt Copilot = confirmación explícita; `.env`, `git push --force`, `MINIMUM_COHORT_SIZE < 5` = prohibido.
- **Onboarding de nuevos devs**: leer `CLAUDE.md` (200 líneas, contexto base), `AGENTS.md` (autonomía), `docs/04_TechSpec_Bresca.md` (schema), `docs/02_ADR_Bresca.md` (decisiones), `docs/14_Security_Audit_2026-05-07.md` (qué romper y qué no).
- **Pair programming con Claude Code** se vuelve mecánico para tareas de UI, refactor, tests. Para zona crítica (DICOM windowing, OCR pipeline, RLS, Copilot prompt) el dev humano lidera y Claude documenta.
- **Skills de Claude Code en `.claude/skills/`** se mantienen actualizados con el contexto del proyecto. Cada vez que se agrega un patrón recurrente (ej. `useTrackNode`, `emitEvent`), se actualiza la skill correspondiente.
- **Code review humano sigue siendo obligatorio** para cualquier cambio que toque las "reglas absolutas" del CLAUDE.md — no se mergea por la sola firma de Claude.
- **Soporte: NO usar Claude/IA para responder directamente a usuarios sobre temas clínicos.** El system prompt del Copilot tiene esa restricción dentro del producto; aplica también al soporte humano.

---

## Riesgos de equipo

### Si no se cubre el Abogado / DPO (roles 1 y 2) en los próximos 30 días

- AAIP sin registro = el producto técnicamente opera fuera de cumplimiento desde el primer usuario real. Cualquier usuario podría denunciar a la AAIP (improbable pero posible).
- Transferencia internacional US Ohio sin base legal = bloquea la primera demo B2B con cualquier farma seria (su compliance lo rechaza en diligencia).
- Sin DPO formal el protocolo INC-005 (brecha de seguridad) es inejecutable — *si hay incidente, el equipo no sabe a quién notificar legalmente*.
- **Impacto realista en 90 días:** sin estos roles, el soft launch del 15/6 se ejecuta igual pero el go-live público con dominio propio se posterga.

### Si no se cubre el Founding Product Engineer (rol 3) en los próximos 60 días

- Bus factor sigue en 1. Si el CTO actual se enferma 1 semana, la operación se detiene (incluido el manejo de incidentes según `06_Runbook_Bresca.md`).
- El roadmap post-MVP (5 fases, ~14.5 días estimados de trabajo) no se cumple en su orden — se acumula deuda.
- Los 5 hallazgos abiertos de seguridad permanecen abiertos.
- **Impacto realista en 90 días:** el CTO se quema. El MVP funciona pero las features prometidas (Email-to-Vault, P2P) se postergan 3-6 meses.

### Si no se cubre el Diseñador (rol 4) en los próximos 60 días

- Onboarding sin UX writing = conversión install→primer upload se queda en <15% (estimación del análisis del plan de lanzamiento).
- 9 landings sin curaduría = se mide ruido, no señal.
- Dark mode incompleto = inconsistencia visual notable que mina confianza en una app de datos sensibles.
- **Impacto realista en 90 días:** el target NSM "3+ estudios en 30d en 60% de activos" no se alcanza.

### Si no se cubre el Médico advisor (rol 9) en los próximos 90 días

- No hay autoridad clínica para el Copilot ni el QR — riesgo reputacional si un médico real encuentra que el QR le oculta información necesaria, o si el Copilot da una respuesta incómoda en un caso real.
- Sin médico cara visible, el contenido (rol 7) pierde autoridad y el discurso B2B (rol 8) pierde credibilidad.
- **Impacto realista en 90 días:** el riesgo no es legal ni técnico — es reputacional. Un solo incidente clínico mal manejado puede frenar 6 meses de crecimiento.

### Si no se cubre el Security/Compliance Engineer (rol 5) en los próximos 6 meses

- Los 5 hallazgos abiertos se acumulan con la nueva deuda técnica.
- Sin pentest externo firmado, ningún CRO/farma serio firma B2B (sec. ABM del plan marketing lo dice explícitamente).
- **Impacto realista:** el panel CRO live se vuelve un activo dormido. Las features están, no se monetiza.

### Si no se cubre Mobile Engineer (rol 11) en los próximos 6-9 meses

- iOS push limitado a Add to Home Screen — D7 retention queda por debajo del benchmark Health & Fitness (10%).
- Sin presencia en stores, segmento 40-55 que descubre por boca a boca no encuentra la app.
- **Impacto realista:** se valida hasta ~500-1K MAU con PWA, no más.

---

## Cierre

Bresca está en un punto donde **el código técnico está más maduro que la organización que lo sostiene**. El MVP funciona, está documentado, tiene auditoría de seguridad pasada, tiene roadmap claro, tiene plan de marketing y de lanzamiento. Lo que falta son personas que asuman owner-ship de cada capa.

El orden propuesto de contratación prioriza dos cosas: **(1) reducir el bus factor del equipo técnico de 1 a 2** y **(2) cubrir las obligaciones legales antes de que se vuelvan bloqueantes externos**. Todo lo demás escala con tracción y se contrata cuando los números lo justifiquen.

El equipo no necesita ser grande. Necesita ser intencional.

---

*Documento generado en sesión estratégica CTO/Advisor — 2026-05-17. Próxima revisión sugerida: post soft-launch del 15/6/2026.*
