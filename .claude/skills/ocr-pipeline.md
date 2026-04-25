# Skill: ocr-pipeline
> Cargar cuando: trabajás en el flujo de upload, modificás la extracción de campos clínicos, debuggeás resultados de OCR, o tocás la tabla `studies` o `study_draft`.

## Flujo completo

```
Mobile upload
  → POST /upload (multipart)
  → Supabase Storage (archivo original)
  → Google Document AI (extracción)
  → study_draft (temporal, TTL 24h)
  → Pantalla confirmación (usuario valida)
  → POST /confirm
  → studies (confirmed=true)
  → Edge Function async (genera embedding)
```

**Regla crítica:** `confirmed=false` hasta que el usuario valida explícitamente. NUNCA auto-commit.

---

## Schema de campos clínicos normalizados (allowlist)

Solo estos campos pueden aparecer en `extracted_fields` y ser retornados al cliente. Cualquier campo que Document AI extraiga fuera de esta lista se descarta en el backend antes de insertar en DB y antes de responder al cliente.

```typescript
// apps/api/src/services/ocr.ts

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
// → Si Document AI los extrae, se descartan silenciosamente
```

---

## Implementación del pipeline

```typescript
// apps/api/src/services/ocr.ts

export async function extractStudyFields(
  filePath: string,
  fileType: 'pdf' | 'jpg' | 'png'
): Promise<Result<ExtractedFields>> {

  const provider = process.env.OCR_PROVIDER ?? 'docai';

  try {
    const rawFields = provider === 'docai'
      ? await extractWithDocumentAI(filePath, fileType)
      : await extractWithTextract(filePath, fileType);  // fallback

    // Filtrar contra allowlist — SIEMPRE, sin excepción
    const sanitized = sanitizeFields(rawFields, CLINICAL_FIELDS_ALLOWLIST);

    return { ok: true, data: sanitized };

  } catch (error) {
    // Si OCR falla, retornar campos vacíos — el usuario completa manualmente
    // NUNCA fallar el upload completo por un error de OCR
    console.error('[OCR] Extraction failed, returning empty fields:', error);
    return { ok: true, data: {} };
  }
}

function sanitizeFields(
  raw: Record<string, unknown>,
  allowlist: typeof CLINICAL_FIELDS_ALLOWLIST
): ExtractedFields {
  const sanitized: ExtractedFields = {};
  for (const [key, expectedType] of Object.entries(allowlist)) {
    if (key in raw && typeof raw[key] === expectedType) {
      sanitized[key] = raw[key] as never;
    }
  }
  return sanitized;
}
```

---

## Categorización automática

```typescript
// apps/api/src/services/ocr.ts

export function classifyStudy(extractedFields: ExtractedFields, fileName: string): {
  study_type: StudyType;
  category: string;
} {
  // Detectar por campos presentes
  const hasLabFields = ['glucose_mgdl', 'hemoglobin_gdl', 'cholesterol_total']
    .some(f => f in extractedFields);
  const hasImageFields = ['findings_text', 'impression_text']
    .some(f => f in extractedFields);
  const hasRxFields = ['medication_name', 'medication_dose']
    .some(f => f in extractedFields);

  if (hasLabFields)   return { study_type: 'laboratorio', category: detectLabCategory(extractedFields) };
  if (hasImageFields) return { study_type: 'imagen',      category: detectImageCategory(fileName) };
  if (hasRxFields)    return { study_type: 'receta',       category: 'farmacologico' };

  return { study_type: 'otro', category: 'sin_clasificar' };
}

function detectLabCategory(fields: ExtractedFields): string {
  if ('glucose_mgdl' in fields || 'hba1c_percent' in fields) return 'metabolismo_glucosa';
  if ('hemoglobin_gdl' in fields)  return 'hemograma';
  if ('cholesterol_total' in fields) return 'perfil_lipidico';
  if ('creatinine_mgdl' in fields) return 'funcion_renal';
  if ('tsh_uiul' in fields)        return 'funcion_tiroidea';
  return 'laboratorio_general';
}
```

---

## Tabla `study_draft` (temporal)

```sql
CREATE TABLE study_draft (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES profiles(id) NOT NULL,
  file_path        TEXT NOT NULL,
  extracted_fields JSONB,           -- solo campos del allowlist
  study_type       TEXT,
  category         TEXT,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpiar drafts expirados (pg_cron, diario)
SELECT cron.schedule(
  'clean-study-drafts',
  '0 3 * * *',
  'DELETE FROM study_draft WHERE expires_at < now()'
);
```

---

## Activar fallback a Textract

Si el error rate de Document AI supera el 20%:

```bash
# En Railway: Environment Variables
OCR_PROVIDER=textract
# Restart del servicio — el cambio es inmediato
```

El código usa `process.env.OCR_PROVIDER` en runtime, sin necesidad de redeploy.

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
