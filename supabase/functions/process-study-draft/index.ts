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
  storage_paths: string[] | null;
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

type PageResult = Omit<Structured, 'raw_text'> & { raw_text?: string };

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
    .select('id, storage_path, storage_paths, mime_type, category')
    .single<DraftRow>();

  if (claimErr || !draft) {
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

    return new Response('failed', { status: 200 });
  }
});

async function process(draft: DraftRow): Promise<Structured> {
  const today = new Date().toISOString().slice(0, 10);
  const paths = draft.storage_paths ?? [draft.storage_path];

  if (paths.length === 1) {
    return processSinglePath(paths[0], draft.mime_type, draft.category, today);
  }

  // Multi-página: procesar cada una y mergear resultados
  const results: PageResult[] = [];
  for (const path of paths) {
    const mime = mimeFromPath(path);
    const r = await processSinglePath(path, mime, draft.category, today);
    results.push(r);
  }
  return mergeResults(results);
}

async function processSinglePath(
  path: string,
  mime: string,
  category: string,
  today: string,
): Promise<Structured> {
  const { data: file, error: dlErr } = await supabase.storage
    .from('studies')
    .download(path);

  if (dlErr || !file) {
    throw new Error(`storage_download_failed: ${path} — ${dlErr?.message ?? 'null'}`);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  if (mime === 'application/pdf') {
    const { text } = await extractText(buffer, { mergePages: true });
    const rawText = (Array.isArray(text) ? text.join('\n') : text).trim();
    const structured = await structureFromText(rawText, category, today);
    return { ...structured, raw_text: rawText };
  }

  if (mime === 'application/dicom') {
    const structured = await processDicom(buffer, today);
    return { ...structured, raw_text: '' };
  }

  // Imagen: DeepSeek Vision
  const base64  = encodeBase64(buffer);
  const dataUrl = `data:${mime};base64,${base64}`;
  const structured = await structureFromImage(dataUrl, category, today);
  return { ...structured, raw_text: '' };
}

function mergeResults(pages: PageResult[]): Structured {
  const merged: Structured = {
    study_type:       '',
    lab_name:         null,
    study_date:       '',
    extracted_fields: {},
    raw_text:         '',
  };

  for (const page of pages) {
    if (!merged.study_type && page.study_type) merged.study_type = page.study_type;
    if (!merged.lab_name   && page.lab_name)   merged.lab_name   = page.lab_name;
    if (!merged.study_date && page.study_date) merged.study_date = page.study_date;
    // Páginas posteriores pueden sobreescribir campos de páginas anteriores (más completas)
    Object.assign(merged.extracted_fields, page.extracted_fields);
    if (page.raw_text) merged.raw_text += (merged.raw_text ? '\n' : '') + page.raw_text;
  }

  merged.study_type = merged.study_type || 'Estudio clínico';
  return merged;
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

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'png')  return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'dcm')  return 'application/dicom';
  return 'image/jpeg';
}

const MODALITY_NAMES: Record<string, string> = {
  CR: 'Radiografía', CT: 'Tomografía Computada', MR: 'Resonancia Magnética',
  US: 'Ecografía', MG: 'Mamografía', DX: 'Radiografía Digital',
  PT: 'PET Scan', NM: 'Medicina Nuclear', XA: 'Angiografía',
  RF: 'Fluoroscopía', OT: 'Otro',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processDicom(buffer: Uint8Array, today: string): Promise<Omit<Structured, 'raw_text'>> {
  // Validate DICM magic at byte offset 128
  const magic = String.fromCharCode(buffer[128], buffer[129], buffer[130], buffer[131]);
  if (magic !== 'DICM') throw new Error('invalid DICOM: missing DICM preamble');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: dicomParser } = await import('npm:dicom-parser@1.8.21') as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataSet: any = dicomParser.parseDicom(buffer);

  const getStr = (tag: string): string | undefined => {
    try { return dataSet.string(tag)?.trim() || undefined; } catch { return undefined; }
  };
  const getUint16 = (tag: string): number | undefined => {
    try { return dataSet.uint16(tag); } catch { return undefined; }
  };

  const modalityRaw  = getStr('x00080060');
  const bodyPartRaw  = getStr('x00180015');
  const dateRaw      = getStr('x00080020');
  const studyDesc    = getStr('x0008103e') ?? getStr('x00081030');
  const rows         = getUint16('x00280010');
  const cols         = getUint16('x00280011');

  const studyDate     = parseDicomDate(dateRaw) ?? today;
  const modalityName  = MODALITY_NAMES[modalityRaw ?? ''] ?? modalityRaw ?? 'Imagen médica';
  const bodyPartLabel = bodyPartRaw ? capitalizeFirst(bodyPartRaw.toLowerCase()) : null;
  const study_type    = [modalityName, bodyPartLabel].filter(Boolean).join(' · ');

  const extracted_fields: Record<string, string> = {};
  if (modalityRaw)  extracted_fields['Modalidad']       = modalityRaw;
  if (bodyPartLabel) extracted_fields['Parte del cuerpo'] = bodyPartLabel;
  if (studyDesc)    extracted_fields['Descripción']     = studyDesc;
  if (rows && cols) extracted_fields['Resolución']      = `${cols} × ${rows} px`;

  return {
    study_type: study_type || 'Imagen DICOM',
    lab_name:   null,
    study_date: studyDate,
    extracted_fields,
  };
}

function parseDicomDate(raw?: string): string | undefined {
  if (!raw || raw.length !== 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function encodeBase64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}
