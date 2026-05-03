# Bresca App — Plan de Desarrollo MVP
**UX/UI Prototype → MVP Funcional**  
Fecha: Abril 2026 | Equipo: 1 dev + Claude Code | Stack: React Native + React Web + Node.js + Supabase

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Duración total | ~13 semanas |
| Estimación original (sin diseño listo) | ~22 semanas |
| Reducción por diseño nativo en Claude Projects | ~9 semanas (~40%) |
| Fases | 5 |
| Interfaces | 2 (B2C mobile + B2B web) |

**Variable clave:** el diseño en Claude Projects como input nativo para Claude Code elimina scaffolding UI, interpretación de pantallas e iteraciones visuales. El tiempo restante corresponde exclusivamente a lógica de backend, integraciones y seguridad — donde no hay shortcut.

---

## Stack técnico

| Capa                   | Tecnología                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| Mobile B2C             | React Native (Expo) — pendiente                                         |
| Web B2C (paciente)     | Vite + React SPA — **en producción**                                    |
| Web B2B (CRO)          | Vite + React SPA — pendiente deploy                                     |
| Backend                | Node.js + Express                                                       |
| Base de datos          | PostgreSQL vía Supabase                                                 |
| Auth + Storage         | Supabase (RLS, buckets)                                                 |
| OCR                    | ~~Google Document AI~~ → **Tesseract.js + pdf-parse + DeepSeek**        |
| AI Copilot / Asistente | ~~Claude API~~ → **DeepSeek (`deepseek-chat`)** — API OpenAI-compatible |
| Notificaciones         | expo-notifications (iOS + Android) — pendiente                          |
| Deploy backend         | ~~Railway~~ → **Render.com** (https://bresca-api.onrender.com)          |
| Deploy web             | **Vercel** (https://bresca-app-api.vercel.app)                          |
| Compliance base        | RLS por usuario/perfil, consentimiento auditado en DB                   |

> **Nota (2026-05-02):** Stack ajustado durante el desarrollo del MVP para reducir dependencias externas y costos. OCR no requiere API de terceros — pipeline completo en el servidor propio.  
> Ver decisiones detalladas en `checkpoint_deploy_2026-05-02.md`.

---

## Fase 1 — Fundación + Auth + Vault básico
**Semanas 1–2**

### Objetivo
Infraestructura funcional con auth operativo y primer flujo de carga de estudios médicos.

### Features

| Feature | Estimación | Notas |
|---|---|---|
| Setup repo, Supabase, RLS base, CI básico | 2 días | Estructura de tablas: usuarios, perfiles, estudios, consentimientos |
| Auth onboarding trust-first | 4 días | Sin email obligatorio. Pantallas ya diseñadas → Claude Code las implementa directas. KYC básico diferido |
| Health Vault: upload foto/archivo + storage | 3 días | Supabase Storage, validación de tipos, preview en app |
| OCR pipeline: integración + extracción + confirmación | 5 días | **Backend real.** Integración Doc AI, parseo de campos clínicos (fecha, categoría, valores), pantalla de confirmación editable |

### Entregable al cierre
Usuario puede registrarse, subir un estudio médico y ver los datos extraídos automáticamente.

---

## Fase 2 — Core B2C: Vault + Copilot + QR + Familia
**Semanas 3–5**

### Objetivo
La propuesta de valor central de la app para el paciente: su historial organizado, el copilot IA y la portabilidad.

### Features

| Feature | Estimación | Notas |
|---|---|---|
| Vault: listado, filtros por tipo/categoría, timeline | 4 días | Diseño listo → implementación directa. Filtros por laboratorio, imagen, receta. Color-coded por tipo |
| AI Copilot: integración Claude API + contexto vault | 5 días | **Backend real.** Chunking del vault para context window, selección de estudios relevantes, disclaimer no-diagnóstico |
| QR sharing: token temporal + vista médico sin registro | 3 días | Token con expiración configurable. Vista web read-only para el médico, zero friction |
| Gestión familiar: multi-perfil bajo una cuenta | 3 días | RLS por perfil (no por cuenta). Switch de perfil en app. Cuidador como rol especial |

### Entregable al cierre
App B2C funcional end-to-end: vault completo, copilot respondiendo con contexto real del usuario, QR compartible y gestión de familia.

---

## Fase 3 — Sistema de Consentimiento 3 Capas + Notificaciones
**Semanas 6–8**

### Objetivo
El puente entre B2C y B2B: el sistema de consentimiento auditado es el activo que hace posible el panel CRO.

### Features

| Feature | Estimación | Notas |
|---|---|---|
| Capa 1: términos de uso del producto | 3 días | Requerido para usar la app. Auditado en DB con timestamp, versión de ToS y user agent |
| Capa 2: consentimiento investigación + Capa 3: granular por área terapéutica | 4 días | **Backend real.** Toggle por área (diabetes, oncología, cardiología, salud mental). Cambio aplicado al instante, sin consecuencias al revocar |
| Centro de consentimiento: historial + revocación | 2 días | Vista completa de qué autorizó el usuario y cuándo. Revocación en un tap |
| Push notifications: invitación a estudio + QR expirado | 4 días | **Integración real.** expo-notifications, certificados iOS/Android, estados en background |

### Entregable al cierre
Sistema de consentimiento de 3 capas funcional con auditoría completa en DB. Notificaciones push operativas en ambas plataformas.

> ⚠️ **Orden crítico:** esta fase debe completarse antes de activar cualquier flujo CRO. El panel B2B depende de usuarios con datos y consentimiento auditado.

---

## Fase 4 — Panel CRO B2B
**Semanas 9–11**

### Objetivo
Interfaz para investigadores clínicos: métricas de estudios, matching anónimo de pacientes y gestión del funnel de reclutamiento.

### Features

| Feature | Estimación | Notas |
|---|---|---|
| Auth CRO separado + roles (admin / researcher) | 2 días | Auth independiente del B2C. Roles con permisos distintos |
| Dashboard: métricas agregadas, estudios activos, funnel | 4 días | Diseño listo → implementación directa. KPIs: pacientes totales, invitados, enrolled, dropout rate |
| Matching anónimo + fit score por criterio clínico | 5 días | **Backend real.** Lógica de scoring: normalizar campos del vault contra criterios del estudio. 100% anónimo — CRO nunca ve datos identificables |
| Flujo invitación → paciente → consentimiento → confirmación | 4 días | Integra panel CRO con app B2C. Push notification al paciente, consent flow, confirmación en panel |

### Entregable al cierre
Panel CRO funcional: investigador puede ver métricas, explorar pacientes anónimos con fit score, invitar a un estudio y seguir el funnel completo.

---

## Fase 5 — QA, Hardening y Deploy
**Semanas 12–13**

### Objetivo
MVP listo para primeros usuarios reales. Seguridad auditada, performance validada, deploy en producción.

### Features

| Feature | Estimación | Notas |
|---|---|---|
| Auditoría RLS: casos edge multi-perfil + QR + acceso CRO | 3 días | Escenarios críticos: perfil familiar accediendo vault de otro perfil, token QR expirado, CRO intentando acceder datos identificables |
| E2E testing flows críticos | 4 días | Onboarding → upload → OCR → vault → copilot → QR → consentimiento → invitación estudio → CRO funnel |
| Performance: OCR bajo carga + Copilot con vault grande | 2 días | Vault con 20+ estudios como caso de stress para contexto Copilot. OCR con imágenes de baja calidad |
| Deploy final: Railway + Vercel + stores | 3 días | TestFlight (iOS) + Play Internal Testing (Android) + dominio CRO en Vercel |

### Entregable al cierre
MVP en producción. URLs del panel CRO activas. App distribuida a testers internos vía TestFlight y Play Internal.

> ⚠️ **No reducir esta fase.** En datos médicos, los bugs de permisos que se encuentran en QA valen más que cualquier semana ahorrada. RLS con multi-perfil + QR + acceso CRO son tres superficies de error que interactúan entre sí.

---

## Dónde va el tiempo real (lo que no se acelera con diseño)

Estas 5 piezas son lógica de backend pura. El diseño no las acelera. Acortarlas es riesgo directo de bugs en producción con datos médicos.

| Componente | Por qué es complejo |
|---|---|
| OCR + normalización clínica | Calidad variable por documento (foto de receta vs PDF de laboratorio). Los campos clínicos no siempre vienen en el mismo formato. Requiere lógica de fallback y pantalla de confirmación editable |
| RLS multi-perfil + QR + CRO | Tres superficies de acceso que interactúan: perfil familiar, token temporal de médico, acceso anónimo de investigador. Un bug acá expone datos médicos |
| Matching anónimo con fit score | El score depende de qué tan bien el OCR normalizó los datos. Si el vault tiene "HbA1c: 7.8%" en texto libre y el criterio del estudio es "HbA1c > 7.5% en últimos 6 meses", la lógica de matching necesita parseo semántico |
| Copilot con vault grande | Context window limitado. Con 20+ estudios, hay que seleccionar los relevantes para cada pregunta sin perder coherencia clínica |
| Push notifications React Native | Configuración de certificados iOS/Android, manejo de estados en background, deep links desde notificación hacia pantalla correcta |

---

## Top 5 riesgos técnicos

| # | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| 1 | OCR inconsistente por calidad de imagen | Alto | Pantalla de confirmación editable obligatoria. Definir schema de campos esperados en Fase 1 |
| 2 | RLS + multi-perfil + QR = superficie de error compleja | Alto | Auditoría de RLS dedicada en Fase 5. Tests de penetración básicos |
| 3 | Matching anónimo depende de calidad de normalización OCR | Alto | Definir el contrato de datos (campos normalizados) en Fase 1 antes de diseñar el matching |
| 4 | Copilot con contexto clínico grande supera tokens | Medio | Implementar chunking y selección semántica de estudios relevantes desde el día 1 del Copilot |
| 5 | Push notifications: edge cases iOS en background | Medio | Testear en dispositivos físicos desde Fase 3, no solo simuladores |

---

## Supuestos críticos

1. **El diseño UX/UI en Claude Projects es completo y estable.** Cambios de scope en pantallas son el principal vector de retraso. Cualquier pantalla nueva fuera del prototipo suma tiempo real.

2. **El dev tiene experiencia previa en React Native y Supabase.** La estimación no incluye curva de aprendizaje.

3. **Compliance se limita a RLS + auditoría en DB.** HIPAA completo, SOC 2 o certificación LGPD formal están fuera del alcance del MVP.

4. **OCR se integra con un único proveedor desde el inicio** (Google Document AI). Si se necesita cambiar de proveedor o agregar fallback, sumar ~3 días.

5. **Claude Code actúa como co-developer real** — generación de componentes desde pantallas, debugging, tests unitarios. La estimación asume ~40% de aceleración sobre un dev solo en las partes de UI. Las integraciones de backend mantienen su estimación original.

---

## Cronograma visual

```
Sem  1  2  3  4  5  6  7  8  9  10 11 12 13
     ├──────┤
F1   Fundación + Auth + Vault + OCR
              ├──────────┤
F2            Vault UI + Copilot + QR + Familia
                          ├──────────┤
F3                        Consentimiento + Push
                                      ├──────────┤
F4                                    Panel CRO B2B
                                                ├─────┤
F5                                              QA + Deploy
```

---

## Criterios de éxito del MVP

- [ ] Paciente puede completar onboarding, subir un estudio y ver datos extraídos por OCR
- [ ] Copilot responde preguntas con contexto real del vault del usuario
- [ ] Médico accede al vault vía QR sin crear cuenta
- [ ] Familiar puede gestionar perfiles bajo una cuenta con permisos correctos
- [ ] Usuario puede otorgar y revocar consentimiento granular en cualquier momento
- [ ] Investigador CRO ve pacientes anónimos con fit score sin acceder a datos identificables
- [ ] Flujo completo invitación → consentimiento → enrollment funcional end-to-end
- [ ] RLS auditado: ningún perfil accede datos de otro perfil bajo ningún escenario

---

## Mejoras post-MVP documentadas

Estas mejoras están fuera del alcance del MVP pero deben ser consideradas en la siguiente fase de producto.

### OCR — Calidad y validación cruzada

**Objetivo:** alcanzar un score de reconocimiento de campos clínicos > 95%, validado por dos motores independientes.

**Motivación:** el MVP usa DeepSeek Vision como único motor de OCR para imágenes. Un único motor no permite detectar errores de extracción silenciosos (campos que parecen extraídos correctamente pero tienen valores incorrectos). En contexto médico, un valor erróneo no detectado es más peligroso que un campo vacío.

**Propuesta técnica:**
- Correr dos motores de OCR en paralelo sobre el mismo documento (ej: DeepSeek Vision + Google Document AI, o Tesseract + DeepSeek)
- Comparar los campos extraídos por ambos motores campo por campo
- Si los valores coinciden → confianza alta, marcar como verificado automáticamente
- Si difieren → marcar el campo como "baja confianza" y resaltarlo en la pantalla de revisión para que el usuario lo corrija
- Score de confianza por campo visible en la UI (ej: ✅ verificado / ⚠️ revisar)

**Métricas de éxito:**
- ≥ 95% de campos numéricos extraídos correctamente en un dataset de 100 estudios de laboratorio típicos de LATAM
- Tasa de discrepancia entre motores < 5% en estudios de buena calidad

**Dependencias:**
- Requiere activar Google Document AI (GOOGLE_DOCAI_KEY — rotación mensual, ver variables de entorno)
- La comparación puede correr en la Edge Function o en un segundo paso del pipeline
- El campo de confianza podría almacenarse como metadata en `extracted_fields` (ej: `{ "Glucemia": "98 mg/dL", "_conf_Glucemia": "high" }`) o en una columna separada `field_confidence jsonb`

---

*Bresca App — UX/UI Prototype → MVP Lean*  
*Contacto: bresca.health | erelan@bresca.health*
