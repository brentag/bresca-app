-- ── BUCKET: studies ─────────────────────────────────────────
-- Archivos privados. Path: {user_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studies',
  'studies',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Solo el dueño puede subir/leer/borrar sus archivos
CREATE POLICY "studies_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studies'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "studies_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'studies'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "studies_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'studies'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
