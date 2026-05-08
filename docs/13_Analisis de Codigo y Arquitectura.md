
Como Senior Solutions Architect, he analizado el repositorio `bresca-app`. El stack actual se basa en un monorepo administrado con **pnpm** y **Turborepo**, utilizando **React + Vite** para la PWA (web-patient), **Supabase** para el backend/base de datos y despliegues en **Vercel/Render**.

**Documentación de referencia del proyecto:**
- [[04_TechSpec_Bresca|Tech Spec]] — stack actual, schema DB, estructura del monorepo
- [[05_SystemDesign_Bresca|System Design]] — arquitectura de alto nivel, flujos de datos
- [[03_PRD_Bresca|PRD F-002]] — requerimientos del Health Vault y OCR

Para resolver el bloqueo de la UI en el Vault, propongo tres arquitecturas asíncronas diseñadas para el estado del arte de 2026.

---

## 1. Decoupling & Performance (Flujo No Bloqueante)

El objetivo es liberar el hilo principal de la UI inmediatamente tras el _handshake_ inicial del archivo.

### Opción A: Serverless Event-Driven (Costo-Eficiente)

- **Flujo:** El cliente sube el archivo a **Supabase Storage**. Un _Database Webhook_ dispara una **Edge Function**. Esta función encola la tarea y retorna un `202 Accepted` al cliente.
    
- **Comunicación:** Se utiliza **Supabase Realtime** (WebSockets) para suscribirse a los cambios en la tabla `vault_processing_status`.
    
- **Estado UI:** **Optimistic UI** con un _placeholder_ en la lista de documentos mientras el estado es `processing`.
    

### Opción B: Job Queue con WebTransport (Baja Latencia)

- **Flujo:** El cliente envía el archivo a una API en **Render** (Node.js 24/Bun). El archivo se procesa en segundo plano mediante **BullMQ/Redis**.
    
- **Comunicación:** En 2026, implementamos **WebTransport** (HTTP/3) para un streaming bidireccional de estados con menor latencia que WebSockets tradicionales.
    
- **Estado UI:** Un "Task Manager" global en la PWA que persiste aunque el usuario cambie de página.
    

### Opción C: Agentic Orchestration (Alta Disponibilidad)

- **Flujo:** Se utiliza una arquitectura de **"islas de renderizado"**. El componente de subida es un _Server Component_ que delega el procesamiento a una flota de agentes coordinados por **LangGraph**.
    
- **Comunicación:** **Server-Sent Events (SSE)** para actualizaciones granulares del progreso del agente.
    
- **Estado UI:** Se utiliza **TanStack Query** con **Signals** para una reactividad granular en la barra de progreso sin re-renders masivos.
    

---

## 2. Multi-Engine Reliability (Scoring System)

Para asegurar un >95% de confianza en datos médicos, DeepSeek (OCR primario) debe validarse. Recomiendo **Gemini 2.0 Flash** como motor secundario por su alta ventana de contexto y bajo costo en 2026.

### Lógica de Scoring & Consenso

Diseñamos un validador que compare los outputs JSON de ambos motores. Definimos la confianza $C$ como:

$$C = \sum_{i=1}^{n} w_i \cdot sim(E_{1,i}, E_{2,i})$$

Donde:

- $w_i$: Peso de importancia del campo (ej. `fecha_estudio` tiene más peso que `nombre_laboratorio`).
    
- $sim$: Función de similitud semántica (Cosine Similarity) entre las extracciones del Motor 1 ($E_1$) y Motor 2 ($E_2$).
    

### Estrategia de Resolución

1. **Match (>0.95):** Auto-aprobación y guardado en Vault.
    
2. **Mismatch (0.70 - 0.95):** Se dispara un tercer agente "Refinador" (ej. GPT-4o) para mediar.
    
3. **Error (<0.70):** Flag de **Human-in-the-loop**. Se notifica al usuario: "Detectamos inconsistencias, por favor verifica los campos resaltados".
    

---

## 3. UX & Visual Feedback (No bloqueante)

La barra de progreso debe reflejar la complejidad técnica real para gestionar la ansiedad del usuario.

- **Progreso Real por Etapas:**
    
    1. **Upload (0-20%):** Progreso real de la subida del binario.
        
    2. **Extraction (21-60%):** DeepSeek procesando (Etiqueta: "Extrayendo datos con IA").
        
    3. **Cross-Validation (61-90%):** Comparación de motores (Etiqueta: "Validando precisión médica").
        
    4. **Finalizing (91-100%):** Cifrado y persistencia en Vault.
        
- **Navegación de Fondo:** El proceso se registra en un `Service Worker`. Si el usuario cierra la app, el sistema utiliza **Web Push Notifications** para avisar: "Tu estudio de sangre ha sido procesado con éxito".
    

---

## Comparativa de Opciones

|**Criterio**|**Opción A (Supabase)**|**Opción B (Render + Redis)**|**Opción C (Agentic)**|
|---|---|---|---|
|**Complejidad**|Baja (Native Stack)|Media (Infra adicional)|Alta (Orquestación)|
|**Latencia Percibida**|Media (Polling/WebSockets)|Baja (WebTransport)|Ultra-baja (Edge AI)|
|**Escalabilidad Costo**|Lineal (Pay-per-invoke)|Fijo (Server cost)|Variable (Token usage)|
|**Pros (vs Actual)**|Integración total con `database.types.ts`.|Control total del ciclo de vida del proceso.|Máxima confiabilidad médica (>98%).|
|**Contras**|Cold starts en Edge Functions.|Requiere gestionar persistencia de Redis.|Mayor complejidad en el manejo de estados.|

**Recomendación:** Implementar la **Opción A** por su compatibilidad inmediata con el stack actual de Bresca (Supabase/TypeScript), pero integrando el **Scoring System** de la sección 2 para elevar la fiabilidad a nivel grado-médico.

---

## Links relacionados

- [[04_TechSpec_Bresca|Tech Spec — Technical Specification]]
- [[05_SystemDesign_Bresca|System Design Document]]
- [[03_PRD_Bresca|PRD — Product Requirements Document (F-002 Vault)]]
- [[06_Runbook_Bresca|Runbook — Operational Guide]]

---

*Para implementación de cambios arquitectónicos en el pipeline OCR, ver [[00_bresca_mvp_plan|MVP Plan Fase 1]] y roadmap en [[11_Roadmap_PostMVP|Roadmap post-MVP]].*