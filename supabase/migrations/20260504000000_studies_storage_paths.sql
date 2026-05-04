-- ============================================================
-- Bresca — Multi-página en estudios
-- Agrega storage_paths text[] a studies para soportar múltiples
-- imágenes/páginas por estudio. Retrocompatible: backfill desde
-- storage_path existente.
-- ============================================================

ALTER TABLE studies
  ADD COLUMN storage_paths text[] NOT NULL DEFAULT '{}';

-- Backfill: migrar storage_path existente al array
UPDATE studies
  SET storage_paths = ARRAY[storage_path]
  WHERE storage_path IS NOT NULL;

-- Índice para consultas sobre el array (útil para búsqueda por path)
CREATE INDEX idx_studies_storage_paths ON studies USING GIN (storage_paths);
