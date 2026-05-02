import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText } from 'npm:unpdf@0.12.1';
import OpenAI from 'npm:openai@4.77.0';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET    = Deno.env.get('EDGE_WEBHOOK_SECRET')!;
const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const deepseek = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const SYSTEM_PROMPT = `Sos un experto en análisis de estudios médicos latinoamericanos.
Respondé SIEMPRE con JSON válido, sin markdown, sin explicaciones:
{
  "study_type": "nombre del estudio",
  "lab_name": "laboratorio o centro médico" | null,
  "study_date": "YYYY-MM-DD" | null,
  "extracted_fields": { "Campo en español": "valor con unidad" }
}
Reglas: solo campos con valores concretos del documento, nunca inventes,
si no hay año tomá el actual, extracted_fields vacío si el texto es ilegible.`;

type DraftRow = {
  id: string;
  storage_path: string;
  mime_type: string;
  category: string;
};

type Structured = {
  study_type: string;
  lab_name: string | null;
  study_date: string;
  extracted_fields: Record<string, string>;
  raw_text: string;
};

Deno.serve(async (req) => {
  // ── Auth: shared secret del webhook ─────────────────────────
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const draft_id: string | undefined = body.draft_id;
  if (!draft_id) return new Response('missing draft_id', { status: 400 });

  // ── Claim idempotente: solo si sigue en pending ──────────────
  const { data: draft, error: claimErr } = await supabase
    .from('study_drafts')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', draft_id)
    .eq('status', 'pending')
    .select('id, storage_path, mime_type, category')
    .single<DraftRow>();

  if (claimErr || !draft) {
    // Otro worker ya lo tomó, o el draft no existe
    return new Response('already-claimed', { status: 200 });
  }

  try {
    const result = await process(draft);
    await supabase
      .from('study_drafts')
      .update({
        status:           'completed',
        study_type:       result.study_type,
        lab_name:         result.lab_name,
        study_date:       result.study_date,
        extracted_fields: result.extracted_fields,
        raw_text:         result.raw_text,
        completed_at:     new Date().toISOString(),
      })
      .eq('id', draft.id);

    return new Response('ok', { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[process-study-draft] failed', draft.id, msg);
    await supabase
      .from('study_drafts')
      .update({
        status:       'failed',
        error_log:    msg.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq('id', draft.id);

    // Respondemos 200 para que pg_net no reintente automáticamente
    return new Response('failed', { status: 200 });
  }
});

async function process(draft: DraftRow): Promise<Structured> {
  const { data: file, error: dlErr } = await supabase.storage
    .from('studies')
    .download(draft.storage_path);

  if (dlErr || !file) {
    throw new Error(`storage_download_failed: ${dlErr?.message ?? 'null'}`);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const today = new Date().toISOString().slice(0, 10);

  if (draft.mime_type === 'application/pdf') {
    const { text } = await extractText(buffer, { mergePages: true });
    const rawText = (Array.isArray(text) ? text.join('\n') : text).trim();
    const structured = await structureFromText(rawText, draft.category, today);
    return { ...structured, raw_text: rawText };
  }

  // Imágenes: DeepSeek Vision — un solo round-trip, sin WASM
  const base64 = encodeBase64(buffer);
  const dataUrl = `data:${draft.mime_type};base64,${base64}`;
  const structured = await structureFromImage(dataUrl, draft.category, today);
  return { ...structured, raw_text: '' };
}

async function structureFromText(
  text: string,
  category: string,
  today: string,
): Promise<Omit<Structured, 'raw_text'>> {
  const resp = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Categoría: ${category}\nHoy: ${today}\n\nTexto:\n---\n${text.slice(0, 4000)}\n---`,
      },
    ],
  });
  return parseStructured(resp.choices[0]?.message?.content ?? '{}', today);
}

async function structureFromImage(
  dataUrl: string,
  category: string,
  today: string,
): Promise<Omit<Structured, 'raw_text'>> {
  const resp = await deepseek.chat.completions.create({
    model: 'deepseek-vl2',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Categoría: ${category}. Hoy: ${today}. Extraé los datos del estudio en la imagen.`,
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] as never,
      },
    ],
  });
  return parseStructured(resp.choices[0]?.message?.content ?? '{}', today);
}

function parseStructured(content: string, today: string): Omit<Structured, 'raw_text'> {
  const clean = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(clean);
  return {
    study_type:       parsed.study_type ?? 'Estudio clínico',
    lab_name:         parsed.lab_name ?? null,
    study_date:       parsed.study_date ?? today,
    extracted_fields: parsed.extracted_fields ?? {},
  };
}

function encodeBase64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}
