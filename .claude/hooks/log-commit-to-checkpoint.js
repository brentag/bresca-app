#!/usr/bin/env node
// PostToolUse hook: registra cada git commit en el checkpoint del día.
// Busca (o crea) docs/checkpoint_deploy_YYYY-MM-DD.md y agrega una línea
// con hash + mensaje en la sección "Log de publicaciones".
const fs = require('fs');
const path = require('path');

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { return; }

  const output = (data.tool_response?.output || data.tool_response?.stdout || '').trim();
  if (!output) return;

  // git commit imprime algo como: [main abc1234] mensaje del commit
  const match = output.match(/\[[\w/]+ ([a-f0-9]+)\]\s+(.+)/);
  if (!match) return;

  const [, hash, message] = match;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 5);  // HH:MM

  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkpointPath = path.join(repoRoot, 'docs', `checkpoint_deploy_${dateStr}.md`);

  const logLine = `| \`${hash}\` | ${timeStr} | ${message} |`;

  if (!fs.existsSync(checkpointPath)) {
    // Crea un checkpoint stub si no existe para este día
    const stub = `# Checkpoint de Deploy — Bresca MVP
**Fecha:** ${dateStr}

---

## Log de publicaciones (auto-generado)

| Hash | Hora | Descripción |
|---|---|---|
${logLine}
`;
    fs.writeFileSync(checkpointPath, stub, 'utf8');
  } else {
    const content = fs.readFileSync(checkpointPath, 'utf8');
    const anchor = '<!-- Los commits posteriores se agregan aquí automáticamente -->';

    if (content.includes(anchor)) {
      // Inserta antes del comentario ancla
      const updated = content.replace(anchor, `${logLine}\n${anchor}`);
      fs.writeFileSync(checkpointPath, updated, 'utf8');
    } else {
      // Tabla ya tiene entradas — agrega al final
      const tableHeader = '| Hash | Hora | Descripción |\n|---|---|---|';
      if (content.includes('## Log de publicaciones')) {
        // Agrega la línea después del último | de la tabla
        const updated = content.replace(
          /(## Log de publicaciones[\s\S]*?)(\n\n---|\n\n##|$)/,
          `$1\n${logLine}$2`
        );
        fs.writeFileSync(checkpointPath, updated, 'utf8');
      } else {
        // No tiene sección — la agrega al final
        fs.appendFileSync(checkpointPath,
          `\n---\n\n## Log de publicaciones (auto-generado)\n\n| Hash | Hora | Descripción |\n|---|---|---|\n${logLine}\n`
        );
      }
    }
  }

  // Sin output: el hook no interrumpe el flujo normal
});
