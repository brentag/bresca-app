-- Agregar application/dicom y application/octet-stream al bucket studies.
-- application/octet-stream cubre archivos DICOM que el browser reporta sin MIME reconocido.
-- La validación real de contenido ocurre en la Edge Function (magic bytes).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/dicom',
  'application/octet-stream'
]
WHERE id = 'studies';
