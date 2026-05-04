#!/usr/bin/env node
/**
 * Hook: PostToolUse — git push origin main
 * Recuerda al agente que debe correr el QA post-deploy.
 */
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const cmd = input?.tool_input?.command || '';
    if (/git push origin main/.test(cmd)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            '⚠️  DEPLOY PUSHED — Recordatorio: correr `node scripts/post-deploy-qa.mjs` ' +
            'después de que Vercel/Render terminen el deploy (~2-3 min). ' +
            'Usar @skill post-deploy-qa para el protocolo completo.',
        },
      }));
      return;
    }
  } catch { /* ignorar */ }
  process.stdout.write('{}');
});
