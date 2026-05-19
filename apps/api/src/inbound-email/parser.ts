import type { PostmarkInboundPayload, ParsedAttachment, ParsedLink } from './types';

const MAX_SIZE_BYTES = parseInt(process.env.INBOUND_EMAIL_MAX_SIZE_MB ?? '25', 10) * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/dicom', 'application/octet-stream',
]);

// Dominios / keywords a excluir del link scoring
const EXCLUDE_URL_PATTERNS = [
  'unsubscribe', 'optout', 'opt-out', 'click-track', 'tracking',
  'pixel', 'beacon', '1x1', 'open.php', 'click.php',
];
const EXCLUDE_DOMAINS = ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'linkedin.com', 'youtube.com'];

// Keywords que indican relevancia médica en la URL
const MEDICAL_URL_KEYWORDS = ['resultado', 'informe', 'laboratorio', 'estudio', 'analisis', 'analísis', 'clinica', 'clínica', 'informe', 'report', 'resultado'];
const MEDICAL_TLDS = ['.com.ar', '.ar', '.com.mx', '.mx', '.cl', '.co', '.com.br', '.br', '.com.pe', '.pe'];
const MEDICAL_ANCHOR_KEYWORDS = ['resultado', 'descargar', 'download', 'pdf', 'ver informe', 'ver resultado', 'obtener'];

/**
 * Verifica magic bytes del buffer para confirmar el tipo de archivo.
 * No confiar únicamente en Content-Type del remitente.
 */
export function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 8) return null;
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  // JPEG: FF D8
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // DICOM: DICM at offset 128
  if (buf.length >= 132 && buf[128] === 0x44 && buf[129] === 0x49 && buf[130] === 0x43 && buf[131] === 0x4D) return 'application/dicom';
  return null;
}

/** Extrae y valida adjuntos del payload de Postmark. */
export function parseAttachments(payload: PostmarkInboundPayload): ParsedAttachment[] {
  const results: ParsedAttachment[] = [];
  for (const att of payload.Attachments ?? []) {
    if (att.ContentLength > MAX_SIZE_BYTES) continue;
    const declaredMime = att.ContentType?.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIMES.has(declaredMime) && declaredMime !== 'application/octet-stream') continue;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(att.Content, 'base64');
    } catch {
      continue;
    }
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime) continue; // No reconocible por magic bytes — rechazar
    results.push({ name: att.Name, buffer, mimeType: detectedMime, sizeBytes: buffer.length });
  }
  return results;
}

function scoreLink(url: string, anchorText: string): number {
  const lower = url.toLowerCase();
  const anchor = anchorText.toLowerCase();
  let score = 0;
  // Excluir tracking/unsubscribe
  if (EXCLUDE_URL_PATTERNS.some(p => lower.includes(p))) return -99;
  if (EXCLUDE_DOMAINS.some(d => lower.includes(d))) return -99;
  // Solo HTTP/HTTPS
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return -99;
  // Bonus por contenido médico en URL
  if (MEDICAL_URL_KEYWORDS.some(k => lower.includes(k))) score += 3;
  // Bonus por TLDs LATAM
  if (MEDICAL_TLDS.some(t => lower.includes(t))) score += 2;
  // Bonus por anchor relevante
  if (MEDICAL_ANCHOR_KEYWORDS.some(k => anchor.includes(k))) score += 1;
  return score;
}

/**
 * Extrae links del body del email y los ordena por relevancia médica.
 * Solo se llama si no hay adjuntos válidos.
 * Retorna top-5 con score > -99.
 */
export function parseLinks(payload: PostmarkInboundPayload): ParsedLink[] {
  const seen = new Set<string>();
  const links: ParsedLink[] = [];

  // Parsear HTML body
  const htmlRe = /<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlRe.exec(payload.HtmlBody ?? '')) !== null) {
    const url = m[1];
    const anchorText = m[2].replace(/<[^>]+>/g, '').trim();
    if (seen.has(url)) continue;
    seen.add(url);
    const score = scoreLink(url, anchorText);
    if (score > -99) links.push({ url, anchorText, source: 'html', score });
  }

  // Parsear texto plano — solo si necesitamos más URLs
  const textRe = /(https?:\/\/[^\s<>"']+)/g;
  while ((m = textRe.exec(payload.TextBody ?? '')) !== null) {
    const url = m[1].replace(/[.,;!?)]+$/, ''); // limpiar puntuación trailing
    if (seen.has(url)) continue;
    seen.add(url);
    const score = scoreLink(url, '');
    if (score > -99) links.push({ url, anchorText: '', source: 'plain', score });
  }

  return links.sort((a, b) => b.score - a.score).slice(0, 5);
}
