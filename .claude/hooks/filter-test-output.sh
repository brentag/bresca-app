#!/usr/bin/env node
// PostToolUse hook: resumen limpio de Jest/Vitest para Claude Code.
// Recibe el resultado del tool como JSON por stdin (campo tool_response.output).
// Emite additionalContext con el resumen filtrado.
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { return; }

  const resp = data.tool_response || {};
  const output = resp.output || resp.stdout || '';
  if (!output) return;

  const lines = output.split('\n');
  const filtered = lines
    .filter(l => !l.startsWith('node_modules'))
    .filter(l => !/^\s*at /.test(l))
    .filter(l => !l.startsWith('Coverage directory'))
    .filter(l => !l.startsWith('istanbul'))
    .filter(l => !l.includes('Transform:'))
    .filter(l => !l.startsWith('Ran all test suites'))
    .map(l => l.replace(/\x1B\[[0-9;]*[mK]/g, ''));

  const fails     = filtered.filter(l => l.startsWith('FAIL ')).length;
  const passes    = filtered.filter(l => l.startsWith('PASS ')).length;
  const errors    = filtered.filter(l => /● |FAILED|Error:/.test(l));
  const failLines = filtered.filter(l => l.startsWith('FAIL '));

  const parts = ['=== TEST SUMMARY ===', `PASS: ${passes}  |  FAIL: ${fails}`];
  if (errors.length)    parts.push('', '=== FAILURES ===', ...errors);
  if (failLines.length) parts.push('', ...failLines);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: parts.join('\n')
    }
  }) + '\n');
});
