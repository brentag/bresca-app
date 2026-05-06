import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PixelArray = Int16Array | Uint16Array | Uint8Array;
type PixelStore = { data: PixelArray; rows: number; cols: number };

export function DicomViewer({
  storagePaths,
  onClose,
}: {
  storagePaths: string[];
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<PixelStore | null>(null);
  const defaultWindowRef = useRef<{ wc: number; ww: number }>({ wc: 40, ww: 400 });

  const [status, setStatus]   = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [modality, setModality]   = useState('');
  const [bodyPart, setBodyPart]   = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [wc, setWc] = useState(40);
  const [ww, setWw] = useState(400);
  const [zoom, setZoom] = useState(1);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (status !== 'ready' || !pixelsRef.current) return;
    const { data, rows, cols } = pixelsRef.current;
    renderCanvas(data, rows, cols, wc, ww);
  }, [wc, ww, status]);

  async function load() {
    try {
      const path = storagePaths.find(p => p.toLowerCase().endsWith('.dcm')) ?? storagePaths[0];

      const { data: urlData } = await supabase.storage.from('studies').createSignedUrl(path, 3600);
      if (!urlData) throw new Error('No se pudo obtener la URL del archivo.');

      const resp = await fetch(urlData.signedUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);

      // Validate DICM magic
      const magic = String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]);
      if (magic !== 'DICM') throw new Error('El archivo no es un DICOM válido.');

      const { default: dicomParser } = await import('dicom-parser');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataSet: any = dicomParser.parseDicom(byteArray);

      const rows         = dataSet.uint16('x00280010') ?? 0;
      const cols         = dataSet.uint16('x00280011') ?? 0;
      const bitsAllocated = dataSet.uint16('x00280100') ?? 16;
      const pixelRep     = dataSet.uint16('x00280103') ?? 0;

      try { setModality(dataSet.string('x00080060')?.trim() ?? ''); } catch { /* */ }
      try { setBodyPart(dataSet.string('x00180015')?.trim() ?? ''); } catch { /* */ }
      try {
        const raw = dataSet.string('x00080020')?.trim();
        if (raw?.length === 8) setStudyDate(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`);
      } catch { /* */ }

      let defaultWC = 40;
      let defaultWW = 400;
      try {
        const parsedWC = dataSet.floatString('x00281050');
        const parsedWW = dataSet.floatString('x00281051');
        if (parsedWC !== undefined) defaultWC = parsedWC;
        if (parsedWW !== undefined) defaultWW = parsedWW;
      } catch { /* use defaults */ }

      defaultWindowRef.current = { wc: defaultWC, ww: defaultWW };
      setWc(defaultWC);
      setWw(defaultWW);

      const el = dataSet.elements['x7fe00010'];
      if (!el || rows === 0 || cols === 0) { setStatus('unsupported'); return; }

      // Compressed DICOM: pixel data has undefined length (0xFFFFFFFF)
      if (el.length === 0xFFFFFFFF) { setStatus('unsupported'); return; }

      // Copy pixel bytes into an aligned buffer (Uint16/Int16 require 2-byte alignment)
      const pixelByteLength = rows * cols * (bitsAllocated === 16 ? 2 : 1);
      const aligned = new ArrayBuffer(pixelByteLength);
      new Uint8Array(aligned).set(byteArray.subarray(el.dataOffset, el.dataOffset + pixelByteLength));

      let pixelData: PixelArray;
      if (bitsAllocated === 16) {
        pixelData = pixelRep === 1 ? new Int16Array(aligned) : new Uint16Array(aligned);
      } else {
        pixelData = new Uint8Array(aligned);
      }

      pixelsRef.current = { data: pixelData, rows, cols };
      renderCanvas(pixelData, rows, cols, defaultWC, defaultWW);
      setStatus('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar la imagen.');
      setStatus('error');
    }
  }

  function renderCanvas(data: PixelArray, rows: number, cols: number, wcVal: number, wwVal: number) {
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
    setWc(dWC);
    setWw(dWW);
    setZoom(1);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {modality && <span style={{ color: '#60A5FA', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>{modality}</span>}
          {bodyPart && <span style={{ color: '#94A3B8', fontSize: 13 }}>{bodyPart}</span>}
          {studyDate && <span style={{ color: '#64748B', fontSize: 12 }}>{studyDate}</span>}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16 }}>
        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <span style={{ color: '#94A3B8', fontSize: 14 }}>Cargando imagen DICOM…</span>
          </div>
        )}
        {status === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: 280 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>⚠️</span>
            <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No se pudo cargar la imagen</p>
            <p style={{ color: '#64748B', fontSize: 13 }}>{errorMsg}</p>
          </div>
        )}
        {status === 'unsupported' && (
          <div style={{ textAlign: 'center', maxWidth: 300 }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔬</span>
            <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Formato comprimido</p>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
              Este archivo DICOM usa compresión avanzada (JPEG 2000 o similar). Podés verlo con un visor DICOM especializado como RadiAnt o Horos.
            </p>
            {(modality || bodyPart) && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, textAlign: 'left' }}>
                {modality  && <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0' }}>Modalidad: <span style={{ color: '#e2e8f0' }}>{modality}</span></p>}
                {bodyPart  && <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0' }}>Parte: <span style={{ color: '#e2e8f0' }}>{bodyPart}</span></p>}
                {studyDate && <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0' }}>Fecha: <span style={{ color: '#e2e8f0' }}>{studyDate}</span></p>}
              </div>
            )}
          </div>
        )}
        {status === 'ready' && (
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `scale(${zoom})`, transformOrigin: 'center', imageRendering: 'pixelated' }}
          />
        )}
        {/* Canvas hidden while loading (needed for renderCanvas to work) */}
        {status === 'loading' && <canvas ref={canvasRef} style={{ display: 'none' }} />}
      </div>

      {/* Controls — only shown when image is ready */}
      {status === 'ready' && (
        <div style={{ background: 'rgba(0,0,0,0.7)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Zoom + Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 4))} style={ctrlBtn}><ZoomIn size={15} /></button>
            <button onClick={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))} style={ctrlBtn}><ZoomOut size={15} /></button>
            <button onClick={resetView} style={ctrlBtn}><RefreshCw size={15} /></button>
            <span style={{ color: '#64748B', fontSize: 12, marginLeft: 4 }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Windowing sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SliderRow label="Brillo (WC)" value={wc} min={-1500} max={3000} onChange={setWc} />
            <SliderRow label="Contraste (WW)" value={ww} min={1} max={4000} onChange={setWw} />
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: '#94A3B8', fontSize: 11, width: 80, flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#60A5FA' }}
      />
      <span style={{ color: '#e2e8f0', fontSize: 11, width: 40, textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
  color: '#e2e8f0', cursor: 'pointer', padding: '7px 9px', display: 'flex', alignItems: 'center',
};
