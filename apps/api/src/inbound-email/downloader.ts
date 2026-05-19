import { lookup as dnsLookup } from 'dns/promises';
import { detectMimeFromBuffer } from './parser';

const MAX_SIZE_BYTES = parseInt(process.env.INBOUND_EMAIL_MAX_SIZE_MB ?? '25', 10) * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 15_000;

// Rangos de IP privados/reservados (RFC 1918 + loopback + link-local + metadata)
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,   // link-local + metadata AWS/GCP
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // Shared address space RFC 6598
  /^::1$/,         // IPv6 loopback
  /^fc00:/i,       // IPv6 ULA
  /^fe80:/i,       // IPv6 link-local
];

const BLOCKED_HOSTS = ['localhost', 'metadata.google.internal', 'metadata'];
const BLOCKED_TLDS = ['.local', '.internal', '.localhost', '.localdomain'];

/** Verifica que una URL sea segura para descarga (anti-SSRF). */
export function isSafeUrl(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) return false;
  if (BLOCKED_TLDS.some(tld => host.endsWith(tld))) return false;
  // Rechazar IPs directas en rangos privados
  if (PRIVATE_RANGES.some(re => re.test(host))) return false;
  return true;
}

/**
 * Resuelve el hostname a IP y verifica que no sea privada.
 * Protege contra DNS rebinding: la URL puede apuntar a un dominio público
 * que resuelve a una IP privada.
 */
async function isDnsResolutionSafe(hostname: string): Promise<boolean> {
  try {
    const addresses = await dnsLookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (PRIVATE_RANGES.some(re => re.test(address))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Descarga un archivo desde una URL pública con protección SSRF y límite de tamaño. */
export async function downloadFile(url: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
} | null> {
  if (!isSafeUrl(url)) return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  // Validar resolución DNS (anti-rebinding)
  if (!(await isDnsResolutionSafe(parsed.hostname))) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Bresca-EmailBot/1.0' },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    // Verificar Content-Length antes de leer (evitar cargar archivos enormes)
    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_SIZE_BYTES) return null;
    // Leer con límite de bytes
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const reader = response.body?.getReader();
    if (!reader) return null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_SIZE_BYTES) { reader.cancel(); return null; }
      chunks.push(Buffer.from(value));
    }
    const buffer = Buffer.concat(chunks);
    const mimeType = detectMimeFromBuffer(buffer);
    if (!mimeType) return null;
    return { buffer, mimeType, sizeBytes: buffer.length };
  } catch {
    return null;
  }
}
