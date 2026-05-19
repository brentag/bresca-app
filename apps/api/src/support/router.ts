import OpenAI from 'openai';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { checkRateLimit } from '../copilot/rate-limit';
import { emitEvent } from '../lib/emit-event';
import { sanitizeForPrompt } from '../lib/sanitize';
import { buildUserContext } from '../lib/user-context';
import { SUPPORT_SYSTEM_PROMPT } from './system-prompt';

const SUPPORT_MAX_RPH = 15;

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

router.post('/chat', requireAuth, async (req, res) => {
  const parse = ChatSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid body', issues: parse.error.issues });
    return;
  }

  const userId: string = res.locals.userId;
  const { allowed, remaining } = await checkRateLimit(`support:${userId}`, SUPPORT_MAX_RPH);

  if (!allowed) {
    res.status(429).json({ error: 'Rate limit reached', retryAfterMs: 3_600_000 });
    return;
  }

  const { message, history } = parse.data;
  // API-M4: userContext incluye display_name del profile, que el usuario
  // controla. Sin sanitización, un atacante puede setear su display_name a
  // "Ignore previous instructions..." y secuestrar el system prompt del agente
  // de soporte.
  const userContext = sanitizeForPrompt(await buildUserContext(userId));
  const systemPrompt = SUPPORT_SYSTEM_PROMPT.replace('{{USER_CONTEXT}}', userContext);

  let text: string;
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1024,
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

  emitEvent('support_query', 'support');
  res.json({ reply: text, remaining });
});

export default router;
