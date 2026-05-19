# RFC-001 — Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **RFC-ID** | RFC-001 |
| **Estado** | `DRAFT` → `IN REVIEW` → `ACCEPTED` |
| **Autor** | Engineering Lead |
| **Fecha** | Abril 2026 |
| **Versión** | 1.0 |

---

## 1. Resumen ejecutivo

Este RFC define el problema técnico central de Bresca: los pacientes no tienen control real sobre sus datos médicos dispersos, y los investigadores clínicos no pueden acceder a cohortes calificadas sin violar privacidad. Bresca resuelve ambos lados con una arquitectura two-sided basada en consentimiento auditado y anonimización estructural. Ver [[03_PRD_Bresca|PRD]] para features del MVP y [[02_ADR_Bresca|ADR]] para decisiones técnicas derivadas.

---

## 2. Problema

### 2.1 Contexto

- Los registros médicos de un paciente están fragmentados entre múltiples instituciones, apps y formatos.
- Los investigadores clínicos (CROs) necesitan meses para reclutar cohortes calificadas — el 80% del tiempo de un ensayo clínico se gasta en reclutamiento.
- Los sistemas de consentimiento actuales son binarios (acepta todo / rechaza todo) — no existe granularidad por área terapéutica.

### 2.2 Pain points por actor

| Actor | Pain point | Impacto |
|---|---|---|
| Paciente | Historial médico en papel / múltiples apps sin interop | No puede compartir datos completos con su médico |
| Paciente | No sabe qué estudios clínicos existen para su condición | Oportunidades terapéuticas perdidas |
| CRO / Investigador | Reclutamiento manual: llamadas, formularios, BBDD privadas | Costo por paciente enrollado: $5.000–$15.000 USD |
| CRO / Investigador | No puede verificar criterios de inclusión sin ver datos identificados | Riesgo legal, sesgo de selección |
| Sistema de salud | Consentimiento sin auditoría verificable | Incumplimiento LGPD / Ley 25.326 |

### 2.3 Qué NO es este problema

- Bresca **no es un EMR** — no reemplaza los sistemas hospitalarios.
- Bresca **no es telemedicina** — no conecta paciente con médico en tiempo real.
- Bresca **no es un marketplace de datos** — el paciente nunca "vende" sus datos, solo los licencia bajo consentimiento explícito y revocable.

---

## 3. Propuesta de solución

### 3.1 Arquitectura conceptual

> **Two-Sided Network:** el valor para el paciente (organizar su historial) genera el activo para el CRO (cohortes calificadas anónimas). Ninguno de los dos lados funciona sin el otro.

- **Lado B2C — Health Vault:** repositorio personal de estudios médicos con OCR + extracción automática de campos clínicos (F-002 en [[03_PRD_Bresca|PRD]]).
- **Lado B2B — CRO Panel:** acceso anonimizado a cohortes con fit score por criterio clínico. El CRO nunca ve nombre, DNI ni ningún identificador (F-007, F-008 en [[03_PRD_Bresca|PRD]]).
- **Puente — Sistema de consentimiento:** 3 capas (producto / investigación / área terapéutica) con auditoría en DB. Revocable en cualquier momento (F-006 en [[03_PRD_Bresca|PRD]]).

### 3.2 Decisiones de diseño que define este RFC

| Decisión | Opción elegida | Razón |
|---|---|---|
| Identificación de usuarios | Sin email obligatorio en onboarding | Trust-first: reducir fricción de entrada. Email opcional para recovery. |
| Anonimización | Estructural en query layer (vistas SQL) | CRO Panel consulta vistas sin PII — no hay proceso de re-identificación posible |
| Consentimiento | 3 capas granulares con auditoría en DB | Requisito LGPD Art. 7 + estándar ICH GCP para investigación clínica |
| OCR | Google Document AI + confirmación manual obligatoria | Extracción automática siempre pasa por validación humana — no auto-commit |
| Copilot IA | Claude API con contexto del vault del usuario | Disclaimer no-diagnóstico. Nunca procesa datos de otros usuarios. |

Detalle de cada decisión en [[02_ADR_Bresca|ADR-001 a ADR-005]].

---

## 4. Alternativas consideradas y descartadas

| Alternativa | Por qué se descartó |
|---|---|
| FHIR como formato estándar | Overhead de implementación excesivo para MVP. Las instituciones en LATAM no tienen FHIR nativo. Schema propio diseñado como migrable a FHIR en v2. |
| Tokenización diferenciada | Agrega complejidad criptográfica sin necesidad. Anonimización por vistas SQL + RLS es suficiente y auditable. |
| Marketplace de datos | Alta fricción regulatoria en Argentina/Brasil. Requiere estructura legal compleja. Fuera del alcance del MVP. |
| Multi-tenant con schema único | RLS con schemas por tenant es más seguro para datos médicos. El aislamiento es non-negotiable. |

---

## 5. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| OCR inconsistente según tipo de documento | Alta | Alto | Confirmación manual obligatoria. Never auto-commit. (ver [[03_PRD_Bresca|PRD F-002]]) |
| Brecha en RLS con multi-perfil familiar | Media | Crítico | Test suite dedicado. Auditoría en Fase 5. (Testear en [[09_TestPlan_Bresca|TestPlan TS-015, TS-016]]) |
| Context window del Copilot excede límites | Media | Medio | Chunking + selección semántica de estudios relevantes. (Ver [[02_ADR_Bresca|ADR-005]]) |
| Normalización OCR inconsistente con criterios CRO | Alta | Alto | Definir schema de campos en Fase 1 antes del matching. (Schema en [[04_TechSpec_Bresca|TechSpec]]) |

---

## 6. Criterios de aceptación

- [ ] El equipo de ingeniería ha revisado y no tiene objeciones bloqueantes.
- [ ] El schema de consentimiento auditado está aprobado por el asesor legal.
- [ ] El modelo de anonimización (vistas SQL sin PII) está validado por el DPO o responsable de privacidad.
- [ ] Las decisiones técnicas del RFC-001 están reflejadas en [[02_ADR_Bresca|ADR-001 a ADR-005]].

---

## 7. Próximos pasos

- Abrir período de comentarios: 5 días hábiles.
- Incorporar feedback en versión 1.1.
- Mover estado a `ACCEPTED` e iniciar implementación Fase 1.
- Crear ADRs derivados para cada decisión técnica listada en sección 3.2.

---

## Ver también

- [[00_INDEX|Índice maestro del vault]]
- [[02_ADR_Bresca|ADR — Architecture Decision Records]]
- [[03_PRD_Bresca|PRD — Product Requirements Document]]
- [[04_TechSpec_Bresca|Tech Spec — Technical Specification]]
- [[05_SystemDesign_Bresca|System Design Document]]
- [[14_Security_Audit_2026-05-07|Auditoría de Seguridad]]
- [[22_EmailToVault_Spec|Email-to-Vault — spec del módulo]]

---

*Supersede: ninguno | Supersedido por: ninguno (vigente)*
