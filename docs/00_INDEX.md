---
tags: [índice, vault, navegación, master]
created: 2026-05-18
---

# 00 — Índice maestro del vault Bresca

| Campo | Valor |
|---|---|
| **Vault root** | `docs/` |
| **Convención de nombres** | `NN_Nombre_Bresca.md` para canon numerado · `checkpoint_deploy_YYYY-MM-DD.md` para diarios · sin prefijo para docs estratégicos legacy |
| **Wikilinks** | `[[archivo]]` o `[[archivo\|texto visible]]` · sin la extensión `.md` |
| **Idioma** | Español rioplatense |

Este documento es la **puerta de entrada al vault**. Cualquier agente nuevo en Bresca debería empezar por `CLAUDE.md` (raíz del repo) y este índice.

---

## Documentos canónicos numerados

### Producto y arquitectura

| # | Doc | Descripción |
|---|---|---|
| 01 | [[01_RFC-001_Bresca\|RFC-001 — Bresca Patient Data Network]] | Problema, propuesta y alcance MVP. Toda la arquitectura deriva de acá. |
| 02 | [[02_ADR_Bresca\|ADR — Architecture Decision Records]] | ADR-001 a ADR-006 inmutables (Supabase, anonimización por vistas, RN Expo, consent append-only, Claude Copilot). |
| 03 | [[03_PRD_Bresca\|PRD — Product Requirements]] | F-001 Onboarding, F-002 Vault+OCR, F-003 Copilot, F-004 QR, F-005 Familia, F-006 Consentimiento, F-007/008/009 CRO. |
| 04 | [[04_TechSpec_Bresca\|Tech Spec]] | Stack, schema de DB, RLS, estructura del monorepo, setup local. |
| 05 | [[05_SystemDesign_Bresca\|System Design]] | Arquitectura de alto nivel, flujos de datos, escalabilidad, decisiones de seguridad. |
| 08 | [[08_SystemPromptSpec_Bresca\|System Prompt Spec — AI Agents]] | Specs de los system prompts del Copilot y Soporte. Versionado V1, V2... |

### Operaciones

| # | Doc | Descripción |
|---|---|---|
| 06 | [[06_Runbook_Bresca\|Runbook — Operational Guide]] | Entornos, setup local, deploys, procedimientos de operación. |
| 07 | [[07_PostMortem_Bresca\|Post-Mortem template]] | Template blameless para post-mortems de incidentes. |
| 15 | [[15_Incident_Response_Plan\|Plan de Respuesta a Incidentes]] | Clasificación P1-P4 + INC-001..INC-005 (incluye brecha de seguridad). |
| 16 | [[16_Prod_Setup_Guide\|Guía de Setup de Producción]] | Configurar instancia nueva o migrar staging → prod con dominio propio. |
| 20 | [[20_ObservabilityPlan_Bresca\|Plan de Observabilidad, Resiliencia & SRE]] | Sentry + Axiom + UptimeRobot + opossum + pino + OTel. Rollout 4 fases. |

### Testing y QA

| # | Doc | Descripción |
|---|---|---|
| 09 | [[09_TestPlan_Bresca\|Test Plan — Bresca MVP]] | 26 escenarios simulados con Claude Haiku (agente Orange). |
| 10 | [[10_TestResults_Bresca\|Test Results — ejecución agente Orange]] | Resultados del plan, 5 issues encontrados (2 críticos: Family + TS-016). |
| 18 | [[18_UserTestingChecklist\|Checklist de Pruebas de Usuario]] | ~180 ítems con checkbox para QA manual end-to-end. |

### Seguridad

| # | Doc | Descripción |
|---|---|---|
| 14 | [[14_Security_Audit_2026-05-07\|Auditoría de Seguridad — Bresca MVP]] | 15 hallazgos (2 críticos, 5 altos, 5 medios, 3 bajos). 5 todavía abiertos. |

### Research técnico

| # | Doc | Descripción |
|---|---|---|
| 21 | [[21_DICOM_Viewer_Research\|DICOM Viewer en el Browser — research exhaustivo]] | Transfer syntaxes, modalidades, librerías WASM, sprints implementados. Base para el viewer actual. |

### Módulos técnicos

| # | Doc | Descripción |
|---|---|---|
| 22 | [[22_EmailToVault_Spec\|Email-to-Vault — spec del módulo]] | Webhook Postmark, parser magic bytes, anti-SSRF + DNS rebinding, rate limit en DB. |

---

## Documentos estratégicos y de equipo

| # | Doc | Descripción |
|---|---|---|
| 00 | [[00_bresca_mvp_plan\|Plan MVP — 13 semanas, 5 fases]] | Plan original de desarrollo del MVP. Mayoría completa. |
| 000 | [[000_Plan de Lanzamiento\|Análisis pre-lanzamiento + Beta 200 usuarios]] | Benchmarks PHR, recomendaciones de funnel, plan beta cerrada. |
| 11 | [[11_Roadmap_PostMVP\|Roadmap Post-MVP v2.0]] | 5 fases: Polish, Email-to-Vault, DICOM, P2P Transfer, ChatGPT handoff. |
| 12 | [[12_Bresca_Plan_Marketing_2026\|Plan de Marketing v1]] | Adquisición primeros 5K usuarios en 3-6 meses. |
| 12.1 | [[12.1_Bresca_Plan_Marketing_2026\|Plan de Lanzamiento y Marketing v2]] | Segunda iteración (2026-05-13) con skills marketing-growth-hacker. |
| 13 | [[13_Analisis de Codigo y Arquitectura\|Análisis de Código y Arquitectura]] | Solutions Architect review — propuestas async para Vault. |
| 17 | [[17_PreLaunch_Checklist\|Checklist Pre-Lanzamiento]] | 24 ítems BLOQUEANTES para go-live público con dominio propio. |
| 19 | [[19_TEAM_ROLES\|Definición de Equipo y Roles Recomendados]] | 14 roles priorizados por urgencia (legal, dev, design, security, growth, mobile). |
| — | [[CTO_CEO_Briefing_Bresca\|Briefing CTO → CEO]] | Estado real del producto, riesgos legales, próximos pasos. |

---

## Documentos operativos (diarios)

Checkpoints de deploy auto-generados por hook `.claude/hooks/`. Uno por día con publicaciones.

```
docs/checkpoint_deploy_2026-04-25.md
…
docs/checkpoint_deploy_2026-05-19.md
```

No requieren wikilinks cruzados — son logs append-only.

Subdirectorios:
- `docs/qa-mobile/` — reportes QA en mobile (pendiente cuando exista app RN)
- `docs/qa-reports/` — reportes de post-deploy-qa.mjs
- `docs/superpowers/` — drafts y notas exploratorias

---

## Agentes Hermes (JOBDs)

Tres roles humanos descritos como Job Descriptions detalladas en `agents/`. No son agentes autónomos — son specs para el día que se incorpore una persona real al equipo.

| Carpeta | Rol | Propósito |
|---|---|---|
| `agents/founding-product-engineer/` | Founding Product Engineer | Par técnico del CTO. Co-owner de pipeline OCR, DICOM viewer, RLS multi-profile, monitoring. Reduce bus factor de 1 a 2. |
| `agents/product-designer-mobile-first/` | Product Designer mobile-first | Design System completo, dark mode pendiente, UX writing español, curaduría de las 9 landings, base para app React Native. |
| `agents/compliance-privacy-drafter/` | Compliance & Privacy Drafter | Drafts AAIP, política de privacidad humanizada, cláusulas transferencia internacional US Ohio, protocolo habeas data, owner INC-005. |

Cada carpeta tiene tres archivos: `role.md` (identidad + alcance), `behavior.md` (cómo trabaja), `tasks.md` (entregables concretos).

---

## Convenciones del vault

### Tags Obsidian sugeridos

- `#producto` — RFC, PRD, ADR
- `#arquitectura` — Tech Spec, System Design
- `#seguridad` — Auditoría, plan incidentes, observabilidad
- `#operaciones` — Runbook, prod setup, checkpoints
- `#testing` — Test plan, test results, user testing
- `#estrategia` — Roadmap, marketing, plan de lanzamiento, team roles
- `#módulo` — Specs específicas (Email-to-Vault, DICOM)
- `#agentes` — JOBDs Hermes

### Frontmatter para docs nuevos

```yaml
---
tags: [categoría, sub-categoría]
created: YYYY-MM-DD
---
```

### Wikilinks recomendados

- Siempre **sin** prefijo `docs/` y **sin** extensión `.md`
- Usar `|` para alias legibles: `[[14_Security_Audit_2026-05-07|Auditoría de Seguridad]]`
- Para referenciar el README del repo: `CLAUDE.md` (no es parte del vault, es contexto del agente)

### Numeración

- Prefijos `00`-`99` reservados para canon estable.
- `0NN` y `0NN.1` permitidos para sub-versiones legacy (ej. `12.1`).
- Sin prefijo: aceptado solo para legacy (`CTO_CEO_Briefing_Bresca.md`).
- Conflictos resueltos en este reordenamiento (2026-05-18):
  - `11_ObservabilityPlan_Bresca.md` → `20_ObservabilityPlan_Bresca.md`
  - `18_DICOM_Viewer_Research.md` → `21_DICOM_Viewer_Research.md`

---

## Ver también

- `CLAUDE.md` — contexto del agente Claude Code (raíz del repo)
- `AGENTS.md` — zonas de autonomía del agente
- [[01_RFC-001_Bresca]] · [[04_TechSpec_Bresca]] · [[05_SystemDesign_Bresca]] · [[14_Security_Audit_2026-05-07]]
