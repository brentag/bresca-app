// S-13 / API-M4: strip prompt-injection patterns antes de insertar contenido
// proveniente del usuario o del vault dentro del system prompt de los LLMs.
//
// Compartido entre Copilot y Soporte para garantizar consistencia.

export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/\[\[.*?\]\]/gs, '')              // wiki-links / Obsidian-style refs
    .replace(/ignor[ae]\b/gi, '***')           // ignore / ignora / ignorar
    .replace(/instruc(ci[oó]n|tion)s?/gi, '***')  // instrucción / instructions
    .replace(/olvid[ae]\b/gi, '***')           // olvidar / olvida / forget
    .replace(/system\s*prompt/gi, '***')       // system prompt leakage
    .replace(/jailbreak/gi, '***')
    .slice(0, 4000);
}
