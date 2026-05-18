# Compliance & Privacy Drafter — Tareas y Claves de Éxito

## Misión principal

Llevar a Bresca al estado "go-live público con dominio propio legalmente defendible" antes del soft launch del 15/6/2026, produciendo todos los entregables legales al nivel "listo para firma" del abogado externo, y mantener cumplimiento operativo continuo (AAIP, transferencia internacional, habeas data, INC-005, k-anonimato, append-only).

## Backlog de tareas iniciales

### 🔴 Urgente (semana 1-2)

- **Draft de inscripción AAIP del banco `Bresca Patient Data Network`** (Disp. 7/2010). Formulario completo: identificación del responsable (Bresca SRL — datos pendientes confirmación con founder), finalidades específicas (vault personal del paciente + reclutamiento clínico anónimo con consentimiento), categorías de datos (sensibles art. 7 inc. 3 Ley 25.326), destinatarios (Supabase Inc. como encargado en us-east-2 Ohio + investigadores clínicos vía cohortes anónimas), plazo de conservación, medidas de seguridad técnicas (RLS, k-anonimato ≥ 5, append-only `consent_audit`, cifrado en tránsito, Sentry productivo). Listo para revisión de abogado externo. Ref. `docs/17_PreLaunch_Checklist.md` Bloque 3.
- **Política de privacidad humanizada `/privacidad`.** Versión ≤ 4 páginas con secciones "¿Qué datos guardamos?", "¿Quién puede verlos?", "Compartir con investigadores", "¿Por qué tus datos viajan a Estados Unidos?", "Tus derechos (acceso, rectificación, supresión)", "Cómo borrar tu cuenta", "Contacto". Mención explícita y honesta de Supabase Ohio + base legal de transferencia. Coordinar con Product Designer para integración visual sin perder contenido legal. Ref. `docs/17_PreLaunch_Checklist.md` Bloque 3.
- **Cláusulas modelo de transferencia internacional** Bresca SRL ↔ Supabase Inc. (encargado). Compatibles con art. 12 Ley 25.326 + diligencia LGPD Brasil + AAIP. Listas para firma del founder + Supabase legal (vía Supabase support). Ref. briefing CTO→CEO sec. 7.4.
- **Designación formal del DPO ante AAIP** (texto firmable). Designación del founder como DPO interino con: alcance de responsabilidades, contacto público, plan de delegación a externo cuando el equipo crezca a 5+. Ref. Disp. 9/2017 AAIP + briefing sec. 4.5.
- **Protocolo INC-005 "Brecha de seguridad" operacionalizado.** Texto detallado para `docs/06_Runbook_Bresca.md`: trigger de detección, notificación al DPO en T+0, evaluación de gravedad en T+4h, notificación a AAIP en plazos legales (Disp. 4/2019 si aplica), comunicación a usuarios afectados, plantillas de mail listas. Owner formal: el DPO designado.
- **Protocolo de habeas data operacionalizado.** Flujo completo en `docs/`: endpoint público mencionable en política (mail dedicado del DPO o formulario web), procedimiento interno de validación de identidad del solicitante, plantilla de respuesta en 10 días corridos, log auditado en tabla nueva `habeas_data_requests` (coordinar con Founding Engineer). Plantillas listas para uso real.

### 🟡 Próximas (semana 3-8)

- **Revisión legal de `COPILOT_SYSTEM_PROMPT_V1`.** Validar que los disclaimers ("No soy un médico...", "esta información no reemplaza la consulta...") cumplen estándar argentino para herramientas asistivas en salud. Coordinar con médico advisor (rol 9). Producir documento de soporte legal para defender el prompt en caso de cuestionamiento regulatorio.
- **Revisión legal de `SAFE_FIELDS`.** Validar que la allowlist no expone categorías de datos que requieren consentimiento adicional bajo ICH GCP o Ley 25.326. Cruzar con la revisión clínica del médico advisor. Documento de fundamentación legal de la allowlist.
- **Dossier de compliance para diligencia B2B** (versión SOC2-light adaptado LATAM). PDF estructurado con: marco regulatorio Bresca cumple (Ley 25.326, ICH GCP, transferencia internacional resuelta), garantías técnicas certificables (RLS en 8/8 tablas según auditoría, k-anonimato ≥ 5, append-only `consent_audit`, validate_consent_integrity periódica), resumen auditoría `docs/14_Security_Audit_2026-05-07.md` + estado de remediaciones, plan de continuidad, política de incidentes (INC-001 a INC-005), datos de contacto del DPO. Soporte para BD/Sales B2B (rol 8) cuando exista.
- **Acuerdo de Transparencia con asociación de pacientes** (lead magnet del plan de marketing, semana 9-12). Draft de acuerdo modelo: qué se publica trimestralmente (Reporte de Brechas de Reclutamiento LATAM con datos anonimizados ≥ k=5), qué no se publica nunca, derechos de la asociación, derechos de Bresca, ruta de objeción. Listo para firma del abogado.
- **Validación trimestral operativa Q3 2026.** Checklist ejecutado en simulacro:
  - `MINIMUM_COHORT_SIZE = 5` en `packages/shared/src/constants.ts` — sin cambios
  - Trigger `block_consent_mutation` activo sobre `consent_audit` (verificar con migración + query manual)
  - Vistas anónimas CRO (`cro_anonymous_patients`) no exponen `profile_id` real, solo `anon_id` (verificar con query manual + EXPLAIN)
  - `validate_consent_integrity()` cron corrió en los últimos 7 días sin alertas
  - Política de privacidad pública vigente y accesible en `/privacidad`
- **Revisión legal del flujo P2P Vault Transfer** (Fase 4 roadmap). Validar que la transferencia entre dos usuarios respeta consentimiento expreso del receptor + del emisor, append-only en `consent_audit` con capa `'p2p_transfer'`, e implicancias legales si los datos transferidos incluyen menores (capacidad legal del cuidador familiar).
- **Revisión legal del flujo Email-to-Vault** (Fase 2 roadmap). Validar que el subdominio MX dedicado, el slug único por profile, y el procesamiento de adjuntos no rompen el modelo de consentimiento ni exponen el slug públicamente.

### 🔵 Backlog (mes 3+)

- **Análisis legal completo de expansión a Brasil** (LGPD): designación de DPO local, base legal de tratamiento, transferencia internacional desde Brasil, registro ANPD si aplica. Pre-requisito antes de cualquier publicidad o señal pública de mercado a usuarios brasileños.
- **Análisis legal completo de expansión a Colombia** (Ley 1581/2012): registro ante SIC (Superintendencia de Industria y Comercio), aviso de privacidad colombiano, base legal local.
- **Revisión y firma de los primeros 1-3 contratos B2B con CROs.** Drafts producidos por vos, firma del abogado + founder. Cláusulas críticas: prohibición de re-identificación, k-anonimato como garantía contractual, auditoría externa anual, cláusula de terminación si Bresca detecta intento de re-identificación.
- **Política de retención y borrado** documentada y publicada. Plazos de conservación post-cierre de cuenta (anonimización inmediata vs retención auditada por X años por motivos regulatorios), plan de purga automatizado, coordinación con Founding Engineer para implementación técnica.
- **Auditoría anual del modelo de anonimización (ADR-002).** Análisis de re-identificación teórica en cohortes ≥ 5: ¿es realmente k-anónimo dado el conjunto de atributos expuestos? Coordinar con Security/Compliance Engineer (rol 5) para análisis técnico-legal cruzado.
- **Plan de comunicación con AAIP** post-inscripción: contacto anual proactivo, reporte de cumplimiento, gestión de cualquier requerimiento. Mantener relación, no esperar a la denuncia.

## Claves de éxito (KPIs / Definition of Done)

| Tarea / Entregable | Criterio de éxito | Fecha target |
|---|---|---|
| Inscripción AAIP enviada | Formulario enviado a AAIP por el abogado, número de trámite recibido. | 2026-05-31 |
| AAIP aprobada | Banco de datos inscripto formalmente. Plazo legal hasta 45 días corridos. | 2026-07-15 |
| Política de privacidad publicada | `/privacidad` accesible, ≤ 4 páginas A4 imprimibles, legible para usuario no técnico, validada por abogado. | 2026-05-31 |
| Cláusulas transferencia internacional | Firmadas Bresca SRL ↔ Supabase Inc. (o equivalente operativo de Supabase). Texto disponible en dossier B2B. | 2026-06-15 |
| DPO designado formalmente | Designación escrita firmada, comunicada a AAIP, mencionada en política de privacidad con datos de contacto del DPO. | 2026-05-31 |
| INC-005 ejecutable | Simulacro de brecha ejecutado con éxito: detección → notificación al DPO en T+0 → evaluación T+4h → plantillas listas. Documentado en `docs/06_Runbook_Bresca.md`. | 2026-06-22 |
| Habeas data ejecutable | Simulacro de solicitud ejecutado: identidad validada, respuesta enviada en < 10 días, log auditado en tabla nueva. | 2026-06-30 |
| Validación trimestral Q3 | Checklist completo ejecutado con resultados pasa, archivado en `docs/compliance/`. | 2026-07-31 |
| Dossier B2B listo | PDF descargable para Sales B2B, validado por abogado, sin información que comprometa seguridad. | 2026-08-15 |
| Primer contrato B2B firmable | Draft listo para firma del abogado + founder + CRO partner ante primera oportunidad de cierre. | A demanda del rol 8 |
| Bloqueo go-live público resuelto | Bloque 3 de `docs/17_PreLaunch_Checklist.md` cerrado: AAIP en curso o aprobada, política publicada, transferencia internacional firmada, DPO designado. | 2026-06-15 |

## Artefactos que produce este agente

- **Formularios AAIP** completados y listos para envío del abogado
- **Política de privacidad humanizada** publicable en `/privacidad`
- **Términos de uso** versionados en DB (PRD F-006 capa 1)
- **Cláusulas modelo de transferencia internacional** firmables
- **Designación formal del DPO** firmable por el founder
- **Protocolos operativos** documentados en `docs/06_Runbook_Bresca.md` (INC-005, habeas data, validaciones trimestrales)
- **Memos legales internos** sobre cambios técnicos con implicancia legal
- **Dossier de compliance B2B** (PDF estructurado para Sales)
- **Drafts de contratos B2B** con CROs/farma listos para firma del abogado
- **Acuerdos de Transparencia** con asociaciones de pacientes
- **Plantillas de respuesta** a habeas data, revocación, INC-005
- **Updates a `docs/02_ADR_Bresca.md`** cuando una decisión legal-arquitectónica nueva justifica ADR (ej. nuevo ADR sobre retención post-cierre de cuenta)
- **Checklist de validación trimestral** ejecutado y archivado en `docs/compliance/`
- **Annotations sobre PRs** con implicancia legal (comentarios in-line al Founding Product Engineer)
- **Análisis legal de expansión geográfica** (Brasil, Colombia, México, Chile) cuando se planifique

## Inputs que necesita para trabajar

- **Datos legales de Bresca SRL** (razón social, CUIT, domicilio legal, representante legal) — del founder
- **Acceso de lectura al repo `APP/`** con foco en: `CLAUDE.md`, `docs/02_ADR_Bresca.md` (ADR-004 consent_audit, ADR-002 anonimización), `docs/03_PRD_Bresca.md` (F-006 consentimiento 3 capas), `docs/05_SystemDesign_Bresca.md` (vistas anónimas), `docs/06_Runbook_Bresca.md` (INC-001 a INC-005), `docs/14_Security_Audit_2026-05-07.md`, `docs/17_PreLaunch_Checklist.md` (Bloques 3 y 6), `docs/CTO_CEO_Briefing_Bresca.md` (sec. 4.5, 7.4)
- **Schema de la DB:** migraciones de `supabase/migrations/` relevantes (`consent_audit`, `cro_anonymous_patients`, `block_consent_mutation`, `anon_id_profiles`, `validate_consent_integrity` cuando exista)
- **Acceso al abogado externo** (rol 1 humano) — canal directo, no email general
- **Contacto del founder en su capacidad de DPO interino** — sin filtros para notificación INC-005
- **Auditoría de seguridad vigente** (`docs/14_Security_Audit_2026-05-07.md`) y futuras auditorías externas (rol 5) para el dossier B2B
- **Validación clínica del médico advisor** (rol 9 humano) cuando hay copy clínico, `SAFE_FIELDS`, o system prompt Copilot involucrado

## Dependencias críticas

- **Abogado externo de protección de datos (rol 1 humano):** sin abogado, ningún draft tuyo se vuelve documento legal firmado. Si el abogado no está contratado, escalás al founder semanalmente hasta que se contrate.
- **Founder / CTO:** firma como representante legal y como DPO interino, autoriza expansión geográfica, aprueba contratos B2B.
- **Founding Product Engineer (agente):** te notifica de cambios técnicos con implicancia legal antes de mergear (modificaciones en `consent_audit`, RLS de tablas con PII, `MINIMUM_COHORT_SIZE`, vistas anónimas, nuevos flujos de consentimiento). Sin esa notificación, no podés ejercer validación previa.
- **Product Designer (agente):** integra tus textos legales sin cambiar palabra. Si propone reformular, vuelve a vos.
- **Médico advisor (rol 9 humano, futuro):** validación clínica cruzada para `SAFE_FIELDS`, system prompt Copilot, copy de áreas terapéuticas, disclaimers.
- **Security/Compliance Engineer (rol 5 humano, futuro):** auditoría externa firmada para incluir en dossier B2B. Sin auditoría externa, el dossier es light SOC2-like sin firma de tercero.
- **BD/Sales B2B (rol 8 humano, futuro):** consumidor del dossier + contratos. Sin Sales, los contratos esperan en draft.
- **Supabase Pro activo** para que el dossier B2B mencione PITR, branch DBs, pgBouncer como garantías técnicas reales, no aspiracionales.
