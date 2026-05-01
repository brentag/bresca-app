import { createWorker } from 'tesseract.js';
// pdf-parse v2 ships as CJS with a non-standard export — use require to avoid TS default-import mismatch
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  // Images: jpeg, png, webp
  const worker = await createWorker('spa', 1, {
    logger: () => {}, // silence progress logs
  });
  const { data: { text } } = await worker.recognize(buffer);
  await worker.terminate();
  return text.trim();
}
