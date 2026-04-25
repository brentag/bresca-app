import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { z } from 'zod';
import { COPILOT_MAX_TOKENS } from '@bresca/shared';
import { requireAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { checkRateLimit } from './rate-limit';
import { COPILOT_SYSTEM_PROMPT_V1 } from './system-prompt';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(20)
    .optional()
    .default([]),
});

async function buildVaultContext(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return 'Sin estudios registrados.';

  const { data: studies } = await supabase
    .from('studies')
    .select('study_type, category, study_date')
    .eq('profile_id', profile.id)
    .eq('confirmed', true)
    .order('study_date', { ascending: false })
    .limit(20);

  if (!studies || studies.length === 0) return 'Sin estudios registrados.';

  return studies
    .map((s) => `- ${s.study_type} (${s.category}) — ${s.study_date}`)
    .join('\n');
}

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
  const systemPrompt = COPILOT_SYSTEM_PROMPT_V1.replace('{{VAULT_CONTEXT}}', vaultContext);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: COPILOT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const text = response.content.find((b) => b.type === 'text')?.text ?? '';

  res.json({ reply: text, remaining });
});

export default router;
