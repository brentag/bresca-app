# PRD — Product Requirements Document
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 — MVP |
| **Estado** | `APPROVED` |
| **PM** | Product Lead |
| **Fecha target** | Q3 2026 |
| **Relacionado con** | RFC-001, ADR-001 a ADR-005 |

---

## 1. Visión del producto

Bresca es la primera red de datos de pacientes en LATAM donde el paciente controla su historial médico y decide, de forma granular, si desea contribuir a la investigación clínica.

Para el investigador clínico, Bresca es la plataforma de reclutamiento más eficiente y ética del mercado: cohortes calificadas, anónimas y con consentimiento auditado.

> **Principio de diseño central:** Trust First. El valor para el paciente viene antes de cualquier solicitud de datos o consentimiento de investigación.

---

## 2. Usuarios objetivo

| Segmento | Descripción | Problema central |
|---|---|---|
| **Paciente crónico** (B2C primario) | Diabetes T2, oncología, cardiología, 30–65 años, LATAM | Historial médico fragmentado. No puede compartir datos con su médico en una consulta. |
| **Cuidador familiar** | Gestiona salud de familiar (hijo, padre, cónyuge) | Múltiples perfiles sin herramienta unificada. |
| **Médico** (usuario indirecto) | Recibe acceso vía QR compartido por el paciente | Necesita ver historial completo en la consulta sin fricción ni registro. |
| **Investigador clínico / CRO** (B2B) | Equipos en pharma, hospitales universitarios, CROs | Reclutamiento lento, caro y con riesgo de sesgo. 80% del tiempo del ensayo en reclutamiento. |

---

## 3. Features del MVP

### 3.1 B2C — App del paciente

#### F-001: Onboarding trust-first

- El usuario crea una cuenta con solo nombre (sin email obligatorio).
- Email opcional para recuperación de cuenta.
- La propuesta de valor (Health Vault) se muestra **antes** de pedir cualquier dato.
- El consentimiento de investigación va siempre al final del onboarding, nunca como bloqueante.
- **Criterio de éxito:** tasa de completion del onboarding > 80% en primeros 100 usuarios.

#### F-002: Health Vault

- Upload de estudios: foto desde cámara, archivo (PDF, imagen).
- OCR automático: extracción de fecha, tipo de estudio, categoría, valores clave.
- **Confirmación manual obligatoria:** el usuario valida los datos extraídos antes de guardar. Never auto-commit.
- Listado con filtros por tipo (laboratorio, imagen, receta) y por categoría terapéutica.
- Health Timeline: vista cronológica de todos los estudios.
- **Criterio de éxito:** OCR extrae correctamente fecha + tipo en > 85% de los estudios.

#### F-003: AI Copilot

- Chat en lenguaje natural sobre el historial médico del usuario.
- Contexto: top-K estudios relevantes del vault (retrieval semántico — ver ADR-005).
- Disclaimer permanente visible: *"No soy un médico. Esta información no reemplaza la consulta con tu médico."*
- Sugerencia de preguntas frecuentes para reducir fricción de primer uso.
- **Criterio de éxito:** CSAT de respuestas > 4.0/5.0 en primeras 100 sesiones.

#### F-004: QR Sharing

- El paciente genera un QR con expiración configurable (default: 24h).
- El médico accede a una vista read-only del vault vía URL, sin necesidad de registro.
- El paciente selecciona qué estudios incluir en el QR (no el vault completo por default).
- El QR expira automáticamente. El paciente puede revocarlo en cualquier momento.
- **Criterio de éxito:** flujo completo (generar QR → abrir en browser → ver estudios) en < 30 segundos.

#### F-005: Gestión familiar

- Un usuario puede crear y gestionar múltiples perfiles bajo su cuenta.
- Cada perfil tiene su propio vault y sus propios consentimientos independientes.
- El rol cuidador puede ver los perfiles pero no puede modificar consentimientos de otros perfiles.
- Switch de perfil desde la app sin re-autenticación.

#### F-006: Sistema de consentimiento 3 capas

- **Capa 1 (producto):** términos de uso. Requerido para usar la app. Versionado en DB.
- **Capa 2 (investigación):** consentimiento genérico para ser contactado para estudios clínicos.
- **Capa 3 (granular):** por área terapéutica — diabetes, oncología, cardiología, salud mental. Toggle independiente por área.
- **Centro de consentimiento:** historial completo de cambios y revocación en un tap.
- **Criterio de éxito:** revocación se aplica en < 5 segundos y se refleja en panel CRO en tiempo real.

### 3.2 B2B — Panel CRO

#### F-007: Dashboard de métricas

- KPIs en tiempo real: pacientes totales (anónimos), invitados por estudio, enrolled, dropout rate.
- Distribución terapéutica: breakdown por área de pacientes con consentimiento activo.
- Estudios activos con estado y progreso de funnel (invitado → interesado → consentido → enrolled).

#### F-008: Matching anónimo con fit score

- El investigador define criterios de inclusión/exclusión del estudio (campos clínicos normalizados).
- El sistema calcula un fit score (0–100) para cada paciente anónimo con consentimiento activo.
- El investigador ve perfiles `PAC-XXXX` ordenados por score.
- **Nunca se expone nombre, DNI, email ni ningún identificador.** El CRO no puede reverse-engineer la identidad.
- Resultado no se muestra si la cohorte tiene < 5 pacientes (k-anonimato mínimo).

#### F-009: Flujo de invitación a estudio

- Investigador selecciona un conjunto de perfiles anónimos y envía invitación con detalle del estudio.
- Paciente recibe push notification en su app con descripción del estudio.
- Paciente puede: aceptar, declinar, o posponer desde la app.
- El consentimiento de participación se registra en `consent_audit`.
- El investigador ve el estado del funnel en tiempo real sin saber la identidad del paciente hasta que este acepta y lo revela voluntariamente.

---

## 4. Features fuera del alcance del MVP (v2+)

| Feature | Justificación del diferimiento |
|---|---|
| Integración HealthKit / Google Fit | Requiere aprobación especial de Apple. Eject del Expo managed workflow. |
| Integración con laboratorios (HL7/FHIR) | Las instituciones en LATAM no tienen API FHIR. Requiere integraciones custom por institución. |
| Telemedicina / videoconsulta | Fuera del core value proposition. Agrega complejidad regulatoria significativa. |
| Marketplace de datos (paciente cobra) | Requiere estructura legal compleja. No es el modelo de negocio del MVP. |
| Dashboard analytics longitudinal para paciente | Requiere suficientes datos históricos para ser valioso. Post-MVP. |
| Firma digital de consentimiento (DocuSign / ZapSign) | Nice-to-have para CROs enterprise. No bloqueante para MVP. |

---

## 5. Métricas de éxito del MVP

| Métrica | Target | Cómo se mide |
|---|---|---|
| Completion rate onboarding | > 80% | Funnel: pantalla 1 → pantalla 6 |
| Estudios subidos por usuario activo (30 días) | > 3 | `avg(count(studies)) WHERE created_at > now()-30d` |
| Tasa de extracción OCR correcta | > 85% | `confirmed_as_correct / total_uploads` |
| Pacientes con consentimiento investigación activo | > 40% de usuarios activos | `consent_audit WHERE layer='research' AND granted=true` |
| Costo por paciente enrollado (benchmark CRO) | < $500 USD | Comparativo con baseline histórico del CRO partner piloto |
| CSAT Copilot | > 4.0 / 5.0 | Rating opcional post-respuesta |
| Latencia P95 del Copilot | < 4 segundos | Medición end-to-end (retrieval + API call) |

---

## 6. Dependencias críticas

- **Diseño UX/UI completo en Claude Projects** — input nativo para Claude Code. Cambios de pantallas post-aprobación suman tiempo real.
- **Aprobación del schema de consentimiento por asesor legal** — requerido antes de Fase 3.
- **API key de Google Document AI** — requerida antes del inicio de Fase 1.
- **Cuenta de desarrollador Apple + Google Play** — requerida antes de Fase 5 para TestFlight y Play Internal.

---

*Relacionado: RFC-001 | ADR-001 a ADR-005 | Tech Spec v1.0*
