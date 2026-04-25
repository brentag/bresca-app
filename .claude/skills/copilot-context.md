# Skill: copilot-context
> Cargar cuando: trabajás en el chat del Copilot, modificás el sistema de retrieval, tocás el system prompt, o debuggeás respuestas del Copilot.

## Arquitectura del Copilot

```
Usuario envía mensaje
  → Rate limit check (20/hora/usuario)
  → Embed pregunta (text-embedding-3-small)
  → Cosine similarity en study_embeddings (top-5)
  → Construir prompt (system + estudios relevantes + historial)
  → POST Claude API (claude-sonnet-4-5, max_tokens: 1024)
  → Retornar respuesta
  → Guardar en historial (últimos 10 turnos)
```

---

## System prompt

El system prompt vive en `apps/api/src/copilot/system-prompt.ts` como constante exportada.

**Regla:** nunca inline el system prompt en `chat.ts`. Siempre importar la constante.
**Cambios:** requieren PR + review + tests CT-001 a CT-007 (ver `docs/08_SystemPromptSpec_Bresca.md`).

```typescript
// apps/api/src/copilot/system-prompt.ts
export const COPILOT_SYSTEM_PROMPT_V1 = `
Eres el Copilot de Bresca...
[ver docs/08_SystemPromptSpec_Bresca.md para el prompt completo]
`;
// V1 es la versión activa. Para cambiar: crear V2, PR, tests, review.
```

---

## Retrieval semántico

```typescript
// apps/api/src/copilot/retrieval.ts

const TOP_K = 5;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;

export async function getRelevantStudies(
  profileId: string,
  userQuery: string
): Promise<Result<NormalizedStudy[]>> {

  // 1. Embed la pregunta del usuario
  const queryEmbedding = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: userQuery,
  });

  // 2. Cosine similarity en DB (pgvector)
  // Solo busca en estudios del perfil autenticado — NUNCA cross-profile
  const { data, error } = await supabaseAdmin.rpc('match_study_embeddings', {
    query_embedding: queryEmbedding.data[0].embedding,
    match_profile_id: profileId,
    match_threshold: 0.7,
    match_count: TOP_K,
  });

  if (error) return { ok: false, error: new Error(error.message) };

  // 3. Sanitizar antes de enviar a Claude API — nunca PII
  const sanitized = data.map(sanitizeStudyForCopilot);
  return { ok: true, data: sanitized };
}

// Función SQL correspondiente en Supabase
// supabase/migrations/..._add_match_embeddings_function.sql
/*
CREATE FUNCTION match_study_embeddings(
  query_embedding VECTOR(1536),
  match_profile_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, study_type TEXT, study_date DATE,
  category TEXT, extracted_fields JSONB, similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.study_type, s.study_date, s.category, s.extracted_fields,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM study_embeddings se
  JOIN studies s ON s.id = se.study_id
  WHERE s.profile_id = match_profile_id
    AND s.confirmed = true
    AND 1 - (se.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
*/
```

---

## Sanitización antes de enviar a Claude API

```typescript
// apps/api/src/copilot/retrieval.ts

// Lo que el Copilot puede ver de cada estudio
interface NormalizedStudy {
  study_type: string;
  study_date: string;       // 'YYYY-MM-DD'
  category: string;
  extracted_fields: Record<string, string | number>;
  // NUNCA incluir: profile_id, user_id, file_path, nombres propios
}

function sanitizeStudyForCopilot(raw: StudyWithEmbedding): NormalizedStudy {
  return {
    study_type:       raw.study_type,
    study_date:       raw.study_date,
    category:         raw.category,
    extracted_fields: filterAllowlist(raw.extracted_fields),
    // file_path, profile_id → descartados aquí
  };
}
```

---

## Construcción del prompt final

```typescript
// apps/api/src/copilot/chat.ts

export async function buildCopilotMessages(
  userMessage: string,
  relevantStudies: NormalizedStudy[],
  history: ConversationMessage[]  // últimos 10 turnos = 20 mensajes
): Promise<MessageParam[]> {

  const contextBlock = relevantStudies.length > 0
    ? `<estudios_relevantes>\n${JSON.stringify(relevantStudies, null, 2)}\n</estudios_relevantes>\n\n`
    : '<estudios_relevantes>Sin estudios disponibles para esta consulta.</estudios_relevantes>\n\n';

  return [
    // Primer mensaje: contexto + pregunta
    {
      role: 'user',
      content: `${contextBlock}${userMessage}`
    },
    // Historial de la conversación (sin el primer contexto inyectado)
    ...history.slice(-20),
  ];
}
```

---

## Rate limiting

```typescript
// apps/api/src/copilot/rate-limit.ts

const MAX_QUERIES_PER_HOUR = 20; // hardcodeado — no configurable por usuario

export async function checkCopilotRateLimit(
  profileId: string
): Promise<Result<void>> {

  const windowStart = new Date(Date.now() - 60 * 60 * 1000); // última hora

  const { count } = await supabase
    .from('copilot_usage')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('created_at', windowStart.toISOString());

  if ((count ?? 0) >= MAX_QUERIES_PER_HOUR) {
    return {
      ok: false,
      error: new Error(`Límite de ${MAX_QUERIES_PER_HOUR} consultas por hora alcanzado`)
    };
  }

  // Registrar uso
  await supabase.from('copilot_usage').insert({ profile_id: profileId });
  return { ok: true, data: undefined };
}
```

---

## Generación de embeddings (async, post-confirm)

```typescript
// supabase/functions/generate-embeddings/index.ts
// Se dispara via Supabase Edge Function después de confirm

Deno.serve(async (req) => {
  const { studyId } = await req.json();

  const study = await getConfirmedStudy(studyId);

  // Construir texto normalizado para embedding
  const text = [
    `Tipo: ${study.study_type}`,
    `Categoría: ${study.category}`,
    `Fecha: ${study.study_date}`,
    ...Object.entries(study.extracted_fields)
      .map(([k, v]) => `${k}: ${v}`)
  ].join('\n');

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  await supabase.from('study_embeddings').upsert({
    study_id: studyId,
    embedding: embedding.data[0].embedding,
    normalized_text: text,
  });
});
```

---

## Estimación de costo por query

| Componente | Tokens aprox | Costo aprox (USD) |
|---|---|---|
| Embed pregunta (input) | ~50 tokens | ~$0.000010 |
| System prompt (input) | ~500 tokens | ~$0.000750 |
| 5 estudios contexto (input) | ~2.000 tokens | ~$0.003000 |
| Historial 10 turnos (input) | ~1.500 tokens | ~$0.002250 |
| Respuesta (output, max 1024) | ~400 tokens avg | ~$0.006000 |
| **Total por query** | **~4.450 tokens** | **~$0.012** |

Con 20 queries/hora máx/usuario: costo máximo ~$0.24/usuario/hora (caso extremo).
