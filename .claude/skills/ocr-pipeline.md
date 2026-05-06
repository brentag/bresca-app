# Skill: ocr-pipeline
> Cargar cuando: trabajás en el flujo de upload, modificás la extracción de campos clínicos, debuggeás resultados de OCR, o tocás las tablas `studies` o `study_drafts`.

## Flujo completo (async, non-blocking)

```
web-patient Upload
  → POST /extract (multipart/form-data)
  → Supabase Storage (archivo original — studies/{profile_id}/{uuid}.{ext})
  → INSERT study_drafts (status='pending', storage_paths=[...])
  → API responde 202 inmediatamente ← frontend navega al Vault SIN esperar OCR
  → Trigger pg_net dispara Edge Function process-study-draft (async)
  → Edge Function: DeepSeek Vision (imágenes) / pdf-parse (PDFs)
  → UPDATE study_drafts SET status='done', extracted_fields={...}
     (o status='error', error_log='...' si falla)
  → Supabase Realtime notifica al frontend
  → Card del draft se actualiza en el Vault
  → Usuario confirma datos en pantalla de detalle
  → POST /extract/confirm
  → INSERT studies (confirmed=true, storage_paths=[...])
```

**Regla crítica:** `confirmed=false` hasta que el usuario valida explícitamente. NUNCA auto-commit.
**Regla crítica:** el frontend NUNCA bloquea esperando el OCR — navega al Vault inmediatamente.

---

## Schema de campos clínicos normalizados (allowlist)

Solo estos campos pueden aparecer en `extracted_fields` y ser retornados al cliente. Cualquier campo que DeepSeek extraiga fuera de esta lista se descarta en el backend antes de insertar en DB y antes de responder al cliente.

```typescript
// apps/api/src/extract/allowlist.ts

export const CLINICAL_FIELDS_ALLOWLIST = {
  // Laboratorio
  glucose_mgdl:         'number',
  hba1c_percent:        'number',
  hemoglobin_gdl:       'number',
  white_blood_cells:    'number',
  red_blood_cells:      'number',
  platelets:            'number',
  cholesterol_total:    'number',
  ldl_mgdl:             'number',
  hdl_mgdl:             'number',
  triglycerides_mgdl:   'number',
  creatinine_mgdl:      'number',
  tsh_uiul:             'number',
  // Imagen
  findings_text:        'string',   // texto libre del informe, sin nombre del paciente
  impression_text:      'string',
  // Receta
  medication_name:      'string',
  medication_dose:      'string',
  medication_frequency: 'string',
  // Metadata del estudio
  study_date:           'date',
  study_type:           'string',
  category:             'string',
  lab_name:             'string',   // nombre del laboratorio, no del paciente
} as const;

// NUNCA permitir en extracted_fields:
// patient_name, patient_id, doctor_name, address, phone, email
// → Si DeepSeek los extrae, se descartan silenciosamente
```

---

## Tabla `study_drafts` (temporal, TTL 24h)

```sql
CREATE TABLE study_drafts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category         text NOT NULL,
  status           text NOT NULL CHECK (status IN ('pending','processing','done','error'))
                   DEFAULT 'pending',
  storage_paths    text[],             -- una o múltiples páginas/fotos
  extracted_fields jsonb,              -- solo campos del allowlist (null hasta que OCR termina)
  study_type       text,
  lab_name         text,
  study_date       date,
  error_log        text,               -- descripción del error si status='error'
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Limpiar drafts viejos (pg_cron, diario):
-- DELETE FROM study_drafts WHERE created_at < now() - interval '24 hours'
```

---

## Edge Function: process-study-draft

```typescript
// supabase/functions/process-study-draft/index.ts
// Disparada por pg_net trigger en INSERT study_drafts

Deno.serve(async (req) => {
  const { draft_id } = await req.json();

  // 1. Marcar como 'processing'
  await supabase.from('study_drafts').update({ status: 'processing' }).eq('id', draft_id);

  // 2. Descargar archivo(s) desde Storage
  const draft = await getDraft(draft_id);
  const files = await downloadFromStorage(draft.storage_paths);

  // 3. OCR según tipo de archivo
  let rawFields: Record<string, unknown>;
  for (const file of files) {
    if (file.mimetype === 'application/pdf') {
      rawFields = await extractWithPdfParse(file.buffer);
    } else {
      // jpg, png → DeepSeek Vision
      rawFields = await extractWithDeepSeekVision(file.buffer, file.mimetype);
    }
  }

  // 4. Sanitizar contra allowlist
  const extracted_fields = sanitizeFields(rawFields, CLINICAL_FIELDS_ALLOWLIST);

  // 5. Actualizar draft con resultado
  await supabase.from('study_drafts').update({
    status: 'done',
    extracted_fields,
    study_type: classified.study_type,
    category:   classified.category,
  }).eq('id', draft_id);
});
```

---

## Categorización automática

```typescript
export function classifyStudy(extractedFields: ExtractedFields): {
  study_type: StudyType;
  category: string;
} {
  const hasLabFields = ['glucose_mgdl', 'hemoglobin_gdl', 'cholesterol_total']
    .some(f => f in extractedFields);
  const hasImageFields = ['findings_text', 'impression_text']
    .some(f => f in extractedFields);
  const hasRxFields = ['medication_name', 'medication_dose']
    .some(f => f in extractedFields);

  if (hasLabFields)   return { study_type: 'laboratorio', category: detectLabCategory(extractedFields) };
  if (hasImageFields) return { study_type: 'imagen',      category: 'imagen_diagnostica' };
  if (hasRxFields)    return { study_type: 'receta',       category: 'farmacologico' };

  return { study_type: 'otro', category: 'sin_clasificar' };
}
```

---

## Estados del draft en el Vault (UX)

| `status` | Card en Vault | Color | CTA |
|---|---|---|---|
| `pending` / `processing` | Spinner + "Analizando documento..." | Gris | — |
| `done` | Campos extraídos listos para confirmar | Verde | "Revisar y confirmar" |
| `error` | "No pudimos analizar el documento" | Rojo | "Ingresar datos manualmente" / "Descartar" |

---

## Valores de referencia para validación

```typescript
// Para detectar valores fuera de rango en la pantalla de confirmación
// y mostrar warning visual al usuario (naranja, no error bloqueante)
export const CLINICAL_REFERENCE_RANGES = {
  glucose_mgdl:      { min: 60,  max: 400  }, // ayunas
  hba1c_percent:     { min: 3,   max: 15   },
  hemoglobin_gdl:    { min: 7,   max: 20   },
  cholesterol_total: { min: 100, max: 400  },
  ldl_mgdl:          { min: 50,  max: 300  },
  hdl_mgdl:          { min: 20,  max: 120  },
  triglycerides_mgdl:{ min: 30,  max: 1000 },
  creatinine_mgdl:   { min: 0.3, max: 15   },
} as const;
// Si un valor extraído está fuera de rango: mostrar ⚠ en confirmación
// NUNCA bloquear el upload — el usuario decide si el valor es correcto
```

---

## Debuggear el OCR en producción

```bash
# Ver logs de la Edge Function
supabase functions logs process-study-draft --project-ref mkacuagcvwxoduhdthwg

# Ver drafts con error en las últimas 24h (SQL Editor en Supabase Dashboard)
SELECT id, profile_id, error_log, created_at
FROM study_drafts
WHERE status = 'error' AND created_at > now() - interval '24h'
ORDER BY created_at DESC;
```
