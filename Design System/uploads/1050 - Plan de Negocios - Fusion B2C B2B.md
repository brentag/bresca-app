# BRESCA 1050 — Plan de Negocios de Fusión B2C→B2B
## *Patient Data Network: un two-sided flywheel para resolver simultáneamente la inviabilidad económica del 500 y el cold-start del 1000*

**Versión:** 1050 v0.1 (draft ejecutivo para revisión del equipo fundador e inversores pre-seed / seed)
**Autores:** Equipo fundador Bresca + Consultoría estratégica integrada (HealthTech strategy, LATAM VC, Product Lead regulado, Growth Architect B2C, Software Architect)
**Fecha:** Abril 2026
**Clasificación:** Confidencial — uso interno y para due diligence

---

## Tabla de contenidos

1. Executive Summary
2. Tesis del pivote de fusión — el Two-Sided Flywheel
3. Deconstrucción del problema de cold start
4. Arquitectura del modelo 1050
   - 4.1 Fase Consumer-First (Mes 0–12)
   - 4.2 Fase Bridge / Data Asset Qualification (Mes 9–18)
   - 4.3 Fase B2B Activation (Mes 15+)
5. Unit economics fusionadas — modelo financiero 36 meses
6. Riesgos y mitigaciones específicas del modelo fusionado
7. Roadmap ejecutivo 36 meses y ask de inversión
8. Conclusión y call-to-action para inversores
9. Open Questions & Next Actions

---

## 1. Executive Summary

Bresca pivota por segunda vez, pero esta vez no abandona su tesis — la integra. El documento **500** planteó una Personal Health Record (PHR) descentralizada B2C con blockchain + IPFS; el documento **1000** demostró, con rigor financiero, que ese modelo colapsa bajo el peso de un CAC B2C que no se amortiza con un LTV freemium típico de apps de salud (ratio LTV:CAC estructuralmente por debajo de 2:1 en los canales pagados accesibles a una startup de US$1M de seed), y propuso un pivote a SaaS B2B AI para mid-market corporativo con ACV de ~US$15K y LTV:CAC proyectado de 10:1+.

La auditoría del 1000 es correcta en diagnóstico pero incompleta en ejecución: **vender una plataforma B2B a CROs (Contract Research Organizations), sponsors farma o aseguradoras sin un activo de pacientes pre-reclutados es vender humo**. La conversación con el decision-maker de una CRO tier-2 empieza con una pregunta: *"¿Cuántos pacientes activos, consentidos, con datos estructurados y segmentables por therapeutic area tenés hoy?"*. Sin un número defendible (≥5.000 en indicaciones específicas), no hay piloto.

El modelo **1050** resuelve esta tensión con una arquitectura de dos caras:

- **Lado demanda (B2C, gratuito y freemium liviano):** una app que entrega valor clínico real al paciente desde el día uno — vault unificado de estudios con OCR, AI copilot para segundas opiniones, alertas de interacciones medicamentosas, timeline de salud, módulo familiar, compartir seguro con profesionales vía QR temporal. El usuario gana aunque Bresca nunca firme una CRO.
- **Lado oferta (B2B, monetizado):** el activo reclutable — una cohorte consentida, geolocalizada y clínicamente estructurada — se monetiza con CROs y sponsors farma mediante tiers (feasibility → site selection → pre-screening → direct enrollment). Monetización diferida (mes 15+) pero de alto margen y con efectos de red asimétricos.

El **1050 resuelve simultáneamente** dos problemas que cada plan anterior no podía resolver por separado:

- **La inviabilidad económica del 500 puro:** el LTV B2C directo seguiría siendo bajo (US$5–US$30/usuario en freemium), pero ahora se adiciona un **LTV indirecto vía conversión a patient asset** (US$50–US$800 por usuario consentido, según densidad de datos y therapeutic area). Esto mueve el LTV efectivo blended a una zona rentable.
- **El cold-start del 1000 puro:** el B2C se convierte en la maquinaria de generación de inventario (pacientes pre-calificados) que hace la conversación B2B creíble y replicable.

**Ask de inversión ajustado:** US$1.2M pre-seed / seed híbrida (vs. US$1M original), desplegados en 24 meses para alcanzar dos hitos de Serie A: (a) 50.000 usuarios activos mensuales con ≥15% consentidos para investigación en 3 therapeutic areas priorizados, y (b) 2–3 contratos firmados con CROs tier-2/tier-3 por un ARR combinado de ≥US$400K. Break-even operativo proyectado mes 30–34, congruente con el modelo del 1000 pero con una narrativa de tracción más defendible ante inversores post-2024.

**Tesis defendible en una frase:** *Bresca no vende PHR ni SaaS de IA; Bresca opera un Patient Data Network donde el paciente gana control clínico real y los sponsors de investigación ganan acceso a cohortes reclutables consentidas — a un costo por paciente identificado entre 5x y 10x inferior al benchmark actual de la industria.*

---

## 2. Tesis del pivote de fusión — el Two-Sided Flywheel

### 2.1 Reframe conceptual: de producto a network

Tanto el 500 como el 1000 encuadraban Bresca como un **producto**: en el 500, una PHR descentralizada; en el 1000, una plataforma SaaS AI de eficiencia operativa. Ambos encuadres son productivamente limitados. El 1050 propone un reframe estructural: Bresca es un **Patient Data Network** — una infraestructura de dos caras donde el valor para cada lado crece de forma no lineal con la escala del otro lado.

Este encuadre no es cosmético. Tiene tres consecuencias operativas inmediatas:

- **La arquitectura del producto debe servir a dos usuarios primarios simultáneamente** (paciente y sponsor/CRO), con interfaces, SLAs y modelos de datos distintos pero compartiendo un core de datos único y gobernanza unificada.
- **La economía del negocio es de tipo marketplace**, no SaaS puro: hay efecto de red, hay take-rate implícito, y hay un lado del mercado que se subsidia (el paciente, que accede gratis) mientras el otro paga (el sponsor).
- **Los KPIs cambian**. No se miden MRR y churn como un SaaS tradicional; se miden **liquidez del mercado** (qué porcentaje de requests B2B encuentran match en la cohorte), **densidad del activo** (datos estructurados por usuario) y **velocidad de activación B2B** (tiempo desde que un sponsor expresa interés hasta que firma un piloto).

### 2.2 Las dos caras en detalle

**Lado demanda (paciente, B2C):** la propuesta de valor debe ser autosuficiente. Esto es un dogma del modelo 1050: si el paciente no obtendría valor en un universo donde Bresca nunca cerrara una CRO, el modelo colapsa en un esquema de extracción de datos — y el mercado latinoamericano, tras los traumas de Facebook/Cambridge Analytica y 23andMe/Blackstone (con el posterior episodio de bancarrota de 23andMe en 2025 que expuso ~15M de perfiles genéticos a subasta judicial), castigará ese posicionamiento.

Los beneficios reales para el paciente son:

- **Consolidación de su historial médico fragmentado** (labs, imágenes, recetas, informes) en un vault cifrado con OCR y estructuración automática.
- **AI copilot médico:** segunda opinión contextual basada en el timeline del paciente, traducción de informes técnicos a plain language, alerta de interacciones medicamentosas, recordatorios de adherencia.
- **Portabilidad real:** QR temporal para compartir con cualquier profesional de salud durante una consulta, sin depender de integraciones con EHRs específicos.
- **Módulo familiar:** gestión del historial de hijos y adultos mayores por un cuidador único (segmento de altísima afinidad — las cuidadoras primarias son usuarias de alta retención y, frecuentemente, influenciadoras en su círculo).

**Lado oferta (CRO, sponsor farma, y eventualmente aseguradoras, B2B):** acceso estructurado, consentido y auditable a la cohorte. Los tiers de servicio (desarrollados en §4.3) van desde estudios de feasibility (US$5K–US$25K por proyecto) hasta enrollment completo con success fees por paciente enrolado (US$200–US$2.500 por paciente, según therapeutic area y fase).

### 2.3 Analogías de mercado (y sus límites)

Para pitchar el 1050 ante inversores, hay cuatro analogías productivas y una advertencia:

- **TransferWise / Wise (P2P → B2B):** empezó resolviendo un dolor de consumidor (remesas caras) y, con escala, construyó infraestructura de pagos B2B (Wise Platform) que hoy es la mitad de la tesis. *Lección aplicable: el B2B se habilita por la masa crítica B2C, no se construye en paralelo.*
- **Strava (atletas → marcas y ciudades):** la app gratuita es el producto visible; el negocio es el dataset anonimizado (Strava Metro) vendido a departamentos de transporte y marcas. *Lección aplicable: los datos agregados y anonimizados tienen valor B2B sustantivo sin comprometer privacidad individual.*
- **23andMe (consumidores → farma vía consent de investigación):** validó que el consentimiento granular puede alimentar partnerships farma significativos (deal de US$300M con GSK en 2018). *Lección y advertencia: el upside está demostrado, pero el riesgo reputacional también — la quiebra de 23andMe en 2025 es el caso paradigmático de cómo un incidente de seguridad + mala gobernanza erosiona el trust network subyacente.*
- **Flatiron Health (red oncológica → adquirida por Roche por US$1.9B):** demostró que la infraestructura de datos clínicos estructurados, sumada a una capa de RWE (real-world evidence), es un activo de estrategia corporativa para farma.

**Advertencia:** ninguna de estas analogías es perfecta. TransferWise no maneja datos médicos, Strava no lidia con HIPAA/LGPD/Ley 26.529, 23andMe pagó caro sus omisiones de seguridad. El 1050 debe tomar lo bueno (network effects, consentimiento granular, data asset defensible) y blindarse contra lo malo (dependencia de una sola vertical monetizadora, gobernanza reactiva).

### 2.4 El efecto red asimétrico

La dinámica central que hace atractivo el 1050 — y que no existe en el 500 ni en el 1000 — es la **asimetría del efecto red**. Cada usuario B2C adicional aporta un incremento marginal bajo al valor percibido por otros usuarios B2C (un PHR no es Facebook; no importa cuántos otros pacientes lo usen), pero aporta un **incremento marginal creciente** al valor para el lado B2B.

Esto se formaliza así: si el valor para un sponsor de investigación es función de la probabilidad de encontrar `N` pacientes que cumplen un criterio clínico específico en un tiempo `T`, esa probabilidad es cóncava creciente en el tamaño de la cohorte. Llegar de 0 a 5.000 usuarios consentidos en oncología desbloquea un tipo de conversación B2B; llegar de 5.000 a 50.000 habilita un orden de magnitud de revenue, no solo el doble. A partir de cierto umbral (call it `N*`), Bresca se convierte en el **primer port of call** para sponsors buscando pacientes en therapeutic areas específicas en LATAM, y el CAC B2B cae estructuralmente (las CROs vienen a Bresca, no al revés).

**Implicación estratégica:** la prioridad de los primeros 12 meses no es diversificar therapeutic areas — es concentrarse en 2–3 áreas donde el cold-start sea alcanzable (hipótesis: diabetes tipo 2, oncología mamaria, enfermedades raras con comunidades activas de pacientes). Volverse "el referente en X" supera en valor ser "genérico en todo".

---

## 3. Deconstrucción del problema de cold start

### 3.1 Por qué el 1000 puro no cierra CROs

El 1000 pivotó correctamente hacia un ACV B2B mid-market defensible, pero su racional de go-to-market asume implícitamente que Bresca tendrá algo que vender el día uno. En la práctica, una conversación con un Head of Feasibility en una CRO tier-2 (Parexel, ICON, Syneos Health, Fortrea) o una sponsor farma mid-size (ej. Bayer LATAM, Roche LATAM, Takeda LATAM) se desarrolla en este orden:

1. **¿Qué problema resolvés?** (Bresca responde: reclutamiento de pacientes cualificados — OK.)
2. **¿Cómo?** (Bresca responde: tenemos una cohorte pre-consentida — y acá aparece el abismo.)
3. **¿Cuántos pacientes tenés hoy en mi therapeutic area de interés?** (Si la respuesta es "cero, te lo construimos", la conversación termina.)

Las CROs no compran promesas; compran inventario. El B2B en vida real de investigación clínica se parece más a un marketplace de anuncios (estilo LinkedIn Recruiter) que a un SaaS de productividad (estilo Notion). Vender LinkedIn Recruiter sin haber construido primero LinkedIn es imposible.

### 3.2 Benchmarks de umbral mínimo viable

No existen benchmarks públicos canónicos, pero la triangulación con literatura gris, casos de Antidote, TrialSpark, Science37 y conversaciones informales de industria sugiere los siguientes rangos *(estos números deben validarse con entrevistas directas a 5–10 Heads of Feasibility antes de cerrar la estrategia)*:

| Therapeutic area | Usuarios mínimos (cohorte activa, LATAM) | Datos mínimos por usuario | Racional |
|---|---|---|---|
| Diabetes tipo 2 | 15.000–25.000 | Glucemias, HbA1c, medicación actual, comorbilidades | Prevalencia alta, criterios de inclusión amplios |
| Oncología mamaria | 3.000–8.000 | Estadio, receptor HER2/ER/PR, tratamientos previos | Criterios más estrictos, cohorte más nicho |
| Enfermedades raras (ej. fibrosis quística, distrofias musculares) | 500–2.000 | Diagnóstico confirmado, gen afectado si aplica | Poblaciones pequeñas por definición; un piloto puede cerrarse con 200–500 pacientes |
| Cardiovascular (HTA, insuf. cardíaca) | 10.000–20.000 | ECG reciente, medicación, eventos previos | Similar a diabetes por prevalencia |
| Salud mental (depresión, ansiedad) | 8.000–15.000 | Escalas validadas (PHQ-9, GAD-7), tratamiento | Alto interés farma, dificultad de validación clínica |

**Conclusión operativa:** con ~10.000–15.000 usuarios activos bien distribuidos en 2–3 áreas terapéuticas, Bresca puede iniciar conversaciones de piloto B2B creíbles. Con <5.000 usuarios, no. El número mágico para el 1050 es por tanto **≥15.000 MAU con ≥25% consentidos para investigación en áreas priorizadas**, alcanzable razonablemente al mes 12–15 con una estrategia de adquisición ejecutada correctamente.

### 3.3 El valle de la muerte del dato (del usuario 1 al 10.000)

El período entre los primeros usuarios y la masa crítica es el tramo financieramente más peligroso y donde más plans de fusión han fallado. En este tramo:

- El B2C aún no genera revenue suficiente para amortizar su propio CAC (el LTV freemium es insuficiente para cerrar la unidad económica por sí solo).
- El B2B no es activable (no hay inventario para vender).
- El runway se consume por costos fijos (nómina técnica, infraestructura, compliance legal).

Este es el valle. El 1050 debe ser honesto con esto: **hay 9–14 meses donde la empresa es puro burn sin revenue significativo**, y ese burn debe estar financiado por el seed. El modelo financiero en §5 está construido sobre esta premisa.

Las palancas para acelerar el cruce del valle son:

- **Partnerships con asociaciones de pacientes:** una federación argentina de diabetes con 20.000 miembros puede aportar 500–2.000 altas en las primeras semanas si el pitch es genuino y el valor es real. Es la única forma de adquisición que razonablemente supera los 100 usuarios/día con CAC efectivo <US$5.
- **Integración con profesionales de salud tempranos:** un endocrinólogo que sube el historial de sus 200 pacientes a Bresca (con consentimiento, obviamente) es un acelerador enorme. La propuesta al médico: QR temporal + vault compartido ahorra tiempo clínico.
- **Viralidad intra-familiar:** un usuario que gestiona el historial de sus padres y hijos es potencialmente 3–5 usuarios efectivos en términos de datos.
- **SEO de long-tail en patologías específicas:** contenido de alta calidad respondiendo queries como *"cómo entender un informe de mamografía BI-RADS 4"* captura tráfico de alta intención.

---

## 4. Arquitectura del modelo 1050

### 4.1 Fase Consumer-First (Mes 0–12)

**Objetivo:** llegar a 30.000–50.000 MAU con densidad de datos suficiente en therapeutic areas priorizadas. Monetización B2C modesta (freemium clásico tras los primeros 10.000 usuarios), pero no es el objetivo principal — el objetivo es el activo.

#### 4.1.1 Propuesta de valor B2C

La propuesta de valor debe poder defenderse en esta frase: *"Si Bresca cerrara mañana, ¿seguirías usando la app?"*. Si la respuesta honesta es "no", el producto es un caballo de Troya — y los caballos de Troya en salud se queman rápido.

Las cinco features killer del B2C 1050 son:

- **Vault de documentos con OCR + estructuración FHIR:** el paciente sube PDFs, fotos de recetas, informes — la app extrae valores estructurados (ej. glucemia = 127 mg/dL, fecha = 2025-03-15, fuente = Lab Stamboulian). El vault es la puerta de entrada; el resto son capas de valor sobre él.
- **AI copilot médico:** dado el timeline del paciente, ofrece (a) segunda opinión general sobre un informe reciente, (b) traducción plain-language de jerga médica, (c) alerta de interacciones medicamentosas cruzando la medicación registrada, (d) preparación de preguntas para la próxima consulta. *Disclaimer obligatorio: el copilot no diagnostica ni reemplaza consulta médica — esto debe estar blindado jurídicamente por temas de FDA/ANMAT, ver §6.*
- **Timeline de salud unificado:** una visualización cronológica que mezcla eventos, estudios, medicaciones, consultas. Alta afinidad con perfiles de pacientes crónicos.
- **QR temporal para compartir con profesionales:** el paciente genera un QR que da acceso read-only al profesional durante un plazo acotado (ej. 48 horas). Fricción cero, sin que el profesional necesite cuenta en Bresca.
- **Módulo familiar:** un usuario puede gestionar perfiles de familiares dependientes (hijos, adultos mayores). Segmento de alta retención y engagement.

#### 4.1.2 Modelo freemium mínimo viable

- **Primeros 10.000 usuarios: full premium gratis permanente** (growth hack para cruzar el valle de la muerte; el costo de storage + OCR es marginal — ~US$0.10–0.30/usuario/mes — y el valor narrativo de "los primeros 10.000" es alto).
- **Usuario 10.001 en adelante:** freemium clásico — vault limitado a 500 MB o 50 documentos, AI copilot limitado a 10 queries/mes, módulo familiar con 1 perfil dependiente.
- **Plan Individual Premium (US$6.99/mes o US$59/año):** vault ilimitado, AI copilot ilimitado, prioridad en soporte.
- **Plan Familiar Premium (US$14.99/mes o US$129/año):** hasta 6 perfiles, vault ilimitado por perfil.

*Hipótesis a validar:* en LATAM los precios están entre 30–50% por debajo del benchmark US; US$6.99 puede ser alto para Argentina/Colombia pero razonable para Chile/México/USA-Hispanos. Se recomienda PPP-pricing regional desde el día uno.

#### 4.1.3 Estrategia de adquisición

| Canal | Ventana | CAC estimado (blended) | Volumen esperado mes 12 | Comentario |
|---|---|---|---|---|
| Partnerships asociaciones de pacientes | Mes 1–24 | US$1–3 | 8.000–15.000 | Más alta calidad; requiere BD dedicado |
| Contenido SEO de patologías | Mes 3+ | US$0.5–2 (CPA orgánico) | 5.000–12.000 | Compound; inversión inicial en contenido |
| Influencers médicos (no ads tradicionales) | Mes 4+ | US$3–8 | 3.000–8.000 | Requiere curaduría médica |
| ASO + orgánico app store | Mes 6+ | US$0–1 | 2.000–5.000 | Depende de ratings tempranos |
| Meta Ads / TikTok Ads | Mes 6+ | US$5–15 | 3.000–10.000 | Arma de último recurso, alto costo |
| Referral program (intra-familiar) | Mes 9+ | ~US$0 | 2.000–6.000 | Activar tras 5K+ usuarios base |
| **Total proyectado mes 12** | | **~US$3–5 blended** | **~25.000–45.000 usuarios** | |

**Crítica honesta del canal Meta/TikTok Ads:** el 500 asumía CAC de US$15 en Meta, lo cual es optimista para un producto que requiere fricción alta (registrarse, subir documentos, consentir). El CAC real en adquisición pagada para productos de salud suele oscilar entre US$20–US$60 y solo es sostenible cuando el LTV directo supera ampliamente US$60 — que no es el caso del freemium 1050. Por eso Meta Ads es el canal marginal, no el dominante.

### 4.2 Fase Bridge / Data Asset Qualification (Mes 9–18)

**Objetivo:** transformar la base de usuarios B2C en un activo B2B calificado, auditable y comercialmente ofrecible.

#### 4.2.1 Construcción del activo reclutable

El activo no es "la base de usuarios"; es el subconjunto de esa base que cumple cuatro criterios: (a) consentimiento explícito para ser contactado con invitaciones a estudios, (b) datos clínicos estructurados de densidad suficiente, (c) validación mínima de identidad, (d) opt-in granular por therapeutic area.

**Consentimiento informado granular (pillar del 1050):**

- Capa 1 — términos de uso del producto (obligatorio para usar la app).
- Capa 2 — consentimiento **opcional** para investigación clínica. Presentado en lenguaje plain, con explicación clara de: qué datos se compartirán (solo los relevantes al estudio), con quién (sponsor + CRO, nombrados explícitamente en cada invitación, no un blanket consent), qué derecho de revocación tiene el usuario (en cualquier momento, sin consecuencias), y qué compensación recibe el usuario (si la hay, según regulación local).
- Capa 3 — opt-in **per-therapeutic-area**: "¿Querés recibir invitaciones a estudios relacionados con diabetes / oncología / cardiología?"

Este diseño de consentimiento — inspirado en frameworks de ALL of Us (NIH), 23andMe research arm (en sus versiones post-2019) y UK Biobank — es lo que separa un modelo legítimo de uno de extracción oscura.

#### 4.2.2 Gobernanza de datos

Tres pilares obligatorios:

- **Comité ético independiente** (3–5 miembros externos: bioeticista, abogado de privacidad, médico clínico, paciente representante, eventual DPO). Revisa protocolos de uso del activo antes de cada partnership B2B.
- **Relaciones formales con IRBs locales** (Instituciones Revisoras de Estudios) — ANMAT en Argentina, ANVISA en Brasil, COFEPRIS en México. No para aprobar Bresca como plataforma (no requiere aprobación directa), sino para que los estudios que Bresca facilite cuenten con aprobación IRB del sponsor, y Bresca provea la infraestructura de consentimiento auditable.
- **DPO (Data Protection Officer) dedicado** desde mes 6. No puede ser el COO ni el CTO — debe ser rol independiente con reporting directo al board. Costo: ~US$40K–60K/año en LATAM.

#### 4.2.3 Métricas clave del activo

El dashboard interno del activo — que debería revisarse semanalmente por el equipo fundador y trimestralmente por el board — incluye:

- **% usuarios consentidos para investigación** (target mes 12: ≥25%, mes 24: ≥40%)
- **Densidad de datos por usuario** (promedio de documentos estructurados, meses de timeline cubiertos, frescura del último dato) — target: ≥5 documentos estructurados y ≥6 meses de timeline en el 50% de la cohorte consentida.
- **Cobertura terapéutica** (número de áreas con ≥3.000 usuarios consentidos) — target mes 18: ≥3.
- **Distribución geográfica** (qué % está en CABA vs. resto de Argentina vs. resto de LATAM) — importa porque las CROs priorizan sites metropolitanos.
- **Validación de identidad** (qué % tiene al menos un dato cross-validado — por ejemplo, un estudio con fecha y lab identificable) — target: ≥70%.

### 4.3 Fase B2B Activation (Mes 15+)

**Objetivo:** convertir el activo en revenue recurrente y escalable.

#### 4.3.1 Tiers de servicio B2B

| Tier | Descripción | Pricing sugerido | Margen bruto |
|---|---|---|---|
| **T1 — Feasibility studies** | Query al activo: "¿Cuántos pacientes con perfil X hay en LATAM, distribución geográfica, densidad de datos disponible?". Respuesta en 48–72 horas. | US$5K–US$25K por estudio (fee único) | ~90% |
| **T2 — Site selection** | Identificación de sites clínicos óptimos basada en concentración geográfica de cohorte Bresca. | US$25K–US$75K por proyecto | ~85% |
| **T3 — Patient pre-screening** | Envío de invitaciones a usuarios opt-in que cumplen criterios; ranking por fit; entrega de leads calificados a la CRO. | US$50–US$200 por paciente pre-calificado | ~75% |
| **T4 — Direct enrollment facilitation** | Acompañamiento del paciente desde la invitación hasta la firma del ICF (informed consent form) del estudio. Success fee. | US$500–US$2.500 por paciente enrolado | ~70% |
| **T5 — RWE / data licensing** (año 2+) | Licencias de datasets anonimizados agregados para real-world evidence. | US$50K–US$500K por dataset | ~95% |

#### 4.3.2 Pricing layered

El modelo de pricing recomendado es híbrido:

- **Setup fee** (one-time, US$10K–US$50K por sponsor al activar la partnership) — cubre onboarding, integración técnica, due diligence regulatoria.
- **Per-patient-identified fee** — el core recurrente, con ajuste por therapeutic area y fase del estudio.
- **Success fee por enrollment completado** — donde Bresca captura valor real (ver §4.3.1 T4).
- **Retainer anual opcional** (US$100K–US$300K/año) para sponsors con volumen alto, a cambio de priorización, SLAs y acceso preferencial.

#### 4.3.3 Comparación con incumbentes

| Competidor | Modelo | Escala (pacientes) | ARR estimado | Diferenciación vs. Bresca 1050 |
|---|---|---|---|---|
| **Antidote Match** (UK/US) | Matching de pacientes con ensayos clínicos; trabaja con sponsors farma y CROs. | ~1M+ users | ~US$10M+ | US/UK-centric, menos presencia LATAM; no tiene PHR propia. |
| **TrialSpark** (US) | Ensayos end-to-end; verticalmente integrado. | No disclosed | ~US$50M+ | Modelo muy capital intensivo (levantó >US$200M); opera sus propios sites. |
| **Science37** (US) | Ensayos descentralizados (DCT); plataforma tech. | No disclosed | ~US$60M (public 2021 pre-SPAC) | Foco en infraestructura DCT, no en activo de pacientes propio. |
| **Datavant** | Data connectivity y tokenización clínica. | Agrega datos de ~300M US patients | ~US$300M+ | No es consumer-facing; puro B2B2B. |
| **Evidation Health** | Apps + datos via wearables para RWE. | ~4M+ users | No disclosed | Más cercano al modelo 1050; foco en RWE vs. reclutamiento activo. |

**Ventana competitiva de Bresca:** (a) foco LATAM sub-explotado por los players anteriores, (b) integración de PHR + enrollment en una sola plataforma (la mayoría de los competidores tienen uno u otro), (c) costos operativos 50–70% menores por arbitraje de talento regional, (d) regulación local conocida por el equipo fundador.

---

## 5. Unit economics fusionadas — modelo financiero 36 meses

### 5.1 Supuestos centrales

| Variable | Valor | Fuente / racional |
|---|---|---|
| CAC B2C blended | US$3.5 | Mix de canales §4.1.3; conservador |
| LTV B2C directo (freemium) | US$18 | Mix: 92% gratis (LTV US$6), 8% premium (LTV US$165 a churn 30%/año) |
| % usuarios B2C que consienten investigación | 30% | Benchmark ALL of Us (~37%), 23andMe research (~80% pre-crisis); tomo punto conservador |
| LTV indirecto por usuario consentido | US$280 | Promedio ponderado por therapeutic area: 40% diabetes (US$200), 20% oncología (US$800), 20% cardio (US$180), 20% otros (US$120) |
| LTV blended (por usuario B2C total) | US$18 + (0.30 × US$280) = **US$102** | Suma LTV directo + indirecto ponderado |
| CAC B2B (por sponsor) | US$8.000 | Includes BD, compliance review, onboarding, demos |
| ACV B2B (blended sponsor tier-2/tier-3) | US$180.000 / año | Mix T1/T2/T3/T4; conservador frente a comparables |
| LTV B2B (por sponsor, 3 años retention) | US$450.000 | Retention 75%/año; expansion 15%/año |
| LTV:CAC B2B | 56:1 | Confirma magnitud del lado monetizable |
| LTV:CAC blended (mix B2C + B2B) | ~10–14:1 | Target defensible |

### 5.2 Proyección 36 meses (USD)

| Métrica | Año 1 (mes 1–12) | Año 2 (mes 13–24) | Año 3 (mes 25–36) |
|---|---|---|---|
| **Usuarios B2C registrados (cumulativo)** | 35.000 | 180.000 | 550.000 |
| **MAU B2C** | 18.000 | 95.000 | 290.000 |
| **% consentidos investigación** | 15% | 28% | 38% |
| **Usuarios consentidos** | 2.700 | 26.600 | 110.200 |
| **Sponsors B2B firmados (cumulativo)** | 0 | 3 | 12 |
| **ARR B2B (fin de período)** | US$0 | US$420.000 | US$2.1M |
| **Revenue B2C (premium)** | US$18.000 | US$180.000 | US$620.000 |
| **Revenue B2B reconocido** | US$0 | US$180.000 | US$1.35M |
| **Revenue total reconocido** | US$18.000 | US$360.000 | US$1.97M |
| **OPEX total** | US$610.000 | US$950.000 | US$1.75M |
| **Cash burn neto** | –US$592.000 | –US$590.000 | +US$220.000 (break-even mes 32–34) |

### 5.3 Desglose OPEX por año

| Partida | Año 1 | Año 2 | Año 3 |
|---|---|---|---|
| R&D / producto (nómina técnica) | US$290K | US$380K | US$600K |
| Growth & marketing | US$130K | US$240K | US$420K |
| Compliance / legal / DPO | US$50K | US$90K | US$140K |
| Business Development B2B | US$40K | US$120K | US$280K |
| Customer Success (B2B + B2C) | US$30K | US$60K | US$150K |
| Infraestructura (cloud, AI, IPFS/storage) | US$45K | US$80K | US$180K |
| G&A (admin, contabilidad, misc.) | US$25K | US$40K | US$80K |
| **Total OPEX** | **US$610K** | **US$1.01M** | **US$1.85M** |

### 5.4 Hitos de tracción para Serie A (a alcanzar mes 18–24)

Para levantar una Serie A defendible (target: US$6M–US$12M a valuación post-money US$30M–US$60M), el 1050 debe mostrar:

- **DAU ≥20.000 / MAU ≥80.000** (ratio DAU/MAU ≥25% — alto para salud).
- **% consentidos investigación ≥30%** en therapeutic areas priorizados.
- **≥3 sponsors B2B firmados**, con al menos 1 contrato T3/T4 (revenue per-patient o success fee) activo.
- **ARR B2B ≥US$500K**, con trayectoria a ≥US$2M en 12 meses (growth rate ≥4x anual desde base baja, creíble por efecto compuesto del activo).
- **Gross retention B2B ≥85%**, net retention ≥110%.
- **NPS B2C ≥50**, retención 12-meses ≥65%.

### 5.5 Notas críticas del modelo financiero

**Lo que funciona en este modelo:**

- El LTV indirecto vía conversión a patient asset es la palanca que rescata la unit economics — sin él, el ratio LTV:CAC colapsa a ~5:1 y la historia no cierra.
- La concentración en 3 therapeutic areas (vs. dispersión) mejora la densidad del activo y acelera el primer deal B2B.
- El arbitraje de talento LATAM (herencia útil del 1000) mantiene el burn manejable.

**Lo que es frágil:**

- **Supuesto de 30% de opt-in a investigación** — si se realiza al 15%, el LTV blended cae a ~US$60 y el modelo requiere 2x más usuarios para la misma economía. *Validar empíricamente con MVP de consent flow en los primeros 1.000 usuarios.*
- **Supuesto de ACV B2B de US$180K blended** — depende mucho de concretar tier T3/T4. Si las primeras 5 conversaciones con CROs solo cierran T1/T2 (feasibility), el ACV blended cae a ~US$40K y el break-even se corre al mes 42+.
- **Densidad de datos** — el modelo asume que los usuarios suben documentos activamente. Sin un flywheel de engagement sólido (AI copilot como hook), la densidad puede caer al punto donde el dato no vale para una CRO.

---

## 6. Riesgos y mitigaciones específicas del modelo fusionado

### 6.1 Riesgo regulatorio

**Descripción:** monetizar datos clínicos (incluso anonimizados y agregados) está en zona gris en LATAM. Ley 25.326 (Argentina, Protección de Datos Personales), Ley 26.529 (Derechos del Paciente), LGPD (Brasil), LFPDPPP (México), y las regulaciones derivadas de habeas data imponen cargas probatorias sobre el data controller.

**Severidad:** Alta. Una multa o medida cautelar puede paralizar la operación. El caso de la AEPD española multando a Glovo (2024) o los precedentes argentinos en datos biométricos son referencias.

**Mitigaciones:**

- **Consentimiento granular auditable** (ya descrito en §4.2.1).
- **Privacy by design** — cada feature se revisa por el DPO antes de ship.
- **Legal counsel especializado en salud digital** contratado desde mes 2 — no un generalista.
- **Residencia de datos LATAM** (AWS São Paulo o Buenos Aires, según ley de cross-border transfer aplicable) — evitar US/UE como default.
- **Nunca vender datos de usuarios individuales identificables**. El modelo es acceso calificado + intermediación, no venta de datos. Este matiz es crítico jurídica y reputacionalmente.

### 6.2 Riesgo reputacional

**Descripción:** el ghost de Cambridge Analytica y la quiebra de 23andMe en 2025 dejaron a la opinión pública LATAM con sensibilidad alta. Un mal titular en medios ("startup argentina vende datos médicos a farmacéuticas") puede matar la adquisición en días.

**Severidad:** Alta — especialmente en el primer año, donde el tracking retention depende del word-of-mouth.

**Mitigaciones:**

- **Messaging transparente desde el día uno.** El usuario debe saber en el onboarding que Bresca puede facilitar contacto con estudios de investigación, que es opt-in, y que hay beneficio mutuo. Tratar de ocultarlo es la receta del desastre.
- **Público review de partnerships B2B** — publicar trimestralmente un report tipo "transparency report" con número de estudios facilitados, sin nombres de pacientes pero con sponsors y therapeutic areas.
- **Comité ético con paciente representante.** No decorativo — con voto vinculante.
- **Zero-knowledge de personal health data para Bresca staff** en producción — el equipo no debe poder leer documentos individuales salvo por soporte bajo protocolo estricto.

### 6.3 Riesgo de dilución de foco (B2C y B2B son productos muy distintos)

**Descripción:** estructurar equipos para dos productos simultáneos con una sola cuenta bancaria es el riesgo más subestimado. El 500 fracasó en parte por foco; el 1000 subestima esta complejidad al minimizar el B2C.

**Severidad:** Media-alta. Típicamente no mata la empresa, pero retrasa hitos 6–12 meses.

**Mitigaciones:**

- **Estructura de equipos tipo "two-pizza" separados desde mes 6:** un squad B2C (producto + growth) y un squad B2B (engineering del data platform + BD + customer success). PM/owner único para cada lado.
- **KPIs distintos por squad**, pero con un "liquidity metric" compartido que mida el match entre oferta y demanda.
- **El CEO — Esteban — retiene ownership del balance estratégico**, no ninguno de los two-pizza leads.
- **Revisión mensual de portfolio de esfuerzo** (% de engineering-hours en cada lado, vs. plan).

### 6.4 Riesgo competitivo

**Descripción:** además de Antidote, TrialSpark, Science37, Evidation, Datavant (§4.3.3), hay emergentes como Truveta (US, alianza de 17 health systems), Verana Health, Komodo Health. Además, los grandes EHR vendors (Epic, Cerner/Oracle) podrían abrir APIs de pacientes que erosionen el valor del activo.

**Severidad:** Media — la ventana competitiva en LATAM sigue abierta, pero no indefinidamente.

**Mitigaciones:**

- **Velocidad:** el 1050 debe estar en mercado con activo ≥15K en 15 meses, antes de que los globales decidan entrar.
- **Partnerships defensivos** con asociaciones de pacientes grandes (exclusividades suaves).
- **Moat regulatorio-local:** conocer ANMAT/ANVISA/COFEPRIS mejor que cualquier extranjero es una ventaja real durante 3–5 años.

### 6.5 Riesgo de capital

**Descripción:** el invierno VC descrito en el 1000 sigue vigente en 2026; Q1 2026 LATAM seed está en ~US$140M/trimestre vs. US$500M+ en 2021. La bar para levantar es alta.

**Severidad:** Alta para el runway.

**Mitigaciones:**

- **Ask seed US$1.2M** (vs. US$1M original) para comprar 20% más runway.
- **Estructura tranches:** US$700K primer cierre, US$500K segundo cierre condicionado a hitos de mes 9 (25K usuarios registrados, 20% consent rate, 1 LOI de sponsor).
- **Grants y concursos** (IDB Lab, BID, SECyT Argentina) como capital complementario no-dilutivo — realista ~US$100K–US$300K en 18 meses.
- **Revenue from B2B pilots accelerado** para reducir dependencia de equity.

### 6.6 Riesgo de talento

**Descripción:** construir un equipo con Medical informatics + AI + growth + compliance + BD B2B especializado es una combinación rara, especialmente en LATAM. La hiring pipeline puede ser un cuello de botella silencioso.

**Severidad:** Media.

**Mitigaciones:**

- **Aprovechar el network del equipo fundador** (Oracle Health de Esteban, red de Cindy en US healthtech) para contratar ex-alumni.
- **Modelo remote-first** con hubs en Buenos Aires, São Paulo, Ciudad de México.
- **Equity generoso en founders pool** (15–18% reservado para los primeros 10 hires, vs. 10% estándar).

---

## 7. Roadmap ejecutivo 36 meses + Ask de Inversión

### 7.1 Roadmap trimestral

| Trimestre | Producto | Growth | Regulatorio | Comercial | Financiero |
|---|---|---|---|---|---|
| **Q1 (m 1–3)** | MVP B2C iOS+Android+web; vault + OCR; landing de enrolment | 0→1.000 usuarios early adopters | Constitución DPO; RGP + LGPD compliance baseline | Mapping inicial 20 sponsors target | Cierre seed tranche 1 (US$700K) |
| **Q2 (m 4–6)** | AI copilot v1; QR sharing; consent flow granular | 1.000→5.000 usuarios; 3 partnerships asociaciones | Revisión legal consent; IRB relationships iniciales | Validación de pricing B2B con 5–8 Heads of Feasibility | — |
| **Q3 (m 7–9)** | Módulo familiar; timeline unificado; dashboard B2B v0.1 | 5.000→15.000 usuarios; SEO en 3 therapeutic areas | Auditoría externa privacy; comité ético constituido | Primer LOI / contrato T1 de feasibility | Seed tranche 2 (US$500K) — hito triggered |
| **Q4 (m 10–12)** | Integraciones con labs LATAM priorizados (Stamboulian, Hidalgo, Biolab); FHIR export | 15.000→30.000 usuarios; 25% consent rate | Cross-border data transfer framework | 2–3 sponsors firmados (T1/T2); primer revenue B2B | Runway check; early Series A conversations |
| **Q5 (m 13–15)** | Pre-screening engine B2B; invitación a estudios flow | 30.000→50.000 usuarios; 30% consent | Certificación HIPAA-ready architecture | Piloto T3 (per-patient) con primer sponsor | Revenue B2B ~US$150K ARR |
| **Q6 (m 16–18)** | Expansión terapéutica (4ta área); scale OCR/AI | 50.000→90.000 usuarios | Auditoría SOC 2 Type I | 5+ sponsors activos; ARR US$400K+ | Serie A pitch activo |
| **Q7 (m 19–21)** | Marketplace B2B self-serve; RWE datasets v1 | 90.000→150.000 usuarios | Ampliación jurisdiccional (México, Brasil) | 8+ sponsors; pilotos T4 (success fee) iniciando | Cierre Serie A (target US$6–12M) |
| **Q8 (m 22–24)** | Plataforma móvil HCP (profesionales de salud); API pública v1 | 150.000→220.000 usuarios | SOC 2 Type II | 12+ sponsors; ARR US$1M+ | — |
| **Q9 (m 25–27)** | Multi-tenant B2B tooling enterprise | 220.000→320.000 usuarios | HIPAA full compliance (US market entry prep) | Primera alianza aseguradora LATAM | Break-even approach |
| **Q10 (m 28–30)** | AI copilot v2 (modelos fine-tuned domain-specific) | 320.000→420.000 usuarios | — | US market entry (pilot) | Break-even operativo |
| **Q11 (m 31–33)** | Enterprise features (SSO, audit logs avanzados) | 420.000→500.000 usuarios | — | Expansión ACV base | Cash-flow positive |
| **Q12 (m 34–36)** | Serie B readiness | 500.000→600.000 usuarios; 40% consent | Prep compliance expansion EU/UK | 20+ sponsors; ARR US$3M+ | Serie B pitch |

### 7.2 Ask de inversión detallado

**Seed híbrido: US$1.2M en 2 tranches**

- **Tranche 1 (closing Q1 m1–3): US$700K**
- **Tranche 2 (closing Q3 m7–9): US$500K** — condicionado a hitos: (a) ≥15K usuarios, (b) ≥20% consent rate, (c) ≥1 LOI de sponsor firmado.

**Estructura sugerida:** SAFE post-money con cap US$7M–US$9M (o convertible note con discount 20%, cap US$8M). Permite llegar a la Serie A 12–15 meses después sin re-pricing forzado.

**Uso de fondos:**

| Categoría | Monto | % | Detalle |
|---|---|---|---|
| Equipo técnico (R&D) | US$480K | 40% | 1 CTO fractional, 2 full-stack sr., 1 ML/AI, 1 QA, 1 UX — LATAM salaries |
| Growth & marketing | US$200K | 17% | BD partnerships asoc. pacientes, contenido SEO, referidos, minoritariamente ads |
| Compliance / legal / DPO | US$120K | 10% | Legal counsel especializado + DPO parcial + auditorías externas |
| Business Development B2B | US$100K | 8% | 1 Head of BD LATAM, viajes, CRM |
| Infraestructura | US$90K | 7.5% | Cloud, AI inference, storage, licencias |
| Customer success (bootstrap) | US$60K | 5% | 1 CS + herramientas |
| G&A / admin / contable / legal societario | US$80K | 6.7% | Argentina + entidad US (Delaware C-Corp) |
| Reserva de contingencia | US$70K | 5.8% | Imprevistos, oportunidades |
| **Total** | **US$1.2M** | **100%** | |

### 7.3 Milestones críticos de salida (Serie A ready)

Para activar conversaciones de Serie A sin descuentos, Bresca debe demostrar en mes 18–20:

- **50.000+ MAU**, DAU/MAU ≥25%
- **30%+ usuarios consentidos** en 3 therapeutic areas
- **3+ sponsors B2B activos**, incluyendo al menos 1 contrato T3/T4
- **ARR B2B ≥US$400K**, creciendo ≥300% YoY
- **Gross margin ≥70%**, net retention B2B ≥110%
- **LTV:CAC blended ≥8:1**

---

## 8. Conclusión y Call-to-Action para inversores

El 1050 no es una tercera tesis — es la síntesis madura de las dos anteriores. El 500 identificó correctamente el problema (datos médicos fragmentados, falta de control del paciente) pero subestimó la economía unitaria del B2C de salud. El 1000 identificó correctamente la solución económica (B2B AI con ACV alto) pero subestimó el cold-start del inventario. El 1050 resuelve ambas limitaciones tratando el problema como un mercado de dos caras donde el B2C es la maquinaria de inventario y el B2B es la maquinaria de revenue.

La hipótesis se sostiene sobre cinco apuestas que son simultáneamente explícitas y falsables:

1. **Los pacientes LATAM con condiciones crónicas valoran una PHR con AI copilot lo suficiente como para subir sus datos activamente.** *Falsable en los primeros 1.000 usuarios — si la densidad de datos por usuario es <2 documentos estructurados, la tesis cae.*
2. **El 25–35% de esos usuarios optará por consentimiento de investigación si el flujo es transparente y opt-in granular.** *Falsable en los primeros 3.000 usuarios — si el consent rate es <15%, el LTV blended no cierra.*
3. **Las CROs tier-2/tier-3 pagarán por acceso calificado a esa cohorte, con un CPM-por-paciente 5–10x inferior al benchmark actual de industria.** *Falsable en las primeras 10 conversaciones comerciales — si el pricing T3 queda por debajo de US$50/paciente identificado, el modelo exige 2x más volumen.*
4. **El arbitraje de talento LATAM + la especialización regulatoria local generan una ventana competitiva de 2–4 años frente a globales.** *Falsable si Datavant/Antidote/Evidation anuncian expansión LATAM en los próximos 12 meses — en cuyo caso la velocidad de ejecución debe acelerarse.*
5. **El equipo fundador puede ejecutar un producto de dos caras sin diluir foco en ninguna.** *Falsable en la retrospectiva del mes 9 — si la velocidad de entrega del MVP B2C está retrasada >2 meses vs. plan, activar hiring de un product lead senior dedicado.*

**Para el inversor:** el 1050 es una apuesta sobre un equipo con 65+ años de experiencia combinada (Oracle Health, Emma Health, Dirección Nacional de Dominios) ejecutando una tesis de two-sided network en una región con ventana temporal favorable, bajo un régimen de capital que castiga el hype y premia la economía unitaria demostrable. El ask de US$1.2M seed en tranches con hitos explícitos es diseñado para minimizar riesgo de ejecución temprana y alinear incentivos entre founders y capital. El target de break-even mes 30–34 y Serie A mes 18–21 es ambicioso pero consistente con SaaS B2B que construyen inventario de dos lados.

**La pregunta que el inversor debe hacerse no es "¿funcionará el 1050?"** — ningún VC early-stage tiene esa certeza. **La pregunta es: ¿puede este equipo, en esta geografía, en esta ventana de tiempo, construir un activo defensible que justifique una Serie A a US$30M–US$60M post-money en 18 meses?** La respuesta, basada en track record del equipo, en los benchmarks de la categoría y en la lógica económica del two-sided flywheel, es **sí, con probabilidad materialmente superior a la de la tesis original del 500 o del 1000 aisladas**.

---

## 9. Open Questions & Next Actions

Preguntas abiertas que el equipo fundador debe responder antes de comprometerse al 1050 en su forma final:

1. **Validación empírica de consent rate**: ¿cuál es el opt-in real a investigación en los primeros 500 usuarios con el consent flow diseñado? *Acción: construir MVP del consent flow antes del cierre del seed; testear con 50 usuarios cualitativos.*
2. **Priorización de therapeutic areas**: ¿cuál es la triada óptima (diabetes, oncología mamaria, enfermedades raras) vs. alternativas (salud mental, cardio)? Hay un trade-off entre volumen (diabetes) y valor unitario (oncología/raras). *Acción: 10 entrevistas con Heads of Feasibility en CROs LATAM antes de commit producto.*
3. **Modelo societario óptimo**: ¿LLC US (Delaware) + SRL Argentina, o estructura Cayman + LATAM? Impacta Serie A, taxation, exit. *Acción: consulta con counsel Serie A-ready (Cuatrecasas, Marval, Beccar Varela) en los próximos 30 días.*
4. **HIPAA vs. LGPD-only**: ¿vale la pena el costo incremental de HIPAA-ready architecture desde el día uno si la operación inicial es LATAM? *Hipótesis a validar con el primer sponsor: si es farma global, HIPAA compliance es un diferenciador; si es CRO regional, LGPD/Ley 25.326 alcanza.*
5. **Rol del blockchain/IPFS del 500**: ¿se mantiene como pilar técnico, se reduce a capa de audit log, o se elimina? La tesis 1050 no lo requiere estrictamente, y la complejidad adicional puede ser carga sin retorno proporcional. *Acción: decisión arquitectónica por el CTO en las primeras 4 semanas, documentada con pros/contras.*
6. **Kill-criteria explícitos**: ¿bajo qué métricas de fallo se pivotea o se cierra? Definirlos ex-ante protege de la escalation of commitment. *Propuesta inicial: si mes 9 no hay ≥10K usuarios o ≥20% consent rate, revisión profunda de tesis con board.*
7. **Relación entre features AI copilot y regulación médica**: ¿el copilot clasifica como software as medical device (SaMD) bajo FDA/ANMAT? Requiere análisis regulatorio específico. *Acción: consulta formal con especialista en SaMD en las primeras 8 semanas.*
8. **Equity allocation founders**: el 500 y el 1000 no explicitan el split entre Esteban/Cindy/Gabriel ni la reserva del option pool. Crítico definirlo antes del seed. *Acción: finalizar cap table con counsel antes del primer LOI de inversor.*

---

*Fin del documento 1050 — Plan de Negocios de Fusión B2C→B2B. Versión 0.1 draft ejecutivo. Próxima revisión post comité de founders + feedback de 2–3 VCs amigos (dry pitch).*
