# 18 — DICOM Viewer en el Browser: Research Exhaustivo

**Fecha:** 2026-05-13  
**Contexto:** `apps/web-patient/src/components/DicomViewer.tsx` usa `dicom-parser` + canvas manual. Funciona solo para Transfer Syntax sin comprimir. Este documento es la spec de investigación para expandir el soporte.  
**Fuente:** DICOM Standard PS3 (NEMA), documentación oficial de librerías JS/WASM, experiencia clínica de deployment.

---

## Índice

1. [Transfer Syntax UIDs — Clasificación Completa](#1-transfer-syntax-uids--clasificación-completa)
2. [Modalidades DICOM y sus Características](#2-modalidades-dicom-y-sus-características)
3. [SOP Class UIDs Relevantes](#3-sop-class-uids-relevantes)
4. [Librerías Web para Decodificación](#4-librerías-web-para-decodificación)
5. [Estrategia Práctica — Bundle Size y Prioridades](#5-estrategia-práctica--bundle-size-y-prioridades)
6. [Multi-frame DICOM](#6-multi-frame-dicom)
7. [Tabla de Prioridades — Cobertura vs Esfuerzo](#7-tabla-de-prioridades--cobertura-vs-esfuerzo)
8. [Appendix: Gaps del DicomViewer Actual](#8-appendix-gaps-del-dicomviewer-actual)

---

## 1. Transfer Syntax UIDs — Clasificación Completa

### 1.1 Sin comprimir (ya funcionan en el viewer actual)

| UID | Nombre oficial | Notas |
|-----|---------------|-------|
| `1.2.840.10008.1.2` | Implicit VR Little Endian (Default) | El más antiguo, sin VR explícito en el header del elemento |
| `1.2.840.10008.1.2.1` | Explicit VR Little Endian | El más común en producción moderna |
| `1.2.840.10008.1.2.2` | Explicit VR Big Endian (Retired) | Retirado en PS3.5-2021, pero archivos viejos existen |
| `1.2.840.10008.1.2.1.99` | Deflated Explicit VR Little Endian | Compresión zlib sobre el dataset (no sobre los pixels) — **ZLIB, no pixel compression** |

**Nota sobre `1.2.840.10008.1.2.1.99`:** Este TS usa deflate (zlib) sobre el stream completo del dataset, no sobre los pixels. `dicom-parser` no lo soporta nativamente. Requiere descomprimir el stream con la Web Compression API (`DecompressionStream`) antes de parsear. Los pixels resultantes son raw (sin comprimir).

### 1.2 JPEG Baseline / JPEG Extended (soportable con Image() o fetch)

| UID | Nombre oficial | JPEG Type | Notas |
|-----|---------------|-----------|-------|
| `1.2.840.10008.1.2.4.50` | JPEG Baseline (Process 1) | JPEG 8-bit lossy | El browser puede decodificar nativamente |
| `1.2.840.10008.1.2.4.51` | JPEG Extended (Process 2 & 4) | JPEG 12-bit lossy | **NO decodificable con Image()** — 12 bits no soportado por browser JPEG nativo |
| `1.2.840.10008.1.2.4.57` | JPEG Lossless Non-Hierarchical (Process 14) | JPEG lossless | Requiere decodificador JPEG lossless (no está en browsers) |
| `1.2.840.10008.1.2.4.70` | JPEG Lossless (Process 14 First-Order Prediction) | JPEG lossless | El más usado de los JPEG lossless; mismo requirement |

**Estrategia para `1.2.840.10008.1.2.4.50` (JPEG Baseline 8-bit):**
```typescript
// Los pixels están encapsulados en una Sequence of Items (0xFFFEE000)
// dicom-parser puede extraer los fragments con readEncapsulatedPixelData
const pixelData = dicomParser.readEncapsulatedPixelData(dataSet, dataSet.elements['x7fe00010'], 0);
// pixelData es un Uint8Array con el JPEG crudo
const blob = new Blob([pixelData], { type: 'image/jpeg' });
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
};
img.src = url;
```

**Limitación crítica:** Este approach devuelve un ImageBitmap RGB sin acceso a pixel values numéricos — no permite windowing (W/L adjustment). Solo válido para visualización pura sin ajuste clínico.

### 1.3 JPEG-LS (requieren CharLS-wasm)

| UID | Nombre oficial | Compresión | Notas |
|-----|---------------|------------|-------|
| `1.2.840.10008.1.2.4.80` | JPEG-LS Lossless | JPEG-LS lossless | Dominante en CR, DX, Mamografía |
| `1.2.840.10008.1.2.4.81` | JPEG-LS Near-Lossless | JPEG-LS lossy | Menos común que el lossless |

**JPEG-LS** es un estándar ISO 14495 completamente diferente a JPEG. No hay soporte nativo en browsers. Requiere:
- `charls-wasm` — port WebAssembly de la librería CharLS (C++)
- Alternativa: `@cornerstonejs/codec-charls` (wrapper del mismo CharLS)

El algoritmo JPEG-LS es un predictor + codificación de residuos de Golomb-Rice. No es implementable de forma liviana en JS puro — WASM es la única opción práctica.

### 1.4 JPEG 2000 (requieren openjpeg-wasm o similar)

| UID | Nombre oficial | Compresión | Notas |
|-----|---------------|------------|-------|
| `1.2.840.10008.1.2.4.90` | JPEG 2000 Lossless | JP2K lossless | Muy común en MR, CT modernos |
| `1.2.840.10008.1.2.4.91` | JPEG 2000 Lossy | JP2K lossy | Común en archivo a largo plazo |

**JPEG 2000** usa wavelets DWT. Tampoco soportado en browsers nativamente (Chrome/Firefox eliminaron el soporte experimental hace años). Opciones WASM:
- `openjpeg-wasm` — port WebAssembly de OpenJPEG
- `@cornerstonejs/codec-openjpeg` — wrapper con API DICOM-aware
- `@itk/image-io` — más pesado, no recomendado para mobile

### 1.5 RLE Lossless (implementable en JS puro)

| UID | Nombre oficial | Compresión | Notas |
|-----|---------------|------------|-------|
| `1.2.840.10008.1.2.5` | RLE Lossless | Run-Length Encoding | Algoritmo simple, implementable en JS |

**RLE DICOM** es un esquema propio (no el RLE genérico). El algoritmo:
1. Los pixels se segmentan por byte-plane (byte alto y byte bajo de 16-bit separados)
2. Cada segment se comprime con PackBits (mismo que TIFF)
3. Los segments se almacenan en una Sequence of Items

**Implementación PackBits en JS (el algoritmo completo):**
```javascript
function decodeRLESegment(src) {
  const dst = [];
  let i = 0;
  while (i < src.length) {
    const n = src[i++];
    if (n === 128) continue; // NOP
    if (n < 128) {
      // Literal run: copiar los n+1 bytes siguientes
      for (let j = 0; j <= n; j++) dst.push(src[i++]);
    } else {
      // Replicated run: repetir el siguiente byte (257-n) veces
      const val = src[i++];
      const count = 257 - n;
      for (let j = 0; j < count; j++) dst.push(val);
    }
  }
  return new Uint8Array(dst);
}

function decodeRLELossless(dataSet) {
  // El Pixel Data (7FE0,0010) tiene un RLE Header y N segments
  const element = dataSet.elements['x7fe00010'];
  const pixelData = new Uint8Array(dataSet.byteArray.buffer, element.dataOffset, element.length);
  
  // RLE Header: 64 uint32 LE — [numSegments, offset0, offset1, ...]
  const header = new DataView(pixelData.buffer, pixelData.byteOffset, 256);
  const numSegments = header.getUint32(0, true);
  const offsets = [];
  for (let i = 0; i < numSegments; i++) {
    offsets.push(header.getUint32((i + 1) * 4, true));
  }
  
  const rows = dataSet.uint16('x00280010');
  const cols = dataSet.uint16('x00280011');
  const bitsAllocated = dataSet.uint16('x00280100');
  const pixelCount = rows * cols;
  
  if (bitsAllocated === 8) {
    // Single segment
    const segStart = 64 + offsets[0]; // 64 bytes de header
    const segLength = numSegments > 1 ? offsets[1] - offsets[0] : pixelData.length - 64;
    const segment = decodeRLESegment(pixelData.subarray(segStart, segStart + segLength));
    return new Uint8Array(segment.buffer, 0, pixelCount);
  } else {
    // 16-bit: 2 segments (high byte plane, low byte plane)
    // Recombinar interleaved
    const buf = new Uint16Array(pixelCount);
    const seg0Data = decodeRLESegment(pixelData.subarray(64 + offsets[0]));
    const seg1Data = decodeRLESegment(pixelData.subarray(64 + offsets[1]));
    for (let i = 0; i < pixelCount; i++) {
      buf[i] = (seg0Data[i] << 8) | seg1Data[i];
    }
    return buf;
  }
}
```

**Nota:** RLE es infrecuente en la práctica clínica. Prioridad baja.

### 1.6 Otros Transfer Syntax (exóticos/retirados/especiales)

| UID | Nombre oficial | Notas |
|-----|---------------|-------|
| `1.2.840.10008.1.2.4.100` | MPEG2 MP@ML | Video comprimido — MR cine, fluoro |
| `1.2.840.10008.1.2.4.101` | MPEG2 MP@HL | Video — `<video>` tag puede funcionar |
| `1.2.840.10008.1.2.4.102` | MPEG-4 AVC/H.264 High Profile | Video — `<video>` tag |
| `1.2.840.10008.1.2.4.103` | MPEG-4 AVC/H.264 BD-Compatible | Video |
| `1.2.840.10008.1.2.4.104` | MPEG-4 AVC/H.264 High Profile For 2D Video | Video |
| `1.2.840.10008.1.2.4.105` | MPEG-4 AVC/H.264 High Profile For 3D Video | Video |
| `1.2.840.10008.1.2.4.106` | MPEG-4 AVC/H.264 Stereo High Profile | Video |
| `1.2.840.10008.1.2.4.107` | HEVC/H.265 Main Profile | Video |
| `1.2.840.10008.1.2.4.108` | HEVC/H.265 Main 10 Profile | Video |
| `1.2.840.10008.1.2.4.201` | High-Throughput JPEG 2000 Lossless | HT-J2K (ISO 15444-15) |
| `1.2.840.10008.1.2.4.202` | High-Throughput JPEG 2000 | HT-J2K lossy |
| `1.2.840.10008.1.2.4.203` | HT JPEG 2000 with RPCL | HT-J2K variante |
| `1.2.840.10008.1.2.4.52` | JPEG Extended (Retired, 12-bit) | Solo archivos muy viejos |
| `1.2.840.10008.1.2.4.55` | JPEG Spectral (Retired) | Extremadamente raro |
| `1.2.840.10008.1.2.4.56` | JPEG Full Progression (Retired) | Extremadamente raro |
| `1.2.840.10008.1.2.4.58-65` | Varios JPEG Lossless Retired | Solo archivos de archivos viejos |

**MPEG/H.264:** Los pixels están en el Pixel Data como frames MPEG. Se puede extraer el stream y pasarlo a un `<video>` element con `MediaSource`, pero la integración con la interfaz del viewer es compleja. No tiene windowing clínico.

---

## 2. Modalidades DICOM y sus Características

### 2.1 CT — Computed Tomography

| Característica | Valor |
|----------------|-------|
| Transfer Syntax típico | Explicit VR LE (1.2.840.10008.1.2.1) o JPEG2000 lossless (1.2.840.10008.1.2.4.90) |
| Bits Allocated | 16 |
| Bits Stored | 12 o 16 |
| Pixel Representation | Signed (pixelRep=1) — valores negativos para aire |
| Photometric Interpretation | MONOCHROME2 |
| Samples Per Pixel | 1 |
| Rango típico de valores | -1024 HU (aire) a +3000 HU (metal) |
| Windowing | CRÍTICO — siempre usar los tags Window Center/Width (0028,1050)/(0028,1051) |
| Rescale | Siempre aplicar Rescale Slope (0028,1053) + Intercept (0028,1052) para convertir a HU |
| Number of Frames | Típicamente 1 por archivo (series de 100-500 archivos) |
| Enhanced CT | Posible — ver sección 6 |

**Ventanas CT preconfiguradas (Window Center / Window Width):**
```typescript
const CT_PRESETS = {
  'Pulmón':     { wc: -600, ww: 1600 },
  'Mediastino': { wc:   40, ww:  400 },
  'Abdomen':    { wc:   60, ww:  400 },
  'Cerebro':    { wc:   40, ww:   80 },
  'Hueso':      { wc:  400, ww: 1800 },
  'Hígado':     { wc:   60, ww:  160 },
};
```

**Quirks CT:**
- `samplesPerPixel === 1` — el check actual del viewer es correcto
- El primer frame puede tener `pixelRep=1` (signed) — el viewer actual usa `Int16Array` cuando `pixelRep===1`, correcto
- Algunos CT tienen localizer (scout) en la misma serie — su modality sigue siendo CT pero son 2D
- El tag `ImageType` (0008,0008) puede contener "LOCALIZER" — útil para filtrar

### 2.2 MR — Magnetic Resonance

| Característica | Valor |
|----------------|-------|
| Transfer Syntax típico | Explicit VR LE o JPEG2000 lossless |
| Bits Allocated | 16 (raramente 32) |
| Bits Stored | 12 o 16 |
| Pixel Representation | Unsigned (pixelRep=0) — valores siempre positivos |
| Photometric Interpretation | MONOCHROME2 |
| Rango típico | 0-4095 (12-bit) o 0-65535 (16-bit) |
| Windowing | Usar tags DICOM; sin tags, calcular de la imagen |
| Rescale | Muchos MR NO tienen Rescale Slope — asumir slope=1, intercept=0 |
| SOP Class típica | MR Image Storage (1.2.840.10008.5.1.4.1.1.4) |

**Quirks MR:**
- Las series MR son multi-orientación: axial, sagital, coronal — el InstanceNumber puede no ser suficiente para ordenar; usar `ImagePositionPatient` (0020,0032)
- Secuencias funcionales (fMRI): 200+ frames en la misma serie
- Diffusion MRI: múltiples b-values y gradientes — el tag `DiffusionBValue` (0018,9087) diferencia las imágenes
- MR espectroscopia: SOP Class diferente, no tiene pixel data estándar

### 2.3 US — Ultrasound

| Característica | Valor |
|----------------|-------|
| Transfer Syntax típico | Explicit VR LE o JPEG Baseline (1.2.840.10008.1.2.4.50) |
| Bits Allocated | 8 o 16 |
| Samples Per Pixel | **1 o 3** — puede ser RGB |
| Photometric Interpretation | **MONOCHROME2, RGB, YBR_FULL, YBR_FULL_422** |
| Compresión | Frecuentemente JPEG Baseline (US comprimidos son comunes) |
| Frames | Multi-frame es común (cine clips de ecocardiografía) |

**Quirks US — EL MÁS COMPLEJO DE RENDERIZAR:**
- Cuando `samplesPerPixel === 3`, el viewer actual lo rechaza (`if (samplesPerPixel !== 1) return null`) — esto es un bug para US
- `YBR_FULL` y `YBR_FULL_422`: los pixels NO son RGB, son YCbCr — requieren conversión de color space
- `YBR_FULL_422` tiene downsampling del Cb/Cr (como JPEG standard) — los planos Cb y Cr tienen la mitad de samples horizontales

**Conversión YBR_FULL a RGB:**
```typescript
function ybrFullToRgb(y: number, cb: number, cr: number): [number, number, number] {
  // DICOM PS3.3 C.7.6.3.1.2 — YBR_FULL to RGB conversion
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  ];
}
```

**Conversión YBR_FULL_422:**
El almacenamiento es `Y1 Y2 Cb Y3 Y4 Cb ...` (cada Cb/Cr compartido por 2 pixels horizontales).

### 2.4 CR / DX — Computed Radiography / Digital X-Ray

| Característica | Valor |
|----------------|-------|
| Transfer Syntax típico | JPEG-LS Lossless (1.2.840.10008.1.2.4.80) — dominante |
| Bits Allocated | 16 |
| Bits Stored | 10, 12, o 14 |
| Pixel Representation | Unsigned |
| Photometric Interpretation | MONOCHROME1 o MONOCHROME2 |
| Resolución | Alta — 2048x2048 hasta 4096x4096 pixels |

**MONOCHROME1 vs MONOCHROME2 — DIFERENCIA CRÍTICA:**
- `MONOCHROME2`: 0 = negro (aire en Rx), max = blanco → presentación estándar
- `MONOCHROME1`: 0 = blanco, max = negro → presentación invertida

**Fix en el renderer:**
```typescript
const photometricInterpretation = dcmStr(ds, 'x00280004');
const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';

// En el loop de render:
let v = ((data[i] - lower) / range) * 255;
if (isMonochrome1) v = 255 - v; // Invertir para MONOCHROME1
v = Math.max(0, Math.min(255, v));
```

**Quirks CR/DX:**
- CR frecuentemente usa JPEG-LS → el viewer actual muestra "formato comprimido"
- Las imágenes de Rx son las más críticas para el usuario (mamografías, tórax)
- El Pixel Padding Value (0028,0120) define el valor que representa "fuera del campo" — debe excluirse del cálculo de windowing automático

### 2.5 PT — PET (Positron Emission Tomography)

| Característica | Valor |
|----------------|-------|
| Transfer Syntax | Typical Explicit VR LE o JPEG2000 |
| Bits Allocated | 16 |
| Pixel Representation | Unsigned |
| Photometric | MONOCHROME2 |
| Rescale | Siempre tiene Rescale Slope/Intercept (SUV units) |
| LUT | A menudo se muestra con pseudo-color (hot-metal, rainbow) |

**Quirks PT:**
- Los valores de pixel codifican SUV (Standardized Uptake Values) — la escala depende de Rescale Slope/Intercept
- El PET casi siempre se visualiza con pseudocolores — hot-metal LUT es la estándar clínica
- PET-CT es una fusión de dos series separadas — fusión de imágenes requiere registro previo

**Hot-Metal LUT básica:**
```typescript
function applyHotMetalLUT(value255: number): [number, number, number] {
  const v = value255 / 255;
  const r = Math.min(1, v * 3);
  const g = Math.max(0, Math.min(1, v * 3 - 1));
  const b = Math.max(0, v * 3 - 2);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
```

### 2.6 NM — Nuclear Medicine

Similar a PT pero con diferentes isótopos. Frecuentemente multi-frame. Transfer Syntax typical: Explicit VR LE.

### 2.7 MG — Mammography

| Característica | Valor |
|----------------|-------|
| Transfer Syntax | JPEG-LS Lossless — casi exclusivo |
| Bits Stored | 12 o 14 bits |
| Photometric | MONOCHROME1 (convención clínica: denso=blanco) |
| Resolución | Muy alta — hasta 4096x5120 |
| SOP Classes | Digital Mammography X-Ray Image Storage (varias) |

**Crítico:** Las mamografías en JPEG-LS son probablemente el caso de uso más importante después de CT en una plataforma de salud LATAM. El viewer actual no las puede mostrar.

### 2.8 SC — Secondary Capture

| Característica | Valor |
|----------------|-------|
| Transfer Syntax | Cualquiera — depende de la fuente |
| Descripción | Capturas de pantalla, imágenes escaneadas, screenshots de equipos |
| Bits | 8 o 16, puede ser RGB (3 channels) |
| Uso típico | PDFs escaneados, fotos clínicas, capturas de monitores |

SC puede tener `samplesPerPixel=3` con `photometric=RGB` — actualmente rechazado por el viewer.

---

## 3. SOP Class UIDs Relevantes

### 3.1 Image Storage SOPs principales

| UID | Nombre | Modalidad Típica |
|-----|--------|-----------------|
| `1.2.840.10008.5.1.4.1.1.1` | Computed Radiography Image Storage | CR |
| `1.2.840.10008.5.1.4.1.1.1.1` | Digital X-Ray Image Storage (For Presentation) | DX |
| `1.2.840.10008.5.1.4.1.1.1.1.1` | Digital X-Ray Image Storage (For Processing) | DX |
| `1.2.840.10008.5.1.4.1.1.1.2` | Digital Mammography X-Ray Image Storage (Presentation) | MG |
| `1.2.840.10008.5.1.4.1.1.1.2.1` | Digital Mammography X-Ray Image Storage (Processing) | MG |
| `1.2.840.10008.5.1.4.1.1.1.3` | Digital Intra-oral X-Ray Image Storage (Presentation) | IO |
| `1.2.840.10008.5.1.4.1.1.2` | CT Image Storage | CT |
| `1.2.840.10008.5.1.4.1.1.2.1` | Enhanced CT Image Storage | CT multi-frame |
| `1.2.840.10008.5.1.4.1.1.3.1` | Ultrasound Multi-frame Image Storage | US |
| `1.2.840.10008.5.1.4.1.1.4` | MR Image Storage | MR |
| `1.2.840.10008.5.1.4.1.1.4.1` | Enhanced MR Image Storage | MR multi-frame |
| `1.2.840.10008.5.1.4.1.1.4.2` | MR Spectroscopy Storage | MR |
| `1.2.840.10008.5.1.4.1.1.6.1` | Ultrasound Image Storage | US |
| `1.2.840.10008.5.1.4.1.1.7` | Secondary Capture Image Storage | SC |
| `1.2.840.10008.5.1.4.1.1.7.1` | Multi-frame Single Bit Secondary Capture | SC |
| `1.2.840.10008.5.1.4.1.1.7.2` | Multi-frame Grayscale Byte Secondary Capture | SC |
| `1.2.840.10008.5.1.4.1.1.7.3` | Multi-frame Grayscale Word Secondary Capture | SC |
| `1.2.840.10008.5.1.4.1.1.7.4` | Multi-frame True Color Secondary Capture | SC RGB |
| `1.2.840.10008.5.1.4.1.1.20` | Nuclear Medicine Image Storage | NM |
| `1.2.840.10008.5.1.4.1.1.77.1.1` | VL Endoscopic Image Storage | Endoscopia |
| `1.2.840.10008.5.1.4.1.1.77.1.4` | VL Photographic Image Storage | Foto clínica |
| `1.2.840.10008.5.1.4.1.1.128` | Positron Emission Tomography Image Storage | PT |
| `1.2.840.10008.5.1.4.1.1.130` | Enhanced PET Image Storage | PT multi-frame |

### 3.2 Non-Image SOPs (no tienen Pixel Data renderizable directamente)

| UID | Nombre | Tipo |
|-----|--------|------|
| `1.2.840.10008.5.1.4.1.1.9.1.1` | 12-lead ECG Waveform Storage | Waveform |
| `1.2.840.10008.5.1.4.1.1.11.1` | Grayscale Softcopy Presentation State | GSPS — LUT+overlay metadata |
| `1.2.840.10008.5.1.4.1.1.66` | Raw Data Storage | Datos crudos |
| `1.2.840.10008.5.1.4.1.1.481.1` | RT Image Storage | Radioterapia |
| `1.2.840.10008.5.1.4.1.1.481.3` | RT Structure Set Storage | Radioterapia contornos |

### 3.3 Uso práctico del SOP Class UID

El tag `SOPClassUID` es `(0008,0016)` → en dicom-parser: `dcmStr(ds, 'x00080016')`.

```typescript
const sopClass = dcmStr(ds, 'x00080016');

// Detectar Enhanced Multi-frame
const ENHANCED_MULTIFRAME_SOPS = new Set([
  '1.2.840.10008.5.1.4.1.1.2.1',  // Enhanced CT
  '1.2.840.10008.5.1.4.1.1.4.1',  // Enhanced MR
  '1.2.840.10008.5.1.4.1.1.130',  // Enhanced PET
]);
const isEnhanced = ENHANCED_MULTIFRAME_SOPS.has(sopClass);

// Detectar Secondary Capture RGB
const SC_RGB_SOP = '1.2.840.10008.5.1.4.1.1.7.4';
const isRGBCapture = sopClass === SC_RGB_SOP;

// Detectar Presentation State (no renderizable como imagen)
const GSPS_SOP = '1.2.840.10008.5.1.4.1.1.11.1';
const isPresentationState = sopClass === GSPS_SOP;
```

---

## 4. Librerías Web para Decodificación

### 4.1 `dicom-parser` v1.8.x (ya instalado)

**Capacidades reales:**
- Parsea el DICOM header y todos los elementos del dataset
- Soporta Implicit VR LE, Explicit VR LE, Explicit VR BE
- **Extrae** los pixel data bytes crudos (sin decodificar compresión)
- Para encapsulated pixel data (comprimido): `dicomParser.readEncapsulatedPixelData(dataSet, element, frameIndex)` extrae el fragment comprimido
- `dicomParser.readEncapsulatedPixelDataFromFragments()` para multi-fragment frames

**Lo que NO hace:**
- No decodifica JPEG, JPEG-LS, JPEG2000, RLE
- No hace conversión de color space
- No aplica LUTs ni windowing

**Tamaño:** ~120KB minificado. Ya en el bundle.

**API de encapsulated pixel data:**
```typescript
// Para Transfer Syntax comprimidos, el Pixel Data usa Sequence of Items
// dicom-parser v1.8+ tiene esta API:
const pixelDataElement = dataSet.elements['x7fe00010'];

if (pixelDataElement.encapsulatedPixelData) {
  // Frame 0 (0-indexed)
  const compressedBytes = dicomParser.readEncapsulatedPixelData(
    dataSet,
    pixelDataElement,
    0  // frame index
  );
  // compressedBytes es Uint8Array con el JPEG/JPEG-LS/JP2K comprimido
}
```

### 4.2 `cornerstone3D` — @cornerstonejs/core

**Qué es:** Framework completo de visualización médica. No es solo un decodificador.

**Capacidades:**
- Renderizado 3D vía vtk.js (WebGL)
- Volumetría, MPR (reformateo multiplanar), fusión PET-CT
- Windowing, LUT, zoom, pan, mediciones
- Soporta todos los Transfer Syntax vía image loaders/codecs separados
- Streaming de imágenes (WADO-RS, WADO-URI, DICOMweb)

**Packages relevantes:**
```
@cornerstonejs/core              ~2.5MB
@cornerstonejs/tools             ~1.2MB
@cornerstonejs/dicom-image-loader ~800KB (incluye decoders básicos)
@cornerstonejs/codec-libjpeg-turbo-8bit  (JPEG 8-bit)
@cornerstonejs/codec-charls      (JPEG-LS)
@cornerstonejs/codec-openjpeg    (JPEG 2000)
vtk.js                           ~8MB
```

**Bundle size total estimado:** 12-15MB minificado. **Completamente inadecuado para mobile-first.**

**Cuándo usarlo:** Si se necesita MPR o 3D, no hay otra opción viable en el browser. Para visualización 2D básica es excesivo.

**Complejidad de integración:** Alta. Requiere un canvas específico, un Rendering Engine, Viewports, ImageLoaders, MetadataProviders. No es drop-in.

### 4.3 `dcmjs` — dcmjs.org

**Qué es:** Librería para manipulación de datasets DICOM en JS. No es un renderer.

**Capacidades:**
- Parseo de datasets (alternativa a dicom-parser)
- Escritura de DICOM (crear archivos)
- Conversión de/hacia JSON-FHIRmed (DICOM JSON model)
- Manejo de Structured Reports
- **No decodifica pixels comprimidos**

**Tamaño:** ~1.5MB. Demasiado pesado para solo parseo cuando ya tenemos `dicom-parser`.

**Cuándo usarlo en Bresca:** Solo si se necesita escribir DICOMs o parsear Structured Reports. Para el viewer, no agrega valor.

### 4.4 `charls-wasm` / `@cornerstonejs/codec-charls`

**Qué es:** Port WebAssembly de CharLS (implementación C++ de JPEG-LS por Chris Auclair).

**Repositorio activo:** `https://github.com/cornerstonejs/codec-charls`

**API típica:**
```typescript
import initCharls, { JpegLSDecoder } from '@cornerstonejs/codec-charls';

// Inicializar WASM (una sola vez en la vida de la app)
await initCharls();

const decoder = new JpegLSDecoder();
decoder.setEncodedBuffer(compressedBytes.buffer);
decoder.decode();

const frameInfo = decoder.getFrameInfo();
// frameInfo: { width, height, bitsPerSample, componentCount }

const decodedBuffer = decoder.getDecodedBuffer();
// decodedBuffer: ArrayBuffer con los pixels raw
```

**Tamaño WASM:** ~800KB (el archivo .wasm). Se puede lazy load.

**Soporte:** JPEG-LS lossless y near-lossless (TS 1.2.840.10008.1.2.4.80 y .81).

### 4.5 `openjpeg-wasm` / `@cornerstonejs/codec-openjpeg`

**Qué es:** Port WebAssembly de OpenJPEG (implementación C de JPEG 2000).

**Repositorio:** `https://github.com/cornerstonejs/codec-openjpeg`

**API típica:**
```typescript
import initOpenJPEG, { OpenJPEGDecoder } from '@cornerstonejs/codec-openjpeg';

await initOpenJPEG();

const decoder = new OpenJPEGDecoder();
decoder.setEncodedBuffer(compressedBytes.buffer);
decoder.decode();

const frameInfo = decoder.getFrameInfo();
const decodedBuffer = decoder.getDecodedBuffer();
```

**Tamaño WASM:** ~1.5MB.

**Soporte:** JPEG 2000 lossless y lossy (TS .4.90 y .4.91). También HT-JPEG2000 en versiones recientes.

### 4.6 `libjpeg-turbo-wasm` / `@cornerstonejs/codec-libjpeg-turbo-8bit`

**Qué es:** Port WASM de libjpeg-turbo. Decodifica JPEG 8-bit (lossy baseline).

**Cuándo es mejor que `Image()`:**
- Acceso a los pixel values numéricos (en vez de solo renderizado visual)
- JPEG Extendido 12-bit (el browser nativo no puede)
- Control preciso del pipeline de decode (sin alpha premultiplied)

**Tamaño WASM:** ~400KB.

**Para TS `1.2.840.10008.1.2.4.50` (JPEG Baseline 8-bit):**
El approach con `Image()` + canvas es suficiente para visualización pura, pero si se necesita windowing manual sobre los valores de pixel, se necesita este codec para acceder a los bytes.

### 4.7 Alternativas ligeras emergentes (2024-2025)

**`@osimis/dicom-parser`:** Fork de dicom-parser con mejor soporte de encapsulated data. Evaluación pendiente.

**`dicom-microscopy-viewer`:** Especializado en pathología (whole slide imaging). No relevante para Bresca.

**`@radicalimaging/dicom-parser-stream`:** Streaming parser — útil para archivos grandes sin cargar todo en memoria. Relevante para Enhanced multi-frame con cientos de frames.

**`nifti-reader-js`:** Formato NIfTI (neuroimagen) — no es DICOM pero algunos archivos de investigación son NIfTI. Fuera del scope.

**`fast-jpeg-ls` (JS puro):** Implementación experimental de JPEG-LS en TypeScript. Velocidad ~10x más lenta que CharLS-WASM. No recomendado para producción.

---

## 5. Estrategia Práctica — Bundle Size y Prioridades

### 5.1 Cobertura real por Transfer Syntax en LATAM

Basado en tipos de estudios comunes en centros de salud LATAM:

| Transfer Syntax | TS UID | Cobertura estimada | Modalidades |
|----------------|--------|-------------------|-------------|
| Explicit VR LE (uncompressed) | 1.2.840.10008.1.2.1 | ~40% | CT, MR, NM, PT |
| Implicit VR LE (uncompressed) | 1.2.840.10008.1.2 | ~15% | CT legacy, MR legacy |
| JPEG-LS Lossless | 1.2.840.10008.1.2.4.80 | ~25% | CR, DX, MG, US |
| JPEG 2000 Lossless | 1.2.840.10008.1.2.4.90 | ~10% | CT, MR modernos |
| JPEG Baseline 8-bit | 1.2.840.10008.1.2.4.50 | ~7% | US, SC |
| RLE Lossless | 1.2.840.10008.1.2.5 | ~1% | Raro |
| Otros | varios | ~2% | Video, JPEG Extended |

**El 80% de los estudios clínicos** se cubre con:
1. Uncompressed (ya funciona) → 55%
2. + JPEG-LS Lossless → +25% = **80%**

**El 90%** se agrega con JPEG 2000 → +10% = **90%**

### 5.2 Arquitectura de lazy loading recomendada

```
Initial bundle:
  dicom-parser (ya instalado, ~120KB) ← siempre cargado

On-demand (lazy import):
  charls-wasm (~800KB .wasm)     ← solo cuando TS = JPEG-LS
  openjpeg-wasm (~1.5MB .wasm)   ← solo cuando TS = JPEG 2000
```

**Implementación con dynamic import:**
```typescript
// codecManager.ts
let charlsModule: any = null;
let openjpegModule: any = null;

export async function getCharls() {
  if (!charlsModule) {
    const { default: init, JpegLSDecoder } = await import('@cornerstonejs/codec-charls');
    await init();
    charlsModule = { JpegLSDecoder };
  }
  return charlsModule;
}

export async function getOpenJPEG() {
  if (!openjpegModule) {
    const { default: init, OpenJPEGDecoder } = await import('@cornerstonejs/codec-openjpeg');
    await init();
    openjpegModule = { OpenJPEGDecoder };
  }
  return openjpegModule;
}
```

**En Vite, para que los WASM se sirvan correctamente:**
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@cornerstonejs/codec-charls', '@cornerstonejs/codec-openjpeg'],
  },
  // Para archivos .wasm en public/:
  assetsInclude: ['**/*.wasm'],
});
```

### 5.3 Flujo de decisión para decodificación

```
parseDicomFile():
  │
  ├─ Leer Transfer Syntax UID (0002,0010)
  │
  ├─ UNCOMPRESSED (1.2.840.10008.1.2, .1.2.1, .1.2.2)
  │   └─ Acceso directo al pixel data buffer → actual (ya funciona)
  │
  ├─ JPEG BASELINE 8-bit (1.2.840.10008.1.2.4.50)
  │   ├─ Extraer fragment con readEncapsulatedPixelData()
  │   └─ Opción A: Image() + canvas (sin windowing numérico)
  │       Opción B: libjpeg-turbo-wasm (con pixel values)
  │
  ├─ JPEG-LS (1.2.840.10008.1.2.4.80, .81)
  │   ├─ Lazy load charls-wasm
  │   ├─ Extraer fragment comprimido
  │   └─ Decodificar → raw pixels → continuar pipeline normal
  │
  ├─ JPEG 2000 (1.2.840.10008.1.2.4.90, .91)
  │   ├─ Lazy load openjpeg-wasm
  │   ├─ Extraer fragment comprimido
  │   └─ Decodificar → raw pixels → continuar pipeline normal
  │
  ├─ RLE LOSSLESS (1.2.840.10008.1.2.5)
  │   └─ Implementar decodeRLELossless() en JS puro
  │
  └─ OTROS → mostrar "formato no soportado" con TS UID visible
```

### 5.4 Función de decodificación unificada

```typescript
// decoders/index.ts
import dicomParser from 'dicom-parser';

export async function extractPixelData(
  dataSet: dicomParser.DataSet,
  transferSyntax: string,
  frameIndex: number = 0
): Promise<{ pixels: Uint8Array | Uint16Array | Int16Array; isCompressed: boolean }> {
  
  const element = dataSet.elements['x7fe00010'];
  
  // Uncompressed — acceso directo
  if (UNCOMPRESSED_TS.has(transferSyntax)) {
    const bitsAllocated = dataSet.uint16('x00280100') ?? 16;
    const rows = dataSet.uint16('x00280010') ?? 0;
    const cols = dataSet.uint16('x00280011') ?? 0;
    const bytesPerPixel = bitsAllocated / 8;
    const frameSize = rows * cols * bytesPerPixel;
    const offset = element.dataOffset + frameIndex * frameSize;
    const raw = new Uint8Array(dataSet.byteArray.buffer, offset, frameSize);
    const pixelRep = dataSet.uint16('x00280103') ?? 0;
    
    if (bitsAllocated === 16) {
      const aligned = new ArrayBuffer(frameSize);
      new Uint8Array(aligned).set(raw);
      return {
        pixels: pixelRep === 1 ? new Int16Array(aligned) : new Uint16Array(aligned),
        isCompressed: false,
      };
    }
    return { pixels: new Uint8Array(raw), isCompressed: false };
  }
  
  // Comprimido — extraer fragment encapsulado
  const compressedFrame = dicomParser.readEncapsulatedPixelData(dataSet, element, frameIndex);
  
  if (transferSyntax === '1.2.840.10008.1.2.4.80' || transferSyntax === '1.2.840.10008.1.2.4.81') {
    // JPEG-LS
    const { JpegLSDecoder } = await import('./charls-decoder');
    return { pixels: await JpegLSDecoder.decode(compressedFrame), isCompressed: true };
  }
  
  if (transferSyntax === '1.2.840.10008.1.2.4.90' || transferSyntax === '1.2.840.10008.1.2.4.91') {
    // JPEG 2000
    const { OpenJPEGDecoder } = await import('./openjpeg-decoder');
    return { pixels: await OpenJPEGDecoder.decode(compressedFrame), isCompressed: true };
  }
  
  if (transferSyntax === '1.2.840.10008.1.2.5') {
    // RLE
    const { decodeRLELossless } = await import('./rle-decoder');
    return { pixels: decodeRLELossless(dataSet, frameIndex), isCompressed: true };
  }
  
  throw new Error(`Transfer Syntax no soportado: ${transferSyntax}`);
}
```

---

## 6. Multi-frame DICOM

### 6.1 Serie de archivos separados vs Enhanced Multi-frame

**Modelo clásico (legacy):**
- Cada slice/frame es un archivo `.dcm` separado
- Una serie CT de 300 slices = 300 archivos
- Se identifican como pertenecientes a la misma serie por `SeriesInstanceUID` (0020,000E)
- El orden se determina por `InstanceNumber` (0020,0013) o `ImagePositionPatient` (0020,0032)
- El viewer actual ya maneja esto — carga múltiples `storagePaths` y los ordena por `instanceNumber`

**Enhanced Multi-frame (nuevo modelo, PS3.3 desde 2004):**
- UN solo archivo `.dcm` contiene todos los frames
- Los tags de la imagen varían por frame (en un `PerFrameFunctionalGroupsSequence`)
- La geometría, parámetros de adquisición, etc., están en el `SharedFunctionalGroupsSequence`
- Mucho más eficiente: 1 request HTTP vs 300
- Más complejo de parsear: la metadata del frame vive anidada en sequences

### 6.2 Detección de multi-frame

```typescript
// Detectar si un archivo es multi-frame
const numberOfFrames = parseInt(dcmStr(ds, 'x00280008') || '1', 10);
const isMultiFrame = numberOfFrames > 1;

// Detectar Enhanced Multi-frame por SOP Class
const ENHANCED_SOPS = new Set([
  '1.2.840.10008.5.1.4.1.1.2.1',   // Enhanced CT
  '1.2.840.10008.5.1.4.1.1.4.1',   // Enhanced MR
  '1.2.840.10008.5.1.4.1.1.130',   // Enhanced PET
  '1.2.840.10008.5.1.4.1.1.3.1',   // US Multi-frame (legacy también)
]);
const sopClassUID = dcmStr(ds, 'x00080016');
const isEnhancedMF = ENHANCED_SOPS.has(sopClassUID);

// Nota: US Multi-frame (1.2.840.10008.5.1.4.1.1.3.1) puede ser legacy o enhanced
// Distinguir por presencia de PerFrameFunctionalGroupsSequence (5200,9230)
const hasPerFrameGroups = !!ds.elements['x52009230'];
```

### 6.3 Extraer frames individuales con dicom-parser

**Para multi-frame NO encapsulado (uncompressed):**
```typescript
function extractUncompressedFrame(
  dataSet: any,
  frameIndex: number,
  rows: number,
  cols: number,
  bitsAllocated: number,
  pixelRep: number
) {
  const element = dataSet.elements['x7fe00010'];
  const bytesPerPixel = bitsAllocated / 8;
  const frameSize = rows * cols * bytesPerPixel;
  
  // El pixel data es un buffer lineal — frame N empieza en frameIndex * frameSize
  const byteOffset = element.dataOffset + frameIndex * frameSize;
  const aligned = new ArrayBuffer(frameSize);
  new Uint8Array(aligned).set(
    new Uint8Array(dataSet.byteArray.buffer, byteOffset, frameSize)
  );
  
  if (bitsAllocated === 16) {
    return pixelRep === 1 ? new Int16Array(aligned) : new Uint16Array(aligned);
  }
  return new Uint8Array(aligned);
}
```

**Para multi-frame encapsulado (comprimido):**
```typescript
// dicom-parser v1.8+ maneja automáticamente la extracción del frame correcto
const compressedFrame = dicomParser.readEncapsulatedPixelData(
  dataSet,
  dataSet.elements['x7fe00010'],
  frameIndex  // ← índice de frame, 0-based
);
// compressedFrame es Uint8Array con los bytes del frame comprimido específico
```

### 6.4 Enhanced Multi-frame — acceso a metadata por frame

En Enhanced Multi-frame, los parámetros que varían por frame (posición espacial, timing, etc.) están en `PerFrameFunctionalGroupsSequence (5200,9230)`, que es una secuencia con un item por frame.

```typescript
// Acceder a la posición del frame N en Enhanced CT/MR
function getEnhancedFramePosition(dataSet: any, frameIndex: number): [number, number, number] | null {
  const perFrameSeq = dataSet.elements['x52009230'];
  if (!perFrameSeq) return null;
  
  // Los items de la secuencia están en perFrameSeq.items[frameIndex]
  const frameItem = perFrameSeq.items?.[frameIndex]?.dataSet;
  if (!frameItem) return null;
  
  // PlanePositionSequence (0020,9113) > ImagePositionPatient (0020,0032)
  const planePosSeq = frameItem.elements['x00209113'];
  if (!planePosSeq?.items?.[0]) return null;
  
  const posDS = planePosSeq.items[0].dataSet;
  const posStr = posDS.string('x00200032');
  if (!posStr) return null;
  
  const [x, y, z] = posStr.split('\\').map(Number);
  return [x, y, z];
}
```

**Nota importante:** `dicom-parser` parsea secuencias anidadas de forma lazy en algunos contextos. Para Enhanced multi-frame con muchos frames (>100), considerar `dicom-parser`'s `parseDicom` con la opción `{untilTag: '7fe00010'}` para parsear el header y luego acceder al pixel data directamente por offset.

### 6.5 Ordenamiento de frames en Enhanced Multi-frame

En Enhanced CT (axial), el orden de slices no es necesariamente el `frameIndex`. Se debe ordenar por `ImagePositionPatient.z` (coordenada de posición en el eje de slice).

```typescript
interface EnhancedFrame {
  index: number;        // índice en el archivo (para readEncapsulatedPixelData)
  position: number;     // z-coordinate para ordenamiento
}

function getEnhancedFrameOrder(dataSet: any, numberOfFrames: number): EnhancedFrame[] {
  const frames: EnhancedFrame[] = [];
  for (let i = 0; i < numberOfFrames; i++) {
    const pos = getEnhancedFramePosition(dataSet, i);
    frames.push({ index: i, position: pos ? pos[2] : i });
  }
  return frames.sort((a, b) => a.position - b.position);
}
```

---

## 7. Tabla de Prioridades — Cobertura vs Esfuerzo

### 7.1 Matriz de implementación recomendada para Bresca

| Prioridad | Transfer Syntax | TS UID | Cobertura acumulada | Esfuerzo | Dependencia | Estado actual |
|-----------|----------------|--------|---------------------|----------|-------------|---------------|
| P0 | Uncompressed (Explicit LE) | 1.2.840.10008.1.2.1 | 40% | 0 (ya hecho) | ninguna | DONE |
| P0 | Uncompressed (Implicit LE) | 1.2.840.10008.1.2 | 55% | 0 (ya hecho) | ninguna | DONE |
| P1 | **JPEG-LS Lossless** | 1.2.840.10008.1.2.4.80 | **80%** | Medio | charls-wasm (~800KB lazy) | PENDIENTE |
| P2 | **JPEG 2000 Lossless** | 1.2.840.10008.1.2.4.90 | **90%** | Medio | openjpeg-wasm (~1.5MB lazy) | PENDIENTE |
| P3 | JPEG Baseline 8-bit | 1.2.840.10008.1.2.4.50 | 97% | Bajo | Image() API (ya disponible) | PENDIENTE |
| P4 | Uncompressed BE (retired) | 1.2.840.10008.1.2.2 | +<1% | Bajo | Swap byte order en JS | PENDIENTE |
| P4 | RLE Lossless | 1.2.840.10008.1.2.5 | +<1% | Medio | JS puro (ver código §1.5) | PENDIENTE |
| P5 | JPEG 2000 Lossy | 1.2.840.10008.1.2.4.91 | +<1% | 0 (mismo codec) | openjpeg-wasm | PENDIENTE |
| P5 | JPEG-LS Near-Lossless | 1.2.840.10008.1.2.4.81 | +<1% | 0 (mismo codec) | charls-wasm | PENDIENTE |
| P6 | HT-JPEG 2000 | 1.2.840.10008.1.2.4.201 | +<0.5% | Alto | openjpeg-wasm v2+ | BACKLOG |
| N/A | MPEG/H.264 video | 1.2.840.10008.1.2.4.100+ | — | Alto | MediaSource API | FUERA DE SCOPE |
| N/A | JPEG Extended 12-bit | 1.2.840.10008.1.2.4.51 | — | Alto | libjpeg-turbo-wasm | BACKLOG |

### 7.2 Fixes de photometric y color space (sin nuevas librerías)

Estos bugs están en el viewer actual y aplican a imágenes uncompressed ya soportadas:

| Fix | Descripción | Impacto | Esfuerzo |
|-----|-------------|---------|----------|
| MONOCHROME1 | Invertir escala para DX/CR/MG | Alto (Rx de tórax, mamografía) | Muy bajo (1 línea) |
| samplesPerPixel=3 RGB | Renderizar US, SC con 3 canales | Alto (US clips) | Bajo |
| YBR_FULL → RGB | Convertir espacio de color para US | Medio | Bajo |
| JPEG Baseline US | Extraer fragment + Image() | Medio | Bajo |
| Enhanced MF | Cargar frames desde un solo archivo | Alto (CT modernos) | Alto |
| Pixel Padding Value | Excluir del auto-windowing | Bajo | Muy bajo |

### 7.3 Recomendación final de implementación por sprint

**Sprint A (1-2 días) — Sin nuevas dependencias:**
1. Fix MONOCHROME1 (invertir escala)
2. Fix samplesPerPixel=3 → renderizar RGB
3. Fix YBR_FULL → conversión de color
4. JPEG Baseline via Image() para US/SC
5. Mostrar TS UID en el mensaje "formato no soportado" (debug)

**Sprint B (3-5 días) — Agregar charls-wasm:**
1. Instalar `@cornerstonejs/codec-charls`
2. Lazy load del WASM
3. Integrar en el pipeline de parseDicomFile
4. Testing con archivos CR, DX, MG reales

**Sprint C (2-3 días) — Agregar openjpeg-wasm:**
1. Instalar `@cornerstonejs/codec-openjpeg`
2. Lazy load del WASM
3. Integrar en el pipeline
4. Testing con CT, MR modernos

**Sprint D (3-5 días) — Enhanced Multi-frame:**
1. Detectar Enhanced MF por SOP Class UID
2. Parsear PerFrameFunctionalGroupsSequence para orden correcto
3. Extraer frames individuales por índice
4. Carga progresiva (no cargar los 300 frames de golpe)
5. Solo si hay demanda real de CT multi-frame en la plataforma

---

## 8. Appendix: Gaps del DicomViewer Actual

Análisis del código en `apps/web-patient/src/components/DicomViewer.tsx`:

### 8.1 Bugs críticos (afectan imágenes ya soportadas)

**A. `MONOCHROME1` no se maneja (línea 218-222):**
```typescript
// Actual — incorrecto para CR/DX/MG:
let v = ((data[i] - lower) / range) * 255;
v = v < 0 ? 0 : v > 255 ? 255 : v;

// Fix:
const photometric = dcmStr(ds, 'x00280004'); // leer en parseDicomFile
// En renderCanvas, agregar parámetro isMonochrome1:
let v = ((data[i] - lower) / range) * 255;
if (isMonochrome1) v = 255 - v;
```

**B. `samplesPerPixel !== 1` descarta imágenes US/SC (línea 98):**
```typescript
// Actual — rechaza todo lo que no es grayscale:
if (rows === 0 || cols === 0 || samplesPerPixel !== 1) return null;

// Fix — manejar RGB por separado:
if (rows === 0 || cols === 0) return null;
if (samplesPerPixel === 3) {
  // Pipeline RGB separado
}
```

**C. Pixel Data de element length `0xFFFFFFFF` (línea 101):**
```typescript
// Actual — rechaza encapsulated pixel data:
if (!el || el.length === 0xFFFFFFFF) return null;

// Fix: ese check era para descartar comprimidos, está bien para ahora,
// pero con los nuevos decoders habrá que eliminar ese return null
```

**D. No lee `Pixel Padding Value` (0028,0120):**
El auto-windowing puede incluir el padding value (típicamente 0 o -2000 en CT) como parte del rango, resultando en ventanas incorrectas. El fix:
```typescript
const pixelPaddingValue = ds.uint16('x00280120');
// Excluir del cálculo de min/max
let pMin = Infinity, pMax = -Infinity;
for (let i = 0; i < ref.data.length; i++) {
  if (pixelPaddingValue !== undefined && ref.data[i] === pixelPaddingValue) continue;
  // ...
}
```

### 8.2 Limitaciones arquitecturales

**E. Carga de serie: Promise.all sin throttling:**
Para series de 200+ CT slices, `Promise.all` lanza 200 requests simultáneos a Supabase Storage → throttling o rate limit. Recomendación: agrupar en batches de 10-20.

**F. No hay cache de pixel data decodificado:**
Cada vez que el usuario navega a un frame ya visto, se vuelve a calcular desde `framesRef.current`. Para JPEG-LS con WASM, el decode es costoso. Cache con `Map<frameIndex, Float32Array>` mejoraría el performance de playback.

**G. No hay touch/gesture support:**
Para mobile (pinch-to-zoom, swipe para navegar frames). Fuera del scope de esta investigación pero crítico para la app.

### 8.3 Consideraciones de seguridad

El componente carga archivos desde URLs firmadas de Supabase Storage con TTL 3600s — OK.
Los archivos DICOM pueden tener PII embebida en el header. El componente solo lee tags específicos, pero si en el futuro se muestra el header completo al usuario, verificar que no se expongan PHI de otros pacientes (en caso de archivos compartidos por QR).

---

## Referencias del Estándar DICOM

- **DICOM PS3.5** — Data Structures and Encoding (Transfer Syntax, pixel data encoding)
- **DICOM PS3.3** — Information Object Definitions (SOP Classes, Attributes)
- **DICOM PS3.6** — Data Dictionary (UID Registry, incluye Transfer Syntax UIDs)
- **DICOM PS3.4** — Service Class Specifications
- **ISO 14495-1** — JPEG-LS standard
- **ISO 15444-1** — JPEG 2000 standard

Todos los UIDs listados en este documento pertenecen al espacio de nombres `1.2.840.10008` administrado por NEMA (National Electrical Manufacturers Association) y están definidos en PS3.6 Annex A (Transfer Syntaxes) y PS3.6 Annex B (Media Storage SOPs).
