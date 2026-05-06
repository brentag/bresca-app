# Skill: copilot-context
> Cargar cuando: trabajás en el chat del Copilot, modificás el sistema de retrieval, tocás el system prompt, o debuggeás respuestas del Copilot.

## Arquitectura del Copilot

```
Usuario envía mensaje
  → Rate limit check (20/hora/usuario)
  → Cargar estudios confirmados del perfil (context building)
  → Construir prompt (system + estudios relevantes + historial)
  → POST DeepSeek API (deepseek-chat, max_tokens: 1024)
    API es OpenAI-compatible → mismo SDK, distinto base_url + key
  → Retornar respuesta
  → Guardar en historial (últimos 10 turnos)
```

**MVP:** el contexto incluye los estudios confirmados del perfil activo, sanitizados contra la allowlist de campos clínicos. Retrieval semántico con embeddings está planificado para v2.

---

## System prompt

El system prompt vive en `apps/api/src/copilot/system-prompt.ts` como constante exportada.

**Regla:** nunca inline el system prompt en el handler. Siempre importar la constante.
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

## Llamada a la API (DeepSeek, OpenAI-compatible)

```typescript
// apps/api/src/copilot/chat.ts
import OpenAI from 'openai';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey:  process.env.DEEPSEEK_API_KEY!,
});

async function callCopilot(req: CopilotRequest): Promise<Result<string>> {
  const response = await deepseek.chat.completions.create({
    model:      'deepseek-chat',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: COPILOT_SYSTEM_PROMPT_V1 },
      {
        role:    'user',
        content: `
<estudios_relevantes>
${JSON.stringify(req.relevantStudies, null, 2)}
</estudios_relevantes>

${req.userMessage}
        `.trim()
      },
      // Historial de la conversación (máx 10 turnos = 20 mensajes)
      ...req.conversationHistory.slice(-20),
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return { ok: true, data: text };
}
```

---

## Sanitización antes de enviar a DeepSeek

```typescript
// Lo que el Copilot puede ver de cada estudio
interface NormalizedStudy {
  study_type: string;
  study_date: string;       // 'YYYY-MM-DD'
  category: string;
  extracted_fields: Record<string, string | number>;
  // NUNCA incluir: profile_id, user_id, storage_path, nombres propios
}

function sanitizeStudyForCopilot(raw: Study): NormalizedStudy {
  return {
    study_type:       raw.study_type,
    study_date:       raw.study_date,
    category:         raw.category,
    extracted_fields: filterAllowlist(raw.extracted_fields),
    // storage_path, profile_id → descartados aquí
  };
}
```

---

## Construcción del contexto

```typescript
// apps/api/src/copilot/context.ts

export async function buildCopilotContext(
  profileId: string
): Promise<NormalizedStudy[]> {
  // Solo estudios confirmados del perfil activo
  const { data: studies } = await supabase
    .from('studies')
    .select('study_type, study_date, category, extracted_fields')
    .eq('profile_id', profileId)
    .eq('confirmed', true)
    .order('study_date', { ascending: false })
    .limit(20);  // cap para no exceder context window

  return (studies ?? []).map(sanitizeStudyForCopilot);
}
```

---

## Rate limiting

```typescript
// apps/api/src/copilot/rate-limit.ts

const MAX_QUERIES_PER_HOUR = 20; // hardcodeado — no configurable por usuario

export async function checkCopilotRateLimit(
  profileId: string
): Promise<Result<{ remainingQueries: number }>> {

  const windowStart = new Date(Date.now() - 60 * 60 * 1000); // última hora

  const { count } = await supabase
    .from('copilot_usage')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('created_at', windowStart.toISOString());

  const used = count ?? 0;

  if (used >= MAX_QUERIES_PER_HOUR) {
    return {
      ok: false,
      error: Object.assign(
        new Error(`Límite de ${MAX_QUERIES_PER_HOUR} consultas por hora alcanzado`),
        { retryAfterMs: 60 * 60 * 1000 }
      )
    };
  }

  await supabase.from('copilot_usage').insert({ profile_id: profileId });
  return { ok: true, data: { remainingQueries: MAX_QUERIES_PER_HOUR - used - 1 } };
}
```

---

## Estimación de costo por query (DeepSeek)

| Componente | Tokens aprox | Costo aprox (USD) |
|---|---|---|
| System prompt (input) | ~500 tokens | ~$0.000070 |
| 20 estudios contexto (input) | ~2.000 tokens | ~$0.000280 |
| Historial 10 turnos (input) | ~1.500 tokens | ~$0.000210 |
| Respuesta (output, max 1024) | ~400 tokens avg | ~$0.000440 |
| **Total por query** | **~4.400 tokens** | **~$0.001** |

DeepSeek es ~10-15x más barato que Claude API para el mismo volumen.
Con 20 queries/hora máx/usuario: costo máximo ~$0.02/usuario/hora (caso extremo).

---

## Plan v2: retrieval semántico

Para vaults con muchos estudios (> 20), se implementará:
1. **Indexación:** cada estudio confirmado se vectoriza con DeepSeek embeddings y se guarda en `study_embeddings`.
2. **Retrieval por query:** cosine similarity top-K antes de cada llamada al Copilot.
3. **Función SQL:** `match_study_embeddings(query_embedding, profile_id, threshold, k)` con pgvector.

Hasta implementar v2, el MVP envía directamente los últimos 20 estudios confirmados.
