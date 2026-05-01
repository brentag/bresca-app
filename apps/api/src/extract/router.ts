import OpenAI from 'openai';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { extractTextFromBuffer } from './ocr';

const router = Router();

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const ExtractSchema = z.object({
  storage_path: z.string().min(1),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  category: z.string().min(1),
});

const EXTRACT_SYSTEM_PROMPT = `\
Sos un experto en análisis de estudios médicos latinoamericanos.
Tu tarea es extraer información estructurada de texto de documentos médicos (laboratorios, imágenes, electrocardiogramas, recetas, etc.).

Respondé SIEMPRE con un JSON válido, sin markdown, sin explicaciones. El formato exacto es:
{
  "study_type": "nombre del estudio (ej: Hemograma completo, Radiografía de tórax)",
  "lab_name": "nombre del laboratorio o centro médico (puede ser null)",
  "study_date": "fecha en formato YYYY-MM-DD (puede ser null si no encontrás)",
  "extracted_fields": {
    "Campo 1": "valor con unidad (ej: 14.2 g/dL)",
    "Campo 2": "valor con unidad"
  }
}

Reglas:
- Incluí solo los campos con valores concretos encontrados en el texto
- No inventes valores que no estén en el texto
- Si el texto está muy ilegible o vacío, retorná extracted_fields vacío
- Las claves de extracted_fields en español
- study_date: si no hay año explícito, tomá el año actual`;

async function structureWithDeepSeek(
  rawText: string,
  category: string,
): Promise<{
  study_type: string;
  lab_name: string | null;
  study_date: string;
  extracted_fields: Record<string, string>;
}> {
  const today = new Date().toISOString().slice(0, 10);

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Categoría del estudio: ${category}\nFecha de hoy: ${today}\n\nTexto extraído del documento:\n---\n${rawText.slice(0, 4000)}\n---`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '{}';

  // Clean potential markdown code fences
  const clean = content.replace(/```json\n?|\n?```/g, '').trim();

  const parsed = JSON.parse(clean);
  return {
    study_type: parsed.study_type ?? 'Estudio clínico',
    lab_name: parsed.lab_name ?? null,
    study_date: parsed.study_date ?? today,
    extracted_fields: parsed.extracted_fields ?? {},
  };
}

// POST /extract — authenticated
router.post('/', requireAuth, async (req, res) => {
  const parse = ExtractSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const { storage_path, mime_type, category } = parse.data;

  // Download the file from Supabase Storage using service role
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('studies')
    .download(storage_path);

  if (downloadError || !fileData) {
    res.status(404).json({ error: 'File not found in storage' });
    return;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractTextFromBuffer(buffer, mime_type);
  } catch (err) {
    console.error('OCR error:', err);
    // If OCR fails entirely, still try DeepSeek with empty context
    rawText = '';
  }

  let structured;
  try {
    structured = await structureWithDeepSeek(rawText, category);
  } catch (err) {
    console.error('DeepSeek extract error:', err);
    res.status(503).json({ error: 'Error al procesar el documento. Intentá de nuevo.' });
    return;
  }

  res.json(structured);
});

export default router;
