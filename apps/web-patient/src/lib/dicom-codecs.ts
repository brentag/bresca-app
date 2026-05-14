/**
 * Lazy-loaded DICOM pixel decoders.
 *
 * CharLS (JPEG-LS) and OpenJPEG (JPEG 2000) are Emscripten-compiled WASM modules
 * served from /wasm/. They are loaded via script injection on first use so Vite
 * never tries to bundle their internal binary data.
 *
 * JPEG Baseline (8-bit lossy) uses the browser's native Image / OffscreenCanvas.
 */

// ── Script injection helper ───────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load WASM script: ${src}`));
    document.head.appendChild(s);
  });
}

async function initEmscriptenModule(globalName: string, scriptSrc: string): Promise<any> {
  await loadScript(scriptSrc);
  const factory = (window as any)[globalName];
  if (typeof factory !== 'function') {
    throw new Error(`${globalName} not found after loading ${scriptSrc}`);
  }
  // locateFile tells Emscripten where to fetch the .wasm from
  const mod = factory({ locateFile: (f: string) => `/wasm/${f}` });
  // Emscripten exposes either `.ready` (Promise) or resolves synchronously
  return (typeof mod?.then === 'function') ? await mod : (mod.ready ? await mod.ready.then(() => mod) : mod);
}

// ── Decoded pixel result ──────────────────────────────────────────────────────

export type DecodedPixels = {
  pixels: Uint8Array;
  bitsPerSample: number;
  componentCount: number;
};

// ── CharLS — JPEG-LS Lossless / Near-Lossless ────────────────────────────────

let _charls: any = null;

export async function decodeJpegLs(compressed: Uint8Array): Promise<DecodedPixels> {
  if (!_charls) _charls = await initEmscriptenModule('CharLSWASM', '/wasm/charlswasm_decode.js');

  const dec = new _charls.JpegLSDecoder();
  try {
    const buf = dec.getEncodedBuffer(compressed.length);
    buf.set(compressed);
    dec.decode();
    const info    = dec.getFrameInfo();
    const decoded = dec.getDecodedBuffer();
    // Copy pixels OUT of WASM memory before delete()
    const pixels  = new Uint8Array(
      typeof decoded.buffer !== 'undefined'
        ? decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength)
        : decoded,
    );
    return { pixels, bitsPerSample: info.bitsPerSample, componentCount: info.componentCount };
  } finally {
    dec.delete();
  }
}

// ── OpenJPEG — JPEG 2000 Lossless / Lossy ────────────────────────────────────

let _openjpeg: any = null;

export async function decodeJpeg2000(compressed: Uint8Array): Promise<DecodedPixels> {
  if (!_openjpeg) _openjpeg = await initEmscriptenModule('OpenJPEGWASM', '/wasm/openjpegwasm_decode.js');

  const dec = new _openjpeg.J2KDecoder();
  try {
    const buf = dec.getEncodedBuffer(compressed.length);
    buf.set(compressed);
    dec.readHeader();
    dec.decode();
    const info    = dec.getFrameInfo();
    const decoded = dec.getDecodedBuffer();
    const pixels  = decoded instanceof ArrayBuffer
      ? new Uint8Array(decoded)
      : new Uint8Array(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength));
    return { pixels, bitsPerSample: info.bitsPerSample, componentCount: info.componentCount };
  } finally {
    if (dec.delete) dec.delete();
  }
}

// ── JPEG Baseline — browser native decode via OffscreenCanvas ─────────────────

export async function decodeJpegBaseline(
  compressed: Uint8Array,
  rows: number,
  cols: number,
): Promise<Uint8Array> {
  // Copy into fresh ArrayBuffer — avoids SharedArrayBuffer type incompatibility with Blob ctor
  const copy   = new Uint8Array(compressed.length);
  copy.set(compressed);
  const blob   = new Blob([copy.buffer as ArrayBuffer], { type: 'image/jpeg' });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(cols, rows);
  const ctx    = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imgData = ctx.getImageData(0, 0, cols, rows);
  // RGBA → interleaved RGB
  const rgb = new Uint8Array(rows * cols * 3);
  for (let i = 0; i < rows * cols; i++) {
    rgb[i * 3]     = imgData.data[i * 4];
    rgb[i * 3 + 1] = imgData.data[i * 4 + 1];
    rgb[i * 3 + 2] = imgData.data[i * 4 + 2];
  }
  return rgb;
}

// ── YBR_FULL → RGB conversion (DICOM PS3.3 C.7.6.3.1.2) ─────────────────────

export function ybrFullToRgb(ybr: Uint8Array, pixelCount: number): Uint8Array {
  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const Y  = ybr[i * 3];
    const Cb = ybr[i * 3 + 1];
    const Cr = ybr[i * 3 + 2];
    rgb[i * 3]     = Math.max(0, Math.min(255, Math.round(Y + 1.402   * (Cr - 128))));
    rgb[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(Y - 0.34414 * (Cb - 128) - 0.71414 * (Cr - 128))));
    rgb[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(Y + 1.772   * (Cb - 128))));
  }
  return rgb;
}

// ── RLE Lossless — DICOM PS3.5 G.3 (pure JS, no WASM) ───────────────────────
// PackBits decoder: n>=0 → copy n+1 literal bytes; n<-128 noop; else repeat next byte (-n+1) times

function rleDecodeSegment(data: Uint8Array, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount);
  let inp = 0, outp = 0;
  while (outp < pixelCount && inp < data.length) {
    const raw = data[inp++];
    const n = raw > 127 ? raw - 256 : raw;
    if (n >= 0) {
      for (let i = 0; i <= n && outp < pixelCount; i++) out[outp++] = data[inp++];
    } else if (n !== -128) {
      const byte = data[inp++];
      const count = 1 - n;
      for (let i = 0; i < count && outp < pixelCount; i++) out[outp++] = byte;
    }
  }
  return out;
}

export function decodeRleLossless(
  rleData: Uint8Array,
  rows: number,
  cols: number,
  bitsAllocated: number,
  samplesPerPixel: number,
): Uint8Array {
  const pixelCount     = rows * cols;
  const bytesPerSample = bitsAllocated >> 3;
  const view = new DataView(rleData.buffer, rleData.byteOffset, rleData.byteLength);
  const numSegments = view.getUint32(0, true);

  const segments: Uint8Array[] = [];
  for (let s = 0; s < numSegments; s++) {
    const start = view.getUint32(4 + s * 4, true);
    const end   = s + 1 < numSegments ? view.getUint32(4 + (s + 1) * 4, true) : rleData.length;
    segments.push(rleDecodeSegment(rleData.subarray(start, end), pixelCount));
  }

  const output = new Uint8Array(pixelCount * bytesPerSample * samplesPerPixel);

  if (samplesPerPixel === 1 && bytesPerSample === 1) {
    output.set(segments[0]);
  } else if (samplesPerPixel === 1 && bytesPerSample === 2) {
    // DICOM RLE stores high byte first; reassemble as little-endian for Int16/Uint16Array
    const hi = segments[0], lo = segments[1];
    for (let i = 0; i < pixelCount; i++) {
      output[i * 2]     = lo[i];
      output[i * 2 + 1] = hi[i];
    }
  } else if (samplesPerPixel === 3) {
    const [r, g, b] = segments;
    for (let i = 0; i < pixelCount; i++) {
      output[i * 3]     = r[i];
      output[i * 3 + 1] = g[i];
      output[i * 3 + 2] = b[i];
    }
  }

  return output;
}
