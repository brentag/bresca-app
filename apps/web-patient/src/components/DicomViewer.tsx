import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';

const UNCOMPRESSED_TS = new Set([
  '1.2.840.10008.1.2',    // Implicit VR LE
  '1.2.840.10008.1.2.1',  // Explicit VR LE
  '1.2.840.10008.1.2.2',  // Explicit VR BE
]);

const MAX_FRAMES = 200;

function dcmStr(dataSet: any, tag: string): string {
  try { return (dataSet.string(tag) ?? '').replace(/\0/g, '').trim(); } catch { return ''; }
}

type Frame = {
  data: Float32Array;
  rows: number;
  cols: number;
  instanceNumber: number;
};

export function DicomViewer({
  storagePaths,
  onClose,
}: {
  storagePaths: string[];
  onClose: () => void;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const framesRef   = useRef<Frame[]>([]);
  const defaultWindowRef = useRef<{ wc: number; ww: number }>({ wc: 0, ww: 1 });
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [progress, setProgress] = useState({ done: 0, total: Math.min(storagePaths.length, MAX_FRAMES) });
  const [errorMsg, setErrorMsg]   = useState('');
  const [modality, setModality]   = useState('');
  const [bodyPart, setBodyPart]   = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [wc, setWc] = useState(0);
  const [ww, setWw] = useState(1);
  const [zoom, setZoom]           = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying]     = useState(false);
  const [fps, setFps]             = useState(10);

  const frameCount = framesRef.current.length;
  const isSeries   = frameCount > 1;

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    load();
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, []);

  // ── Re-render canvas on frame / windowing change ────────────────────
  useEffect(() => {
    if (status !== 'ready') return;
    const f = framesRef.current[currentFrame];
    if (!f) return;
    renderCanvas(f.data, f.rows, f.cols, wc, ww);
  }, [currentFrame, wc, ww, status]);

  // ── Start/stop playback ─────────────────────────────────────────────
  useEffect(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (!playing || frameCount <= 1) return;
    playTimerRef.current = setInterval(() => {
      setCurrentFrame(f => (f + 1) % framesRef.current.length);
    }, 1000 / fps);
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [playing, fps, frameCount]);

  // ── Parse a single DICOM file ───────────────────────────────────────
  async function parseDicomFile(signedUrl: string): Promise<(Frame & { modality?: string; bodyPart?: string; studyDate?: string; wc?: number; ww?: number }) | null> {
    try {
      const resp = await fetch(signedUrl);
      if (!resp.ok) return null;
      const byteArray = new Uint8Array(await resp.arrayBuffer());

      const magic = String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]);
      if (magic !== 'DICM') return null;

      const { default: dicomParser } = await import('dicom-parser');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ds: any = dicomParser.parseDicom(byteArray);

      const ts = dcmStr(ds, 'x00020010');
      if (ts && !UNCOMPRESSED_TS.has(ts)) return null;

      const rows            = ds.uint16('x00280010') ?? 0;
      const cols            = ds.uint16('x00280011') ?? 0;
      const bitsAllocated   = ds.uint16('x00280100') ?? 16;
      const pixelRep        = ds.uint16('x00280103') ?? 0;
      const samplesPerPixel = ds.uint16('x00280002') ?? 1;
      if (rows === 0 || cols === 0 || samplesPerPixel !== 1) return null;

      const el = ds.elements['x7fe00010'];
      if (!el || el.length === 0xFFFFFFFF) return null;

      let slope = 1, intercept = 0;
      try {
        const s = ds.floatString('x00281053');
        const b = ds.floatString('x00281052');
        if (s !== undefined) slope = s;
        if (b !== undefined) intercept = b;
      } catch { /* defaults */ }

      const bytesPerPixel   = bitsAllocated === 16 ? 2 : 1;
      const pixelByteLength = rows * cols * bytesPerPixel;
      const aligned         = new ArrayBuffer(pixelByteLength);
      new Uint8Array(aligned).set(byteArray.subarray(el.dataOffset, el.dataOffset + pixelByteLength));

      let raw: Int16Array | Uint16Array | Uint8Array;
      if (bitsAllocated === 16) {
        raw = pixelRep === 1 ? new Int16Array(aligned) : new Uint16Array(aligned);
      } else {
        raw = new Uint8Array(aligned);
      }

      const data = new Float32Array(rows * cols);
      for (let i = 0; i < data.length; i++) data[i] = raw[i] * slope + intercept;

      const instanceNumber = parseInt(dcmStr(ds, 'x00200013') || '0', 10) || 0;

      // Metadata (used from reference/first frame)
      const rawDate = dcmStr(ds, 'x00080020');
      let tagWC: number | undefined, tagWW: number | undefined;
      try { tagWC = ds.floatString('x00281050'); tagWW = ds.floatString('x00281051'); } catch { /* */ }

      return {
        data, rows, cols, instanceNumber,
        modality: dcmStr(ds, 'x00080060'),
        bodyPart: dcmStr(ds, 'x00180015'),
        studyDate: rawDate.length === 8 ? `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}` : '',
        wc: tagWC,
        ww: tagWW,
      };
    } catch {
      return null;
    }
  }

  // ── Load all frames ─────────────────────────────────────────────────
  async function load() {
    try {
      const paths = storagePaths.slice(0, MAX_FRAMES);
      const { data: urlsData } = await supabase.storage.from('studies').createSignedUrls(paths, 3600);
      if (!urlsData?.length) throw new Error('No se pudieron obtener las URLs del estudio.');

      const valid = urlsData.filter(u => u.signedUrl && u.path);
      setProgress({ done: 0, total: valid.length });

      // Load in parallel — each resolved frame updates progress
      const results = await Promise.all(
        valid.map(async (u) => {
          const frame = await parseDicomFile(u.signedUrl!);
          setProgress(p => ({ ...p, done: p.done + 1 }));
          return frame;
        }),
      );

      const frames = results.filter((f): f is NonNullable<typeof f> => f !== null);

      if (!frames.length) { setStatus('unsupported'); return; }

      // Sort by instance number ascending (correct slice/phase order)
      frames.sort((a, b) => a.instanceNumber - b.instanceNumber);

      framesRef.current = frames;

      // Windowing: prefer DICOM tags from first frame, fallback to pixel range
      const ref = frames[0];
      let defaultWC: number, defaultWW: number;
      if (ref.wc !== undefined && ref.ww !== undefined) {
        defaultWC = ref.wc;
        defaultWW = ref.ww;
      } else {
        let pMin = Infinity, pMax = -Infinity;
        for (let i = 0; i < ref.data.length; i++) {
          if (ref.data[i] < pMin) pMin = ref.data[i];
          if (ref.data[i] > pMax) pMax = ref.data[i];
        }
        defaultWC = (pMin + pMax) / 2;
        defaultWW = Math.max(pMax - pMin, 1);
      }

      defaultWindowRef.current = { wc: defaultWC, ww: defaultWW };
      setWc(defaultWC);
      setWw(defaultWW);
      setModality(ref.modality ?? '');
      setBodyPart(ref.bodyPart ?? '');
      setStudyDate(ref.studyDate ?? '');
      setStatus('ready');

      // Auto-play series
      if (frames.length > 1) setPlaying(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar.');
      setStatus('error');
    }
  }

  // ── Canvas render ───────────────────────────────────────────────────
  function renderCanvas(data: Float32Array, rows: number, cols: number, wcVal: number, wwVal: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(cols, rows);
    const lower   = wcVal - wwVal / 2;
    const range   = wwVal || 1;
    for (let i = 0; i < rows * cols; i++) {
      let v = ((data[i] - lower) / range) * 255;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      const b = v | 0;
      imgData.data[i * 4]     = b;
      imgData.data[i * 4 + 1] = b;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function resetView() {
    const { wc: dWC, ww: dWW } = defaultWindowRef.current;
    setWc(dWC); setWw(dWW); setZoom(1);
  }

  function prevFrame() { setCurrentFrame(f => Math.max(0, f - 1)); setPlaying(false); }
  function nextFrame() { setCurrentFrame(f => Math.min(framesRef.current.length - 1, f + 1)); setPlaying(false); }

  const { wc: dWC, ww: dWW } = defaultWindowRef.current;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {modality   && <span style={{ color: '#60A5FA', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>{modality}</span>}
          {bodyPart   && <span style={{ color: '#94A3B8', fontSize: 13 }}>{bodyPart}</span>}
          {studyDate  && <span style={{ color: '#64748B', fontSize: 12 }}>{studyDate}</span>}
          {isSeries && status === 'ready' && (
            <span style={{ color: '#64748B', fontSize: 12, marginLeft: 4 }}>
              {currentFrame + 1}/{frameCount} frames
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16, position: 'relative' }}>

        {/* Always-mounted canvas — ref stays stable through state changes */}
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
            <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 6px' }}>
              {progress.total > 1
                ? `Cargando serie… ${progress.done}/${progress.total}`
                : 'Cargando imagen DICOM…'}
            </p>
            {progress.total > 1 && (
              <div style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '0 auto' }}>
                <div style={{ height: '100%', background: '#60A5FA', borderRadius: 2, width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 280 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>⚠️</span>
            <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No se pudo cargar</p>
            <p style={{ color: '#64748B', fontSize: 13 }}>{errorMsg}</p>
          </div>
        )}

        {status === 'unsupported' && (
          <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 300 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔬</span>
            <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Formato comprimido</p>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
              Esta serie usa compresión avanzada (JPEG-LS, JPEG 2000). Usá RadiAnt, Horos u OsiriX para verla.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'ready' && (
        <div style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── Cine controls (solo si hay múltiples frames) ── */}
          {isSeries && (
            <>
              {/* Play bar */}
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

                {/* FPS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                  <span style={{ color: '#64748B', fontSize: 11 }}>FPS</span>
                  {[5, 10, 15, 24].map(f => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      style={{
                        background: fps === f ? '#1D4ED8' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 6, color: fps === f ? '#fff' : '#94A3B8',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
                      }}
                    >{f}</button>
                  ))}
                </div>
              </div>

              {/* Frame scrubber */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748B', fontSize: 11, width: 32, flexShrink: 0 }}>
                  {String(currentFrame + 1).padStart(2, '0')}
                </span>
                <input
                  type="range"
                  min={0}
                  max={frameCount - 1}
                  value={currentFrame}
                  onChange={e => { setPlaying(false); setCurrentFrame(Number(e.target.value)); }}
                  style={{ flex: 1, accentColor: '#60A5FA', height: 4 }}
                />
                <span style={{ color: '#64748B', fontSize: 11, width: 32, textAlign: 'right', flexShrink: 0 }}>
                  {String(frameCount).padStart(2, '0')}
                </span>
              </div>
            </>
          )}

          {/* ── Zoom + Reset ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 4))} style={ctrlBtn}><ZoomIn size={14} /></button>
            <button onClick={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))} style={ctrlBtn}><ZoomOut size={14} /></button>
            <button onClick={resetView} style={ctrlBtn}><RefreshCw size={14} /></button>
            <span style={{ color: '#64748B', fontSize: 11, marginLeft: 2 }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* ── Windowing ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SliderRow
              label="Brillo"
              value={wc}
              min={Math.round(dWC - dWW * 2)}
              max={Math.round(dWC + dWW * 2)}
              onChange={setWc}
            />
            <SliderRow
              label="Contraste"
              value={ww}
              min={1}
              max={Math.round(dWW * 4)}
              onChange={setWw}
            />
          </div>
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
