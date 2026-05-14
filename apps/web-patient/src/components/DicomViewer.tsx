import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decodeJpegLs, decodeJpeg2000, decodeJpegBaseline, ybrFullToRgb } from '../lib/dicom-codecs';

// ── Transfer Syntax classification ───────────────────────────────────────────

const TS_UNCOMPRESSED  = new Set(['1.2.840.10008.1.2', '1.2.840.10008.1.2.1', '1.2.840.10008.1.2.2']);
const TS_JPEG_BASELINE = new Set(['1.2.840.10008.1.2.4.50']);
const TS_JPEG_LS       = new Set(['1.2.840.10008.1.2.4.80', '1.2.840.10008.1.2.4.81']);
const TS_JPEG_2000     = new Set(['1.2.840.10008.1.2.4.90', '1.2.840.10008.1.2.4.91']);
const TS_SUPPORTED     = new Set([
  ...TS_UNCOMPRESSED, ...TS_JPEG_BASELINE, ...TS_JPEG_LS, ...TS_JPEG_2000,
  '',  // No File Meta = assume uncompressed
]);

// ── Frame types ───────────────────────────────────────────────────────────────

type GrayFrame = {
  kind: 'gray';
  data: Float32Array;    // Pixel values in display units (HU for CT) after slope/intercept
  rows: number; cols: number;
  instanceNumber: number;
  isMonochrome1: boolean; // Invert grayscale (CR/DX/MG convention)
};
type ColorFrame = {
  kind: 'rgb';
  data: Uint8Array;      // Interleaved RGB, rows*cols*3 bytes
  rows: number; cols: number;
  instanceNumber: number;
};
type Frame = GrayFrame | ColorFrame;

type FrameMeta = {
  modality: string; bodyPart: string; studyDate: string;
  wc?: number; ww?: number;
};

const MAX_FRAMES = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dcmStr(ds: any, tag: string): string {
  try { return (ds.string(tag) ?? '').replace(/\0/g, '').trim(); } catch { return ''; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DicomViewer({
  storagePaths,
  onClose,
}: {
  storagePaths: string[];
  onClose: () => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const framesRef    = useRef<Frame[]>([]);
  const windowRef    = useRef<{ wc: number; ww: number }>({ wc: 0, ww: 1 });
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus]   = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [progress, setProgress] = useState({ done: 0, total: Math.min(storagePaths.length, MAX_FRAMES) });
  const [errorMsg, setErrorMsg] = useState('');
  const [meta, setMeta] = useState<FrameMeta>({ modality: '', bodyPart: '', studyDate: '' });

  // Windowing (gray frames only)
  const [wc, setWc]   = useState(0);
  const [ww, setWw]   = useState(1);
  const [zoom, setZoom] = useState(1);

  // Cine
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [fps, setFps]           = useState(10);

  const frameCount  = framesRef.current.length;
  const isSeries    = frameCount > 1;
  const isGraySeries = framesRef.current[0]?.kind === 'gray';

  useEffect(() => {
    load();
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, []);

  // Re-render when frame or windowing changes
  useEffect(() => {
    if (status !== 'ready') return;
    const f = framesRef.current[currentFrame];
    if (f) renderFrame(f, wc, ww);
  }, [currentFrame, wc, ww, status]);

  // Play/pause control
  useEffect(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (!playing || frameCount <= 1) return;
    playTimerRef.current = setInterval(() => {
      setCurrentFrame(n => (n + 1) % framesRef.current.length);
    }, 1000 / fps);
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [playing, fps, frameCount]);

  // ── Load all frames ─────────────────────────────────────────────────────────

  async function load() {
    try {
      const paths = storagePaths.slice(0, MAX_FRAMES);
      const { data: urlsData } = await supabase.storage.from('studies').createSignedUrls(paths, 3600);
      if (!urlsData?.length) throw new Error('No se pudieron obtener las URLs del estudio.');

      const valid = urlsData.filter(u => u.signedUrl && u.path);
      setProgress({ done: 0, total: valid.length });

      let metaSet = false;
      const results = await Promise.all(
        valid.map(async (u) => {
          const result = await parseDicomFile(u.signedUrl!);
          setProgress(p => ({ ...p, done: p.done + 1 }));
          if (result && !metaSet) {
            metaSet = true;
            setMeta({ modality: result.modality, bodyPart: result.bodyPart, studyDate: result.studyDate, wc: result.wc, ww: result.ww });
          }
          return result;
        }),
      );

      const frames = results
        .filter((f): f is NonNullable<typeof f> => f !== null)
        .map(({ modality: _m, bodyPart: _b, studyDate: _s, wc: _wc, ww: _ww, ...frame }) => frame as Frame);

      if (!frames.length) { setStatus('unsupported'); return; }

      frames.sort((a, b) => a.instanceNumber - b.instanceNumber);
      framesRef.current = frames;

      // Windowing: prefer DICOM tags, fallback to auto-window from pixel range
      let defWC: number, defWW: number;
      const refMeta = results.find(r => r !== null);
      if (refMeta?.wc !== undefined && refMeta?.ww !== undefined) {
        defWC = refMeta.wc;
        defWW = refMeta.ww;
      } else if (frames[0].kind === 'gray') {
        let pMin = Infinity, pMax = -Infinity;
        const d = frames[0].data;
        for (let i = 0; i < d.length; i++) { if (d[i] < pMin) pMin = d[i]; if (d[i] > pMax) pMax = d[i]; }
        defWC = (pMin + pMax) / 2;
        defWW = Math.max(pMax - pMin, 1);
      } else {
        defWC = 128; defWW = 256;
      }

      windowRef.current = { wc: defWC, ww: defWW };
      setWc(defWC); setWw(defWW);
      setStatus('ready');
      if (frames.length > 1) setPlaying(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar.');
      setStatus('error');
    }
  }

  // ── Parse a single DICOM file ───────────────────────────────────────────────

  async function parseDicomFile(signedUrl: string): Promise<(Frame & FrameMeta & { instanceNumber: number }) | null> {
    try {
      const resp = await fetch(signedUrl);
      if (!resp.ok) return null;
      const byteArray = new Uint8Array(await resp.arrayBuffer());

      // Validate DICM preamble
      const magic = String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]);
      if (magic !== 'DICM') return null;

      const { default: dicomParser } = await import('dicom-parser');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ds: any = dicomParser.parseDicom(byteArray);

      const ts = dcmStr(ds, 'x00020010');
      if (ts && !TS_SUPPORTED.has(ts)) return null; // Unsupported TS (MPEG, HT-J2K, etc.)

      const rows           = ds.uint16('x00280010') ?? 0;
      const cols           = ds.uint16('x00280011') ?? 0;
      const bitsAllocated  = ds.uint16('x00280100') ?? 16;
      const pixelRep       = ds.uint16('x00280103') ?? 0;
      const samplesPerPixel = ds.uint16('x00280002') ?? 1;
      const photometric    = dcmStr(ds, 'x00280004'); // e.g. MONOCHROME2, RGB, YBR_FULL
      if (rows === 0 || cols === 0) return null;

      // Metadata
      const modality  = dcmStr(ds, 'x00080060');
      const bodyPart  = dcmStr(ds, 'x00180015');
      const rawDate   = dcmStr(ds, 'x00080020');
      const studyDate = rawDate.length === 8 ? `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}` : '';
      let wc: number | undefined, ww: number | undefined;
      try { wc = ds.floatString('x00281050'); ww = ds.floatString('x00281051'); } catch { /* */ }
      const instanceNumber = parseInt(dcmStr(ds, 'x00200013') || '0', 10) || 0;

      // Slope / intercept (modality LUT)
      let slope = 1, intercept = 0;
      try {
        const s = ds.floatString('x00281053'); const b = ds.floatString('x00281052');
        if (s !== undefined) slope = s; if (b !== undefined) intercept = b;
      } catch { /* */ }

      const el = ds.elements['x7fe00010'];
      if (!el) return null;
      const isEncapsulated = el.length === 0xFFFFFFFF;

      // ── Decode pixels ────────────────────────────────────────────────────────

      let pixelBytes: Uint8Array;
      let decodedBits = bitsAllocated;
      let decodedComponents = samplesPerPixel;

      if (!isEncapsulated) {
        // Uncompressed raw
        const bytesPerPixel = Math.ceil(bitsAllocated / 8) * samplesPerPixel;
        const frameSize     = rows * cols * bytesPerPixel;
        const aligned       = new ArrayBuffer(frameSize);
        new Uint8Array(aligned).set(byteArray.subarray(el.dataOffset, el.dataOffset + frameSize));
        pixelBytes = new Uint8Array(aligned);
      } else if (TS_JPEG_BASELINE.has(ts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fragment = (dicomParser as any).readEncapsulatedPixelData(ds, el, 0) as Uint8Array;
        if (samplesPerPixel === 3) {
          // Color JPEG — browser native decode → return immediately
          const rgb = await decodeJpegBaseline(fragment, rows, cols);
          return { kind: 'rgb', data: rgb, rows, cols, instanceNumber, modality, bodyPart, studyDate, wc, ww };
        }
        // Grayscale JPEG (rare) — treat as 8-bit raw
        pixelBytes = fragment;
        decodedBits = 8;
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
      } else {
        return null;
      }

      // ── Build Frame ──────────────────────────────────────────────────────────

      const isColor = decodedComponents === 3;

      if (isColor) {
        let rgb: Uint8Array;
        if (photometric === 'YBR_FULL') {
          rgb = ybrFullToRgb(pixelBytes, rows * cols);
        } else {
          rgb = pixelBytes.length >= rows * cols * 3
            ? pixelBytes.subarray(0, rows * cols * 3)
            : pixelBytes;
        }
        return { kind: 'rgb', data: rgb, rows, cols, instanceNumber, modality, bodyPart, studyDate, wc, ww };
      }

      // Grayscale
      const count = rows * cols;
      let raw: Int16Array | Uint16Array | Uint8Array;
      if (decodedBits <= 8) {
        raw = new Uint8Array(pixelBytes.buffer, pixelBytes.byteOffset, count);
      } else {
        const buf = new ArrayBuffer(count * 2);
        new Uint8Array(buf).set(pixelBytes.subarray(0, count * 2));
        raw = pixelRep === 1 ? new Int16Array(buf) : new Uint16Array(buf);
      }

      const data = new Float32Array(count);
      for (let i = 0; i < count; i++) data[i] = raw[i] * slope + intercept;

      const isMonochrome1 = photometric === 'MONOCHROME1';
      return { kind: 'gray', data, rows, cols, instanceNumber, isMonochrome1, modality, bodyPart, studyDate, wc, ww };
    } catch {
      return null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderFrame(frame: Frame, wcVal: number, wwVal: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

  function resetView() {
    setWc(windowRef.current.wc); setWw(windowRef.current.ww); setZoom(1);
  }
  function prevFrame() { setCurrentFrame(n => Math.max(0, n - 1)); setPlaying(false); }
  function nextFrame() { setCurrentFrame(n => Math.min(framesRef.current.length - 1, n + 1)); setPlaying(false); }

  const { wc: dWC, ww: dWW } = windowRef.current;

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {meta.modality  && <span style={{ color: '#60A5FA', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>{meta.modality}</span>}
          {meta.bodyPart  && <span style={{ color: '#94A3B8', fontSize: 13 }}>{meta.bodyPart}</span>}
          {meta.studyDate && <span style={{ color: '#64748B', fontSize: 12 }}>{meta.studyDate}</span>}
          {isSeries && status === 'ready' && (
            <span style={{ color: '#64748B', fontSize: 12 }}>{currentFrame + 1}/{frameCount} frames</span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
            transform: `scale(${zoom})`, transformOrigin: 'center',
            imageRendering: 'pixelated',
            display: status === 'ready' ? 'block' : 'none',
          }}
        />

        {status === 'loading' && (
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 8px' }}>
              {progress.total > 1 ? `Cargando serie… ${progress.done}/${progress.total}` : 'Cargando imagen DICOM…'}
            </p>
            {progress.total > 1 && (
              <div style={{ width: 180, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '0 auto' }}>
                <div style={{ height: '100%', background: '#60A5FA', borderRadius: 2, width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 300 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>⚠️</span>
            <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No se pudo cargar</p>
            <p style={{ color: '#64748B', fontSize: 13 }}>{errorMsg}</p>
          </div>
        )}

        {status === 'unsupported' && (
          <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 320 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔬</span>
            <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Formato no soportado</p>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
              Esta serie usa un Transfer Syntax que requiere un visor especializado (RadiAnt, Horos u OsiriX).
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'ready' && (
        <div style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Cine controls — multi-frame only */}
          {isSeries && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={prevFrame} style={ctrlBtn}><SkipBack size={14} /></button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  style={{ ...ctrlBtn, background: '#2563EB', padding: '7px 16px', gap: 6, display: 'flex', alignItems: 'center' }}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{playing ? 'Pausar' : 'Play'}</span>
                </button>
                <button onClick={nextFrame} style={ctrlBtn}><SkipForward size={14} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                  <span style={{ color: '#64748B', fontSize: 11 }}>FPS</span>
                  {[5, 10, 15, 24].map(f => (
                    <button key={f} onClick={() => setFps(f)} style={{
                      background: fps === f ? '#1D4ED8' : 'rgba(255,255,255,0.06)',
                      border: 'none', borderRadius: 6,
                      color: fps === f ? '#fff' : '#94A3B8',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
                    }}>{f}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748B', fontSize: 11, width: 32, flexShrink: 0 }}>{String(currentFrame + 1).padStart(2, '0')}</span>
                <input type="range" min={0} max={frameCount - 1} value={currentFrame}
                  onChange={e => { setPlaying(false); setCurrentFrame(Number(e.target.value)); }}
                  style={{ flex: 1, accentColor: '#60A5FA', height: 4 }} />
                <span style={{ color: '#64748B', fontSize: 11, width: 32, textAlign: 'right', flexShrink: 0 }}>{String(frameCount).padStart(2, '0')}</span>
              </div>
            </>
          )}

          {/* Zoom + Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 4))} style={ctrlBtn}><ZoomIn size={14} /></button>
            <button onClick={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))} style={ctrlBtn}><ZoomOut size={14} /></button>
            <button onClick={resetView} style={ctrlBtn}><RefreshCw size={14} /></button>
            <span style={{ color: '#64748B', fontSize: 11, marginLeft: 2 }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Windowing — grayscale series only */}
          {isGraySeries && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SliderRow label="Brillo"    value={wc} min={Math.round(dWC - dWW * 2)} max={Math.round(dWC + dWW * 2)} onChange={setWc} />
              <SliderRow label="Contraste" value={ww} min={1} max={Math.round(dWW * 4)} onChange={setWw} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#94A3B8', fontSize: 11, width: 60, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#60A5FA' }} />
      <span style={{ color: '#e2e8f0', fontSize: 11, width: 44, textAlign: 'right', flexShrink: 0 }}>{Math.round(value)}</span>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
  color: '#e2e8f0', cursor: 'pointer', padding: '7px 9px', display: 'flex', alignItems: 'center',
};
