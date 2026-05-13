import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText } from 'npm:unpdf@0.12.1';
import OpenAI from 'npm:openai@4.77.0';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY')!;
const MISTRAL_API_KEY   = Deno.env.get('MISTRAL_API_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const deepseek = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Mistral Pixtral — usado solo si MISTRAL_API_KEY está configurado
const mistral = MISTRAL_API_KEY
  ? new OpenAI({ apiKey: MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' })
  : null;

// confidence_score: el modelo reporta su confianza (0=ilegible, 100=perfectamente legible y completo)
// category: una de las 8 categorías Bresca; default 'otro' si no encaja.
const ALLOWED_CATEGORIES = [
  'hematología', 'bioquímica', 'imágenes', 'cardiología',
  'endocrinología', 'respiratorio', 'receta', 'otro',
] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const SYSTEM_PROMPT = `Sos un experto en análisis de estudios médicos latinoamericanos.
Respondé SIEMPRE con JSON válido, sin markdown, sin explicaciones:
{
  "study_type": "nombre del estudio",
  "category": "hematología" | "bioquímica" | "imágenes" | "cardiología" | "endocrinología" | "respiratorio" | "receta" | "otro",
  "lab_name": "laboratorio o centro médico" | null,
  "study_date": "YYYY-MM-DD" | null,
  "extracted_fields": { "Campo en español": "valor con unidad" },
  "confidence_score": 85
}
category: clasificá el estudio en una sola categoría:
  - hematología: hemograma, plaquetas, coagulación, ferrocinética, eritrosedimentación
  - bioquímica: glucemia, urea, creatinina, lípidos, función hepática, orina, electrolitos
  - imágenes: radiografía, ecografía, tomografía, resonancia, mamografía
  - cardiología: ECG, ecocardiograma, holter, ergometría
  - endocrinología: tiroides (TSH/T4/T3), hormonas (FSH/LH/cortisol/testosterona), HOMA, insulina
  - respiratorio: espirometría, función pulmonar, gases en sangre
  - receta: prescripción médica, medicamentos indicados, posología, dosis, nombre de médico + matrícula, diagnóstico, "válida hasta"
  - otro: cualquier estudio que no encaje claramente arriba
confidence_score: tu nivel de confianza en la extracción (0=documento ilegible, 100=todo perfectamente legible y completo).
Reglas: solo campos con valores concretos del documento, nunca inventes,
si no hay año tomá el actual, extracted_fields vacío si el texto es ilegible.
Para recetas: extraé en extracted_fields: Prescriptor, Matrícula, Medicamento 1, Dosis 1 (y siguientes numerados), Diagnóstico, Válida hasta (formato DD/MM/YYYY o YYYY-MM-DD).`;

type DraftRow = {
  id: string;
  storage_path: string;
  storage_paths: string[] | null;
  mime_type: string;
  category: string | null;
};

type Structured = {
  study_type: string;
  category: Category;
  lab_name: string | null;
  study_date: string;
  extracted_fields: Record<string, string>;
  raw_text: string;
  ocr_score: number;
};

type PageResult = Omit<Structured, 'raw_text' | 'ocr_score'> & {
  raw_text?: string;
  confidence_score?: number;
};

function normalizeCategory(raw: unknown): Category {
  if (typeof raw !== 'string') return 'otro';
  const trimmed = raw.trim().toLowerCase();
  // tolera acentos opcionales y variantes comunes
  const map: Record<string, Category> = {
    'hematologia': 'hematología', 'hematología': 'hematología', 'sangre': 'hematología',
    'bioquimica': 'bioquímica', 'bioquímica': 'bioquímica', 'quimica': 'bioquímica',
    'imagenes': 'imágenes', 'imágenes': 'imágenes', 'imagen': 'imágenes',
    'radiologia': 'imágenes', 'radiología': 'imágenes',
    'cardiologia': 'cardiología', 'cardiología': 'cardiología', 'corazon': 'cardiología', 'corazón': 'cardiología',
    'endocrinologia': 'endocrinología', 'endocrinología': 'endocrinología', 'endocrino': 'endocrinología',
    'respiratorio': 'respiratorio', 'respiratoria': 'respiratorio', 'pulmonar': 'respiratorio',
    'receta': 'receta', 'recetas': 'receta', 'prescripcion': 'receta', 'prescripción': 'receta', 'medicamento': 'receta', 'prescripcion medica': 'receta',
    'otro': 'otro', 'otros': 'otro',
  };
  return map[trimmed] ?? 'otro';
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const draft_id: string | undefined = body.draft_id;
  if (!draft_id) return new Response('missing draft_id', { status: 400 });

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

  EdgeRuntime.waitUntil(processAndSave(draft));
  return new Response(null, { status: 202 });
});

async function processAndSave(draft: DraftRow): Promise<void> {
  try {
    const result = await process(draft);

    // Si el cliente no envió category (auto-detect), persistimos la detectada.
    // Si la envió, respetamos el override del usuario.
    const finalCategory = draft.category && draft.category.length > 0
      ? draft.category
      : result.category;

    await supabase
      .from('study_drafts')
      .update({
        status:           'completed',
        study_type:       result.study_type,
        category:         finalCategory,
        lab_name:         result.lab_name,
        study_date:       result.study_date,
        extracted_fields: result.extracted_fields,
        raw_text:         result.raw_text,
        ocr_score:        result.ocr_score,
        ocr_pass:         1,
        needs_review:     false,
        completed_at:     new Date().toISOString(),
      })
      .eq('id', draft.id);

    // Segundo pass si score < 80 y es imagen (PDFs y DICOM no aplican)
    const isImage = draft.mime_type.startsWith('image/');
    if (result.ocr_score < 80 && isImage && mistral) {
      await runSecondPass(draft, result);
    } else if (result.ocr_score < 80 && !isImage) {
      // PDFs/DICOM con score bajo: marcar directamente sin segundo pass
      await supabase
        .from('study_drafts')
        .update({ needs_review: true })
        .eq('id', draft.id);
    }
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
  }
}

async function runSecondPass(draft: DraftRow, pass1: Structured): Promise<void> {
  try {
    const paths = draft.storage_paths ?? [draft.storage_path];
    const results: PageResult[] = [];

    for (const path of paths) {
      const mime = mimeFromPath(path);
      if (!mime.startsWith('image/')) continue;

      const { data: file } = await supabase.storage.from('studies').download(path);
      if (!file) continue;

      const buffer  = new Uint8Array(await file.arrayBuffer());
      const base64  = encodeBase64(buffer);
      const dataUrl = `data:${mime};base64,${base64}`;
      const today   = new Date().toISOString().slice(0, 10);

      const resp = await mistral!.chat.completions.create({
        model: 'pixtral-12b-2409',
        max_tokens: 1024,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${draft.category ? `Pista de categoría: ${draft.category}. ` : ''}Hoy: ${today}. Analizá este estudio médico con máxima atención al detalle. Extraé TODOS los valores numéricos y referencias que puedas identificar.`,
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ] as never,
          },
        ],
      });

      const parsed = parseStructured(resp.choices[0]?.message?.content ?? '{}', today);
      results.push(parsed);
    }

    if (results.length === 0) {
      await supabase.from('study_drafts').update({ needs_review: true, ocr_pass: 2 }).eq('id', draft.id);
      return;
    }

    // Mergear resultados del segundo pass
    const merged = mergePageResults(results);
    const score2 = computeImageScore(merged);

    // Tomar la mejor extracción: si Pass 2 mejoró, actualizar campos
    const finalScore  = Math.max(pass1.ocr_score, score2);
    const betterPass  = score2 > pass1.ocr_score ? merged : pass1;
    const mergedFields = { ...pass1.extracted_fields, ...merged.extracted_fields };

    await supabase
      .from('study_drafts')
      .update({
        study_type:       betterPass.study_type || pass1.study_type,
        lab_name:         betterPass.lab_name   ?? pass1.lab_name,
        study_date:       betterPass.study_date || pass1.study_date,
        extracted_fields: mergedFields,
        ocr_score:        finalScore,
        ocr_pass:         2,
        needs_review:     finalScore < 80,
      })
      .eq('id', draft.id);
  } catch (err) {
    console.error('[process-study-draft] second-pass failed:', err instanceof Error ? err.message : String(err));
    // Segundo pass falló — mantener Pass 1 pero marcar revisión si score era bajo
    await supabase
      .from('study_drafts')
      .update({ needs_review: pass1.ocr_score < 80, ocr_pass: 2 })
      .eq('id', draft.id);
  }
}

// ── Procesamiento principal ──────────────────────────────────────────────────

async function process(draft: DraftRow): Promise<Structured> {
  const today = new Date().toISOString().slice(0, 10);
  const paths = draft.storage_paths ?? [draft.storage_path];
  // Hint para el LLM: si el usuario seleccionó categoría, la pasamos como pista.
  // Si vino NULL (auto-detect), pasamos string vacío — el modelo clasifica desde cero.
  const categoryHint = draft.category ?? '';

  if (paths.length === 1) {
    return processSinglePath(paths[0], draft.mime_type, categoryHint, today);
  }

  const results: PageResult[] = [];
  for (const path of paths) {
    const mime = mimeFromPath(path);
    const r = await processSinglePath(path, mime, categoryHint, today);
    results.push({ ...r, confidence_score: r.ocr_score });
  }
  const merged = mergeResults(results);
  return merged;
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

  validateMagicBytes(buffer, mime);

  if (mime === 'application/pdf') {
    const { text } = await extractText(buffer, { mergePages: true });
    const rawText = (Array.isArray(text) ? text.join('\n') : text).trim();
    const structured = await structureFromText(rawText, category, today);
    const ocr_score  = computePdfScore(structured, rawText);
    return { ...structured, raw_text: rawText, ocr_score };
  }

  if (mime === 'application/dicom') {
    const structured = await processDicom(buffer, today);
    return { ...structured, raw_text: '', ocr_score: 95 };
  }

  // Imagen: DeepSeek Vision
  const base64  = encodeBase64(buffer);
  const dataUrl = `data:${mime};base64,${base64}`;
  const structured = await structureFromImage(dataUrl, category, today);
  const ocr_score  = computeImageScore(structured);
  return { ...structured, raw_text: '', ocr_score };
}

// ── Score helpers ────────────────────────────────────────────────────────────

function computePdfScore(
  result: Omit<Structured, 'raw_text' | 'ocr_score'>,
  rawText: string,
): number {
  if (!rawText || rawText.length < 30) return 20;
  let score = 50;
  if (rawText.length > 200) score += 10;
  if (rawText.length > 800) score += 5;
  if (result.study_type && result.study_type !== 'Estudio clínico') score += 15;
  if (result.study_date) score += 10;
  score += Math.min(Object.keys(result.extracted_fields).length * 2, 10);
  return Math.min(score, 100);
}

function computeImageScore(
  result: Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number },
): number {
  const llmConf   = typeof result.confidence_score === 'number' ? result.confidence_score : 50;
  const fieldCount = Object.keys(result.extracted_fields).length;
  // Si el modelo dice alta confianza pero no extrajo nada, no confiamos
  if (llmConf > 70 && fieldCount === 0 && !result.study_type) return 40;
  return Math.min(Math.round(llmConf), 100);
}

// ── LLM wrappers ─────────────────────────────────────────────────────────────

async function structureFromText(
  text: string,
  category: string,
  today: string,
): Promise<Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number }> {
  const hint = category ? `Pista de categoría: ${category}\n` : '';
  const resp = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${hint}Hoy: ${today}\n\nTexto:\n---\n${text.slice(0, 4000)}\n---`,
      },
    ],
  });
  return parseStructured(resp.choices[0]?.message?.content ?? '{}', today);
}

async function structureFromImage(
  dataUrl: string,
  category: string,
  today: string,
): Promise<Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number }> {
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
            text: `${category ? `Pista de categoría: ${category}. ` : ''}Hoy: ${today}. Clasificá y extraé los datos del estudio en la imagen.`,
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] as never,
      },
    ],
  });
  return parseStructured(resp.choices[0]?.message?.content ?? '{}', today);
}

function parseStructured(
  content: string,
  today: string,
): Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number } {
  const clean = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(clean);
  return {
    study_type:       parsed.study_type ?? 'Estudio clínico',
    category:         normalizeCategory(parsed.category),
    lab_name:         parsed.lab_name   ?? null,
    study_date:       parsed.study_date ?? today,
    extracted_fields: parsed.extracted_fields ?? {},
    confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : undefined,
  };
}

// ── Merge multi-page ─────────────────────────────────────────────────────────

// Categoría más frecuente entre páginas, excluyendo 'otro' si hay alternativas concretas.
function pickCategory(pages: { category?: Category }[]): Category {
  const counts: Record<string, number> = {};
  for (const p of pages) if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const entries = Object.entries(counts).filter(([k]) => k !== 'otro');
  if (entries.length === 0) return (counts['otro'] ? 'otro' : 'otro');
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as Category;
}

function mergePageResults(
  pages: (Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number })[],
): Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number } {
  const merged: Omit<Structured, 'raw_text' | 'ocr_score'> & { confidence_score?: number } = {
    study_type:       '',
    category:         'otro',
    lab_name:         null,
    study_date:       '',
    extracted_fields: {},
    confidence_score: undefined,
  };
  const scores: number[] = [];

  for (const page of pages) {
    if (!merged.study_type && page.study_type) merged.study_type = page.study_type;
    if (!merged.lab_name   && page.lab_name)   merged.lab_name   = page.lab_name;
    if (!merged.study_date && page.study_date) merged.study_date = page.study_date;
    Object.assign(merged.extracted_fields, page.extracted_fields);
    if (typeof page.confidence_score === 'number') scores.push(page.confidence_score);
  }

  merged.study_type       = merged.study_type || 'Estudio clínico';
  merged.category         = pickCategory(pages);
  if (scores.length > 0) merged.confidence_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return merged;
}

function mergeResults(pages: PageResult[]): Structured {
  const merged: Structured = {
    study_type:       '',
    category:         'otro',
    lab_name:         null,
    study_date:       '',
    extracted_fields: {},
    raw_text:         '',
    ocr_score:        0,
  };
  const scores: number[] = [];

  for (const page of pages) {
    if (!merged.study_type && page.study_type) merged.study_type = page.study_type;
    if (!merged.lab_name   && page.lab_name)   merged.lab_name   = page.lab_name;
    if (!merged.study_date && page.study_date) merged.study_date = page.study_date;
    Object.assign(merged.extracted_fields, page.extracted_fields);
    if (page.raw_text) merged.raw_text += (merged.raw_text ? '\n' : '') + page.raw_text;
    if (typeof page.confidence_score === 'number') scores.push(page.confidence_score);
  }

  merged.study_type = merged.study_type || 'Estudio clínico';
  merged.category   = pickCategory(pages);
  merged.ocr_score  = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 50;

  return merged;
}

// ── DICOM ────────────────────────────────────────────────────────────────────

const MODALITY_NAMES: Record<string, string> = {
  CR: 'Radiografía', CT: 'Tomografía Computada', MR: 'Resonancia Magnética',
  US: 'Ecografía', MG: 'Mamografía', DX: 'Radiografía Digital',
  PT: 'PET Scan', NM: 'Medicina Nuclear', XA: 'Angiografía',
  RF: 'Fluoroscopía', OT: 'Otro',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processDicom(buffer: Uint8Array, today: string): Promise<Omit<Structured, 'raw_text' | 'ocr_score'>> {
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
  if (modalityRaw)   extracted_fields['Modalidad']        = modalityRaw;
  if (bodyPartLabel) extracted_fields['Parte del cuerpo'] = bodyPartLabel;
  if (studyDesc)     extracted_fields['Descripción']      = studyDesc;
  if (rows && cols)  extracted_fields['Resolución']       = `${cols} × ${rows} px`;

  return {
    study_type: study_type || 'Imagen DICOM',
    category:   'imágenes',
    lab_name:   null,
    study_date: studyDate,
    extracted_fields,
  };
}

// ── Utils ────────────────────────────────────────────────────────────────────

function validateMagicBytes(buf: Uint8Array, claimedMime: string): void {
  const isPdf  = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47; // \x89PNG
  const isWebP = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46  // RIFF
              && buf.length > 11
              && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50; // WEBP
  const isDicom = buf.length > 131
              && buf[128] === 0x44 && buf[129] === 0x49 && buf[130] === 0x43 && buf[131] === 0x4D; // DICM

  const valid =
    (claimedMime === 'application/pdf'   && isPdf)  ||
    (claimedMime === 'image/jpeg'        && isJpeg) ||
    (claimedMime === 'image/png'         && isPng)  ||
    (claimedMime === 'image/webp'        && isWebP) ||
    (claimedMime === 'application/dicom' && isDicom);

  if (!valid) {
    throw new Error(`mime_mismatch: claimed=${claimedMime} actual_bytes=[${buf[0]},${buf[1]},${buf[2]},${buf[3]}]`);
  }
}

function parseDicomDate(raw?: string): string | undefined {
  if (!raw || raw.length !== 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'png')  return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'dcm')  return 'application/dicom';
  return 'image/jpeg';
}

function encodeBase64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}
