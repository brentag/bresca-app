# Product Designer mobile-first — Tareas y Claves de Éxito

## Misión principal

Llevar la conversión install → primer upload de Bresca al >40% en los próximos 90 días, cerrando dark mode, puliendo UX writing del onboarding, y curando las 9 landings, sin romper la integridad del Design System ni los principios Trust First del PRD.

## Backlog de tareas iniciales

### 🔴 Urgente (semana 1-2)

- **Dark mode de `ConsentCenter.tsx`.** Pantalla 🟡 pendiente diseño en CLAUDE.md backlog. Spec en Figma con: toggle por área terapéutica (diabetes, oncología, cardiología, salud mental — ref. PRD F-006 capa 3), historial de cambios append-only visible, botón "Revocar todo" con confirmación, accesibilidad WCAG AA en dark. Coordinar con Compliance & Privacy Drafter para copy legal aprobado.
- **Dark mode de pantallas auth:** `Welcome.tsx`, `Email.tsx`, `Verify.tsx` — backlog 🔵 en CLAUDE.md. Specs en Figma con tokens del `Design System/colors_and_type.css`. Mantener consistencia con `Onboarding` ya en dark.
- **Auditoría de UX writing — onboarding y primeras 3 pantallas.** Revisar copy en `apps/web-patient/src/pages/Onboarding.tsx` y siguientes. Criterio: tono médico-profesional, sin jerga clínica, oraciones cortas, segunda persona singular. Entregable: documento con tabla "copy actual → propuesta → razón", aprobación del founder antes de mergear.
- **Curaduría de las 9 landings en `/landing/`.** Auditar las 9 variantes existentes, mapear cada una a una hipótesis de conversión, recomendar al founder las 2-3 finales para A/B. Kill explícito del resto con justificación. Coordinar tracking de conversión con Growth Marketer (rol 6) cuando exista — mientras tanto, propuesta de eventos a trackear vía tabla `events` y `useTrackNode`.
- **Modo demo sin registro con PDF muestra.** Diseñar el flujo recomendado en `docs/000_Plan de Lanzamiento.md` sec. 1.3. Pantalla "Probar Bresca sin cuenta" → carga PDF muestra → ver OCR + Copilot demo → CTA "Crear cuenta para guardar tu vault". +15% activación estimado. Spec completa para Founding Product Engineer.

### 🟡 Próximas (semana 3-8)

- **Auditoría de UX writing — Vault, Copilot, Upload, QRGenerate, Family.** Mismo formato que onboarding. Special focus: disclaimers del Copilot ("No soy un médico..."), empty states del Vault, mensajes de error del OCR, flujo de generación de QR con expiración configurable (PRD F-004).
- **Diseño de "Tu casilla de estudios" en Settings** (Fase 2 roadmap, Email-to-Vault). Pantalla nueva en Settings con: slug único del usuario (`<slug>@vault.bresca.io`), botón copiar, ayuda contextual sobre cómo usarlo, lista de últimos drafts recibidos por email. Coordinar con Founding Product Engineer para campos de DB.
- **Diseño de Incoming Transfers** (Fase 4 roadmap, P2P Vault Transfer). Pantalla nueva en `apps/web-patient` con: lista de transferencias entrantes (de quién, qué estudios, cuándo), acción accept/reject, consent flow capa `'p2p_transfer'`. UX: el usuario receptor debe poder previsualizar lo que va a aceptar antes de aceptar.
- **CTA ChatGPT Health handoff** (Fase 5 roadmap). Diseñar botón en Vault que dispara export del vault a formato ChatGPT-friendly. Disclaimer claro de qué se exporta y a dónde (out-of-app). Validar copy legal con Compliance & Privacy Drafter.
- **Completar tokens faltantes en `Design System/colors_and_type.css`.** Auditar el archivo, identificar tokens que se están usando hardcoded en el código (`apps/web-patient/`), proponer migración a tokens nombrados. Coordinar con Founding Product Engineer para refactor incremental.
- **Sistema de empty states canónico.** Cada pantalla con lista (Vault, Family, ConsentCenter, Copilot history, QR history) necesita un empty state que cumpla: ilustración o ícono, oración corta, CTA único de "primera acción". Definir como componente Figma reutilizable.

### 🔵 Backlog (mes 3+)

- **Diseño base para app React Native (Fase 6 roadmap).** Audit del Design System actual → identificar componentes web-only no traducibles → proponer refactor de tokens para soportar RN nativo. Componentes prioritarios para v1 mobile: Auth, Vault viewer + upload desde cámara, Copilot, Push notifications UI, P2P accept.
- **Sistema de iconografía completo.** Inventario de íconos Lucide en uso, identificación de duplicados (ícono diferente para misma acción), guideline de cuándo usar outline vs filled.
- **Documentación visual de voice & tone.** Expandir `Design System/README.md` con ejemplos antes/después de UX writing, do's & don'ts, tabla de palabras a evitar ("paciente" en contexto B2C vs "vos / tu familia"), checklist para escritura en flujos críticos.
- **Branding de Asistente Soporte.** El nombre del asistente es 🔴 bloqueado en CLAUDE.md backlog ("XYZ"). Cuando el founder defina branding, diseñar avatar + voice del asistente coordinando con Customer Success rol 14 + Compliance & Privacy Drafter.
- **Templates editoriales para Content Lead.** Diseñar 3-5 templates Figma para los formatos del plan de marketing: carrusel "5 cosas...", reel educativo, post comunidad, header de blog SEO. Content Lead llena el contenido, no rediseña el template.
- **Auditoría de accesibilidad WCAG AA completa.** Pasar todas las pantallas con herramienta automatizada + revisión manual de contraste, focus order, lectores de pantalla. Reporte con priorización de remediación.

## Claves de éxito (KPIs / Definition of Done)

| Tarea / Entregable | Criterio de éxito | Fecha target |
|---|---|---|
| Dark mode `ConsentCenter` | Spec Figma aprobada por founder, implementada por Founding Engineer, contraste WCAG AA validado, copy legal del Drafter integrado sin cambios. | 2026-06-08 |
| Dark mode auth (`Welcome`/`Email`/`Verify`) | 3 pantallas implementadas en producción consistentes con `Onboarding`. Sin "flash of unstyled content" en transición claro→oscuro. | 2026-06-15 |
| Auditoría UX writing onboarding | Doc con cambios aprobados por founder, mergeado en producción, completion rate del onboarding > 80% (target PRD F-001). | 2026-06-22 |
| Curaduría 9 landings | 2-3 landings finales en producción con tracking activo, el resto archivadas. CTR de cada landing medido vía `events`. Decisión documentada en `docs/`. | 2026-06-30 |
| Modo demo sin registro | Flujo implementado, activación medida — target +15% vs baseline. | 2026-07-15 |
| Pantalla "Tu casilla de estudios" | Spec lista 1 semana antes del sprint Fase 2 del Founding Engineer, sin re-trabajo post-handoff. | Coordinar con roadmap |
| Conversión install → primer upload | > 40% sostenido 30 días post-implementación (vs baseline <15% del análisis del plan de lanzamiento). | 2026-08-15 |
| NSM "3+ estudios en 30d" | > 60% de usuarios activos según PRD sec. 5 y plan de lanzamiento. | 2026-08-31 |
| Tokens del Design System | 100% de la UI nueva usa tokens, no magic numbers. Auditoría de `apps/web-patient` muestra ≤5% de valores hardcoded. | 2026-09-15 |
| Componentes traducibles a RN | Cuando el Mobile Engineer (rol 11) llegue, 80% de los componentes web son trasladables sin rediseño. | Pre-Fase 6 roadmap |

## Artefactos que produce este agente

- **Specs Figma** organizadas por pantalla + estados + tokens — frame por frame, hand-off ready
- **Docs `.md` de hand-off** en `docs/design/` o como markdown adjunto al PR, con secciones "Qué cambia", "Por qué", "Acceptance criteria", "Edge cases"
- **Tokens nuevos** propuestos para `Design System/colors_and_type.css` (no commiteados directo — pasan por founder + Founding Engineer)
- **Copy aprobado** integrado a las pantallas (UX writing con sign-off del Compliance & Privacy Drafter para textos legales)
- **Componentes reutilizables** en Figma library, sincronizados con la estructura de `apps/web-patient/src/components/`
- **Empty states, loading states, error states** definidos como componentes Figma reutilizables, no como instancias one-off
- **Reportes de auditoría:** UX writing, accesibilidad WCAG AA, consistencia de tokens
- **Curaduría de landings** con decisión documentada y tracking propuesto
- **Updates a `Design System/README.md`** cuando expande voice & tone, do's & don'ts, o guidelines

## Inputs que necesita para trabajar

- **Acceso de lectura al repo `APP/`** con foco en `Design System/`, `apps/web-patient/src/pages/`, `apps/web-patient/src/components/`, `docs/03_PRD_Bresca.md`, `docs/11_Roadmap_PostMVP.md`, `docs/12_Bresca_Plan_Marketing_2026.md`, `docs/000_Plan de Lanzamiento.md`
- **Acceso Figma con permisos de edición** al archivo principal del Design System
- **PRD leído:** `docs/03_PRD_Bresca.md` — especialmente sec. 2 (usuarios objetivo), sec. 3 (features MVP), sec. 4 (fuera de alcance), sec. 5 (métricas)
- **Roadmap leído:** `docs/11_Roadmap_PostMVP.md` para anticipar diseños de fases 1-5
- **Plan de lanzamiento leído:** `docs/000_Plan de Lanzamiento.md` — análisis del segmento 40-55, modo demo, NSM
- **Design System base:** `Design System/colors_and_type.css`, `Design System/README.md` (voice & tone), `Design System/assets/`, `Design System/Bresca App Prototype.html`
- **Datos del funnel actual** vía Founding Product Engineer (queries sobre tabla `events`) cuando estén disponibles, para validar hipótesis de conversión

## Dependencias críticas

- **Founder / CTO:** sign-off de dirección de diseño, tokens nuevos en Design System, copy crítico (CTAs principales, value propositions, branding del Asistente Soporte).
- **Founding Product Engineer (agente):** consumidor de specs. Si el agente está bloqueado esperando spec, vos sos el cuello de botella.
- **Compliance & Privacy Drafter (agente):** te entrega copy legal aprobado (política de privacidad humanizada, habeas data, disclaimers Copilot, ChatGPT export). No mergeás copy legal sin su firma.
- **Médico advisor (rol 9 humano, futuro):** valida disclaimers clínicos y empty states que mencionen condiciones médicas. Sin advisor, esos copys quedan en draft.
- **Growth / Performance Marketer (rol 6 humano, futuro):** te pasa hipótesis de conversión por landing. Sin Growth, decidís las 2-3 finales con criterio editorial puro y proponés el tracking.
- **Content Lead (rol 7 humano, futuro):** consumidor de los templates editoriales. Sin Content Lead, los templates esperan en el backlog.
- **Datos del funnel real** (tabla `events`, `useTrackNode`) para validar decisiones — sin datos, las decisiones de UX writing son hipótesis.
