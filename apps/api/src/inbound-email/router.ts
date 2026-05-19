import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase';
import { emitEvent } from '../lib/emit-event';
import {
  validatePostmarkAuth,
  lookupUserByEmail,
  getOwnProfile,
  checkRateLimit,
} from './validator';
import { parseAttachments, parseLinks } from './parser';
import { isSafeUrl, downloadFile } from './downloader';
import { enqueueFileForOCR } from './enqueuer';
import type { PostmarkInboundPayload, InboundContext, RejectionReason } from './types';

const router = Router();
const MAX_FILES_PER_EMAIL = 10;
const MAX_LINKS_TO_TRY = 3;

async function rejectLog(logId: string, reason: RejectionReason) {
  await supabase
    .from('inbound_email_log')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', logId);
}

async function failLog(logId: string, detail: string) {
  await supabase
    .from('inbound_email_log')
    .update({ status: 'failed', error_detail: detail.slice(0, 500) })
    .eq('id', logId);
}

/**
 * POST /inbound-email
 * Webhook de Postmark Inbound. Siempre responde 200 para evitar retries.
 * La validación del secret se hace via Authorization: Bearer <POSTMARK_INBOUND_SECRET>.
 */
router.post('/', async (req: Request, res: Response) => {
  // Feature flag
  if (process.env.INBOUND_EMAIL_ENABLED !== 'true') {
    res.status(503).json({ error: 'email_inbound_disabled' });
    return;
  }

  // Validar autorización del webhook
  if (!validatePostmarkAuth(req.headers.authorization)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const t0 = Date.now();
  const payload = req.body as PostmarkInboundPayload;
  const fromEmail = (payload.From ?? '').toLowerCase().trim();
  const toAddress = (payload.To ?? payload.OriginalRecipient ?? '').toLowerCase().trim();
  const subject = payload.Subject ?? '';
  const sourceIp = (req.headers['x-forwarded-for'] as string ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

  // Crear registro de log inicial
  const { data: logRow, error: logErr } = await supabase
    .from('inbound_email_log')
    .insert({
      from_email: fromEmail,
      to_address: toAddress,
      subject,
      status: 'queued',
      source_ip: sourceIp || null,
    })
    .select('id')
    .single();

  if (logErr || !logRow) {
    // Si no podemos loguear, igual procesamos — pero registramos el fallo en consola
    console.error('[inbound-email] log insert failed:', logErr?.message);
    res.status(200).json({ received: true });
    return;
  }

  const logId = logRow.id;

  // Lookup del remitente
  const userId = await lookupUserByEmail(fromEmail);
  if (!userId) {
    await rejectLog(logId, 'unknown_sender');
    res.status(200).json({ received: true });
    return;
  }

  // Obtener profile propio del usuario
  const profileId = await getOwnProfile(userId);
  if (!profileId) {
    await rejectLog(logId, 'no_profile');
    res.status(200).json({ received: true });
    return;
  }

  // Rate limit
  const withinLimit = await checkRateLimit(userId);
  if (!withinLimit) {
    await rejectLog(logId, 'rate_limited');
    res.status(200).json({ received: true });
    return;
  }

  // Pasar a estado processing
  await supabase
    .from('inbound_email_log')
    .update({ status: 'processing', user_id: userId })
    .eq('id', logId);

  emitEvent('email_inbound_start', 'api', profileId);

  const context: InboundContext = { logId, userId, profileId, fromEmail, toAddress, subject };

  try {
    const tParse = Date.now();

    // Extraer adjuntos válidos
    const attachments = parseAttachments(payload);
    let filesToProcess = attachments.slice(0, MAX_FILES_PER_EMAIL);

    let linksFound = 0;
    let linksDownloaded = 0;
    let downloadDurationMs = 0;

    // Si no hay adjuntos, intentar descargar desde links en el body
    if (filesToProcess.length === 0) {
      const links = parseLinks(payload);
      linksFound = links.length;
      const tDownload = Date.now();
      for (const link of links.slice(0, MAX_LINKS_TO_TRY)) {
        if (!isSafeUrl(link.url)) continue;
        const downloaded = await downloadFile(link.url);
        if (downloaded) {
          filesToProcess.push({
            name: link.url.split('/').pop() ?? 'estudio',
            buffer: downloaded.buffer,
            mimeType: downloaded.mimeType,
            sizeBytes: downloaded.sizeBytes,
          });
          linksDownloaded++;
          if (filesToProcess.length >= MAX_FILES_PER_EMAIL) break;
        }
      }
      downloadDurationMs = Date.now() - tDownload;
    }

    const parseDurationMs = Date.now() - tParse;

    // Sin contenido procesable
    if (filesToProcess.length === 0) {
      await supabase
        .from('inbound_email_log')
        .update({
          status: 'rejected',
          rejection_reason: 'no_content',
          attachment_count: 0,
          links_found: linksFound,
          links_downloaded: linksDownloaded,
          parse_duration_ms: parseDurationMs,
          total_duration_ms: Date.now() - t0,
        })
        .eq('id', logId);
      res.status(200).json({ received: true, drafts: 0 });
      return;
    }

    // Subir archivos y encolar OCR
    const tUpload = Date.now();
    const draftIds: string[] = [];
    let totalBytes = 0;

    for (const file of filesToProcess) {
      try {
        const draftId = await enqueueFileForOCR(file, context);
        draftIds.push(draftId);
        totalBytes += file.sizeBytes;
      } catch (err) {
        console.error('[inbound-email] enqueue failed:', (err as Error).message);
      }
    }

    const uploadDurationMs = Date.now() - tUpload;

    if (draftIds.length === 0) {
      await failLog(logId, 'all_files_failed_to_enqueue');
      emitEvent('email_inbound_failed', 'api', profileId);
      res.status(200).json({ received: true, drafts: 0 });
      return;
    }

    // Actualizar log con resultado
    await supabase
      .from('inbound_email_log')
      .update({
        status: 'completed',
        draft_ids: draftIds,
        attachment_count: filesToProcess.length,
        attachment_bytes: totalBytes,
        links_found: linksFound,
        links_downloaded: linksDownloaded,
        parse_duration_ms: parseDurationMs,
        upload_duration_ms: uploadDurationMs,
        download_duration_ms: downloadDurationMs || null,
        total_duration_ms: Date.now() - t0,
      })
      .eq('id', logId);

    emitEvent('email_inbound_complete', 'api', profileId, { count: draftIds.length });
    res.status(200).json({ received: true, drafts: draftIds.length });
  } catch (err) {
    const detail = (err as Error).message ?? 'unknown';
    console.error('[inbound-email] unexpected error:', detail);
    await failLog(logId, detail);
    emitEvent('email_inbound_failed', 'api', profileId);
    res.status(200).json({ received: true }); // Siempre 200 al webhook
  }
});

export default router;
