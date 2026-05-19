import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { decodeJpegLs, decodeJpeg2000, decodeJpegBaseline, decodeRleLossless, ybrFullToRgb } from '../lib/dicom-codecs';

// ── Transfer Syntax sets ─────────────────────────────────────────────────────

const TS_UNCOMPRESSED  = new Set(['1.2.840.10008.1.2', '1.2.840.10008.1.2.1', '1.2.840.10008.1.2.2']);
const TS_JPEG_BASELINE = new Set(['1.2.840.10008.1.2.4.50']);
const TS_JPEG_LS       = new Set(['1.2.840.10008.1.2.4.80', '1.2.840.10008.1.2.4.81']);
const TS_JPEG_2000     = new Set(['1.2.840.10008.1.2.4.90', '1.2.840.10008.1.2.4.91']);
const TS_RLE           = new Set(['1.2.840.10008.1.2.5']);
const TS_SUPPORTED     = new Set([
  ...TS_UNCOMPRESSED, ...TS_JPEG_BASELINE, ...TS_JPEG_LS, ...TS_JPEG_2000, ...TS_RLE, '',
]);

// ── Types ────────────────────────────────────────────────────────────────────

type GrayFrame = { kind: 'gray'; data: Float32Array; rows: number; cols: number; instanceNumber: number; isMonochrome1: boolean };
type ColorFrame = { kind: 'rgb';  data: Uint8Array;  rows: number; cols: number; instanceNumber: number };
type Frame = GrayFrame | ColorFrame;

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dcmStr(ds: any, tag: string): string {
  try { return (ds.string(tag) ?? '').replace(/\0/g, '').trim(); } catch { return ''; }
}

const MODALITY_PRESETS: Record<string, { wc: number; ww: number }> = {
  CT: { wc: 40,   ww: 400  },
  MR: { wc: 500,  ww: 1000 },
  CR: { wc: 128,  ww: 256  },
  DX: { wc: 128,  ww: 256  },
  MG: { wc: 2048, ww: 4096 },
};

function computeAutoWindow(frames: Frame[], modality?: string): { wc: number; ww: number } {
  const gray = frames.filter((f): f is GrayFrame => f.kind === 'gray');
  if (!gray.length) return { wc: 128, ww: 256 };
  const start = Math.floor(gray.length * 0.25);
  const sample = gray.slice(start, start + 3);
  const pixels: number[] = [];
  for (const f of sample) {
    const step = Math.max(1, Math.floor(f.data.length / 50000));
    for (let i = 0; i < f.data.length; i += step) pixels.push(f.data[i]);
  }
  pixels.sort((a, b) => a - b);
  const p2 = pixels[Math.floor(pixels.length * 0.02)];
  const p98 = pixels[Math.floor(pixels.length * 0.98)];
  const ww  = Math.max(p98 - p2, 1);
  if (ww < 50) return MODALITY_PRESETS[modality ?? ''] ?? { wc: 128, ww: 256 };
  return { wc: (p2 + p98) / 2, ww };
}

function renderFrame(canvas: HTMLCanvasElement, frame: Frame, wcVal: number, wwVal: number) {
  canvas.width = frame.cols; canvas.height = frame.rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(frame.cols, frame.rows);
  if (frame.kind === 'rgb') {
    for (let i = 0; i < frame.rows * frame.cols; i++) {
      img.data[i * 4]     = frame.data[i * 3];
      img.data[i * 4 + 1] = frame.data[i * 3 + 1];
      img.data[i * 4 + 2] = frame.data[i * 3 + 2];
      img.data[i * 4 + 3] = 255;
    }
  } else {
    const lower = wcVal - wwVal / 2;
    const range = wwVal || 1;
    for (let i = 0; i < frame.rows * frame.cols; i++) {
      let v = ((frame.data[i] - lower) / range) * 255;
      if (frame.isMonochrome1) v = 255 - v;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      const b = v | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

async function parseDicomUrl(url: string): Promise<(Frame & { instanceNumber: number; modality: string; wc?: number; ww?: number }) | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const byteArray = new Uint8Array(await resp.arrayBuffer());

    const magic = String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]);
    if (magic !== 'DICM') return null;

    const { default: dicomParser } = await import('dicom-parser');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ds: any = dicomParser.parseDicom(byteArray);

    const ts = dcmStr(ds, 'x00020010');
    if (ts && !TS_SUPPORTED.has(ts)) return null;

    const rows = ds.uint16('x00280010') ?? 0;
    const cols = ds.uint16('x00280011') ?? 0;
    if (rows === 0 || cols === 0) return null;

    const bitsAllocated   = ds.uint16('x00280100') ?? 16;
    const pixelRep        = ds.uint16('x00280103') ?? 0;
    const samplesPerPixel = ds.uint16('x00280002') ?? 1;
    const photometric     = dcmStr(ds, 'x00280004');
    const modality        = dcmStr(ds, 'x00080060');
    const instanceNumber  = parseInt(dcmStr(ds, 'x00200013') || '0', 10) || 0;

    let wc: number | undefined, ww: number | undefined;
    try { wc = ds.floatString('x00281050'); ww = ds.floatString('x00281051'); } catch { /* */ }

    let slope = 1, intercept = 0;
    try {
      const s = ds.floatString('x00281053'); const b = ds.floatString('x00281052');
      if (s !== undefined) slope = s; if (b !== undefined) intercept = b;
    } catch { /* */ }

    const el = ds.elements['x7fe00010'];
    if (!el) return null;
    const isEncapsulated = el.length === 0xFFFFFFFF;

    let pixelBytes: Uint8Array;
    let decodedBits = bitsAllocated;
    let decodedComponents = samplesPerPixel;

    if (!isEncapsulated) {
      const bytesPerPixel = Math.ceil(bitsAllocated / 8) * samplesPerPixel;
      const frameSize     = rows * cols * bytesPerPixel;
      const aligned       = new ArrayBuffer(frameSize);
      new Uint8Array(aligned).set(byteArray.subarray(el.dataOffset, el.dataOffset + frameSize));
      pixelBytes = new Uint8Array(aligned);
    } else if (TS_JPEG_BASELINE.has(ts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragment = (dicomParser as any).readEncapsulatedPixelData(ds, el, 0) as Uint8Array;
      if (samplesPerPixel === 3) {
        const rgb = await decodeJpegBaseline(fragment, rows, cols);
        return { kind: 'rgb', data: rgb, rows, cols, instanceNumber, modality, wc, ww };
      }
      pixelBytes = fragment; decodedBits = 8;
    } else if (TS_JPEG_LS.has(ts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragment = (dicomParser as any).readEncapsulatedPixelData(ds, el, 0) as Uint8Array;
      const res = await decodeJpegLs(fragment);
      pixelBytes = res.pixels; decodedBits = res.bitsPerSample; decodedComponents = res.componentCount;
    } else if (TS_JPEG_2000.has(ts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragment = (dicomParser as any).readEncapsulatedPixelData(ds, el, 0) as Uint8Array;
      const res = await decodeJpeg2000(fragment);
      pixelBytes = res.pixels; decodedBits = res.bitsPerSample; decodedComponents = res.componentCount;
    } else if (TS_RLE.has(ts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragment = (dicomParser as any).readEncapsulatedPixelData(ds, el, 0) as Uint8Array;
      pixelBytes = decodeRleLossless(fragment, rows, cols, bitsAllocated, samplesPerPixel);
      decodedComponents = samplesPerPixel;
    } else {
      return null;
    }

    if (decodedComponents === 3) {
      const rgb = photometric === 'YBR_FULL'
        ? ybrFullToRgb(pixelBytes, rows * cols)
        : pixelBytes.subarray(0, rows * cols * 3);
      return { kind: 'rgb', data: rgb, rows, cols, instanceNumber, modality, wc, ww };
    }

    const count = rows * cols;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any;
    if (decodedBits <= 8) {
      raw = new Uint8Array(pixelBytes.buffer, pixelBytes.byteOffset, count);
    } else {
      const buf = new ArrayBuffer(count * 2);
      new Uint8Array(buf).set(pixelBytes.subarray(0, count * 2));
      raw = pixelRep === 1 ? new Int16Array(buf) : new Uint16Array(buf);
    }

    const data = new Float32Array(count);
    for (let i = 0; i < count; i++) data[i] = raw[i] * slope + intercept;

    return { kind: 'gray', data, rows, cols, instanceNumber, isMonochrome1: photometric === 'MONOCHROME1', modality, wc, ww };
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PublicDicomViewer({ urls }: { urls: string[] }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const framesRef   = useRef<Frame[]>([]);
  const windowRef   = useRef({ wc: 128, ww: 256 });

  const [status, setStatus]   = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [progress, setProgress] = useState({ done: 0, total: urls.length });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [wc, setWc] = useState(128);
  const [ww, setWw] = useState(256);
  const isGray = framesRef.current[0]?.kind === 'gray';
  const frameCount = framesRef.current.length;

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const f = framesRef.current[currentFrame];
    if (f && canvasRef.current) renderFrame(canvasRef.current, f, wc, ww);
  }, [currentFrame, wc, ww, status]);

  async function load() {
    const results = await Promise.all(
      urls.map(async (url) => {
        const r = await parseDicomUrl(url);
        setProgress(p => ({ ...p, done: p.done + 1 }));
        return r;
      }),
    );

    const frames = results.filter((f): f is NonNullable<typeof f> => f !== null)
      .map(({ modality: _m, wc: _wc, ww: _ww, ...f }) => f as Frame);

    if (!frames.length) { setStatus('unsupported'); return; }

    frames.sort((a, b) => a.instanceNumber - b.instanceNumber);
    framesRef.current = frames;

    let defWC: number, defWW: number;
    const ref = results.find(r => r !== null);
    if (ref?.wc !== undefined && ref?.ww !== undefined) {
      defWC = ref.wc; defWW = ref.ww;
    } else if (frames[0].kind === 'gray') {
      const auto = computeAutoWindow(frames, ref?.modality);
      defWC = auto.wc; defWW = auto.ww;
    } else {
      defWC = 128; defWW = 256;
    }

    windowRef.current = { wc: defWC, ww: defWW };
    setWc(defWC); setWw(defWW);
    setStatus('ready');
  }

  function prev() { setCurrentFrame(n => Math.max(0, n - 1)); }
  function next() { setCurrentFrame(n => Math.min(framesRef.current.length - 1, n + 1)); }

  const { wc: dWC, ww: dWW } = windowRef.current;

  return (
    <div style={{ background: '#0F172A', borderRadius: 12, overflow: 'hidden' }}>

      {/* Canvas area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, padding: 12, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '60dvh', objectFit: 'contain', imageRendering: 'pixelated', display: status === 'ready' ? 'block' : 'none' }}
        />

        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
              {progress.total > 1 ? `Cargando ${progress.done}/${progress.total} imágenes…` : 'Cargando imagen DICOM…'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 600 }}>No se pudo cargar la imagen</p>
          </div>
        )}

        {status === 'unsupported' && (
          <div style={{ textAlign: 'center', maxWidth: 300, padding: 16 }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔬</p>
            <p style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>Formato no compatible con el navegador</p>
            <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Para ver este estudio instalá RadiAnt (Windows), Horos u OsiriX (Mac).
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'ready' && (
        <div style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Frame navigation */}
          {frameCount > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={prev} disabled={currentFrame === 0} style={navBtn}><ChevronLeft size={14} /></button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#94A3B8', fontSize: 11, flexShrink: 0 }}>{currentFrame + 1}/{frameCount}</span>
                <input
                  type="range" min={0} max={frameCount - 1} value={currentFrame}
                  onChange={e => setCurrentFrame(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#60A5FA' }}
                />
              </div>
              <button onClick={next} disabled={currentFrame === frameCount - 1} style={navBtn}><ChevronRight size={14} /></button>
            </div>
          )}

          {/* Windowing */}
          {isGray && (
            <>
              <SliderRow label="Brillo"    value={wc} min={Math.round(dWC - dWW * 2)} max={Math.round(dWC + dWW * 2)} onChange={setWc} />
              <SliderRow label="Contraste" value={ww} min={1} max={Math.round(dWW * 4)} onChange={setWw} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#94A3B8', fontSize: 11, width: 56, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#60A5FA' }} />
      <span style={{ color: '#e2e8f0', fontSize: 11, width: 40, textAlign: 'right', flexShrink: 0 }}>{Math.round(value)}</span>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
  color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 6, flexShrink: 0,
};
