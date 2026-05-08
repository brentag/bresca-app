import OpenAI from 'openai';
import { Router } from 'express';
import { z } from 'zod';
import { COPILOT_MAX_TOKENS } from '@bresca/shared';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { checkRateLimit } from './rate-limit';
import { COPILOT_SYSTEM_PROMPT_V1 } from './system-prompt';

const router = Router();
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(20)
    .optional()
    .default([]),
});

// S-13 — strip prompt-injection patterns before inserting vault data into system prompt
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/\[\[.*?\]\]/gs, '')              // wiki-links / Obsidian-style refs
    .replace(/ignor[ae]\b/gi, '***')           // ignore / ignora / ignorar
    .replace(/instruc(ci[oó]n|tion)s?/gi, '***')  // instrucción / instructions
    .replace(/olvid[ae]\b/gi, '***')           // olvidar / olvida / forget
    .replace(/system\s*prompt/gi, '***')       // system prompt leakage
    .replace(/jailbreak/gi, '***')
    .slice(0, 4000);
}

async function buildVaultContext(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return 'Sin estudios registrados.';

  const { data: studies } = await supabase
    .from('studies')
    .select('study_type, category, study_date, extracted_fields')
    .eq('profile_id', profile.id)
    .eq('confirmed', true)
    .order('study_date', { ascending: false })
    .limit(15);

  if (!studies || studies.length === 0) return 'Sin estudios registrados.';

  return studies.map((s) => {
    const fields = s.extracted_fields as Record<string, string> | null;
    const values = fields && Object.keys(fields).length > 0
      ? '\n' + Object.entries(fields).map(([k, v]) => `    ${k}: ${v}`).join('\n')
      : '';
    return `- ${s.study_type} (${s.category}) — ${s.study_date}${values}`;
  }).join('\n');
}

router.post('/context-card', requireAuth, async (req, res) => {
  const userId: string = res.locals.userId;
  const vaultContext = await buildVaultContext(userId);
  const noStudies = vaultContext === 'Sin estudios registrados.';
  const context = noStudies
    ? 'No tengo estudios registrados en Bresca aún.'
    : `Mis estudios médicos registrados en Bresca:\n\n${vaultContext}`;
  res.json({ context });
});

router.post('/chat', requireAuth, async (req, res) => {
  const parse = ChatSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'Invalid body', issues: parse.error.issues }); return; }

  const userId: string = res.locals.userId;
  const { allowed, remaining } = checkRateLimit(userId);

  if (!allowed) {
    res.status(429).json({ error: 'Rate limit reached', retryAfterMs: 3_600_000 });
    return;
  }

  const { message, history } = parse.data;
  const vaultContext = await buildVaultContext(userId);
  const systemPrompt = COPILOT_SYSTEM_PROMPT_V1.replace('{{VAULT_CONTEXT}}', sanitizeForPrompt(vaultContext));

  let text: string;
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: COPILOT_MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: message },
      ],
    });
    text = response.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('DeepSeek API error:', err instanceof Error ? err.message : String(err));
    res.status(503).json({ error: 'Servicio temporalmente no disponible. Intentá en unos minutos.' });
    return;
  }

  res.json({ reply: text, remaining });
});

export default router;
