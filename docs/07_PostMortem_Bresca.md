# Post-Mortem Template
## Bresca Patient Data Network

| Campo | Valor |
|---|---|
| **Versión** | 1.0 — Template |
| **Filosofía** | Blameless. Los sistemas fallan, no las personas. |
| **Dueño** | Engineering Lead |
| **Fecha** | Abril 2026 |

---

## Filosofía del Post-Mortem en Bresca

Los Post-Mortems en Bresca son **blameless** por diseño. El objetivo no es encontrar culpables sino entender por qué el sistema falló y cómo prevenirlo. Toda falla es una oportunidad de aprendizaje. Los Post-Mortems se publican internamente y son accesibles para todo el equipo.

> **Regla de oro (Google SRE):** si el mismo tipo de incidente ocurre dos veces, es falla del sistema, no de la persona. El sistema no tenía los safeguards necesarios.

**Cuándo hacer un Post-Mortem:**
- Todo incidente SEV-1 (crítico) — obligatorio.
- Incidentes SEV-2 (mayor) que duraron > 30 minutos — obligatorio.
- Incidentes SEV-3 (menor) a discreción del Engineering Lead.

---

## Template

> Copiar desde aquí para cada nuevo Post-Mortem.
> Archivo: `docs/post-mortems/PM-NNN_titulo-breve.md`

---

### Encabezado

| Campo | Valor |
|---|---|
| **ID** | PM-NNN |
| **Título** | [Descripción breve del incidente] |
| **Fecha del incidente** | YYYY-MM-DD HH:MM UTC |
| **Duración** | X horas Y minutos |
| **Severidad** | SEV-1 / SEV-2 / SEV-3 |
| **Autor del PM** | [Nombre] |
| **Revisores** | [Nombres] |
| **Estado** | `DRAFT` / `IN REVIEW` / `ACCEPTED` |

---

### 1. Resumen ejecutivo

> Máximo 5 líneas. Qué pasó, cuándo, cuánto duró, cuántos usuarios impactados, si hubo exposición de datos. Debe poder leerse en 30 segundos.

[Completar aquí]

---

### 2. Impacto

| Dimensión | Detalle |
|---|---|
| Usuarios afectados | N usuarios / N% de la base activa |
| Funcionalidades afectadas | [Lista de features no disponibles] |
| Duración del impacto | Desde HH:MM UTC hasta HH:MM UTC |
| Exposición de datos | Sí / No. Si sí: qué datos, cuántos usuarios |
| Impacto en CRO Partners | Sí / No |
| Costo estimado | $X en tokens / X% SLA afectado |

---

### 3. Timeline del incidente

> Cronología exacta con timestamps UTC. Un evento por línea. Sin juicios de valor.

| Timestamp (UTC) | Evento |
|---|---|
| YYYY-MM-DD HH:MM | Primera alerta / primer reporte del problema |
| HH:MM | Confirmación del incidente. Quién lo detectó y cómo. |
| HH:MM | Escalation a Engineering Lead. |
| HH:MM | Primera hipótesis de causa raíz. |
| HH:MM | Hipótesis descartada / confirmada. |
| HH:MM | Workaround o mitigación parcial aplicada. |
| HH:MM | Fix permanente deployado. |
| HH:MM | Verificación de que el sistema opera normalmente. |
| HH:MM | Comunicación a usuarios afectados (si aplica). |

---

### 4. Causa raíz (RCA)

> Los 5 Whys: preguntar "por qué" hasta llegar a la causa sistémica, no a la proximal.

**Why 1:** ¿Qué falló? (síntoma observable)
> [Respuesta]

**Why 2:** ¿Por qué falló eso? (causa directa)
> [Respuesta]

**Why 3:** ¿Por qué existía esa causa? (proceso o sistema que la permitió)
> [Respuesta]

**Why 4:** ¿Por qué ese proceso existía de esa forma? (decisión de diseño o gap)
> [Respuesta]

**Why 5:** ¿Cuál es la causa sistémica raíz?
> [Respuesta — esto es lo que el sistema de prevención no tenía]

---

### 5. Qué salió bien

> Listar explícitamente qué funcionó. Detección temprana, respuesta rápida, comunicación efectiva, herramientas que ayudaron. Esto refuerza los comportamientos positivos.

- [Ejemplo: El monitoreo de UptimeRobot detectó la caída en < 5 minutos]
- [Ejemplo: El Runbook INC-001 fue seguido correctamente y redujo el MTTR]

---

### 6. Qué salió mal

> Sin atribución a personas. Foco en procesos y sistemas.

- [Ejemplo: No había alerta configurada para el rate limit de la API de OCR]
- [Ejemplo: El proceso de rollback no estaba documentado para este escenario]

---

### 7. Action items

> ⚠️ Cada action item debe tener dueño y fecha límite. Sin dueño = no existe.

| # | Acción | Tipo | Dueño | Fecha límite | Estado |
|---|---|---|---|---|---|
| 1 | [Descripción de la acción preventiva] | `Prevent` | [Nombre] | YYYY-MM-DD | `OPEN` |
| 2 | [Monitor o alerta a crear] | `Detect` | [Nombre] | YYYY-MM-DD | `OPEN` |
| 3 | [Runbook a actualizar] | `Mitigate` | [Nombre] | YYYY-MM-DD | `OPEN` |

**Tipos de action items:**
- `Prevent` — evita que el incidente ocurra
- `Detect` — detecta el incidente más rápido
- `Mitigate` — reduce el impacto cuando ocurre
- `Process` — mejora el proceso de respuesta

---

### 8. Lecciones aprendidas

> ¿Qué cambiaría en el diseño del sistema si pudiéramos volver atrás? ¿Qué parte de la arquitectura se probó en condiciones reales por primera vez?

[Completar aquí]

---

## Ejemplos de Post-Mortems de referencia

| Empresa | Incidente | Aprendizaje clave aplicable a Bresca |
|---|---|---|
| Google | Gmail down 2009 — migración mal planificada | Staged rollouts. Nunca migrar todos los datos al mismo tiempo. |
| Amazon | S3 down 2017 — typo en comando de mantenimiento | Blast radius limitation. Comandos de mantenimiento con límites de impacto forzados. |
| Cloudflare | BGP route leak 2019 — configuración de tercero | Dependency risk. Los servicios externos son superficie de falla. Tener fallback (OCR: DocAI → Textract). |

### Ejemplo hipotético Bresca

**PM-001 — OCR expone campo PII en pantalla de confirmación**

- **What:** el campo `patient_name` extraído por Document AI aparecía en la pantalla de confirmación aunque el diseño no lo contemplaba.
- **Why chain:** pantalla mostraba `extracted_fields` completo → backend retornaba todos los campos extraídos sin filtrar → Document AI extrae nombres de los encabezados de los estudios → no había allowlist de campos visibles.
- **Fix:** backend filtra `extracted_fields` contra un allowlist de campos clínicos permitidos antes de retornar al cliente. Pantalla de confirmación solo muestra campos del allowlist.
- **Lección:** nunca retornar `extracted_fields` crudo al cliente. Siempre filtrar contra un schema conocido.

---

## Historial de Post-Mortems

| ID | Título | Fecha | Severidad | Estado |
|---|---|---|---|---|
| — | — | — | — | — |

*Agregar cada PM aquí cuando se crea.*

---

*Relacionado: Runbook v1.0 | System Design v1.0*
