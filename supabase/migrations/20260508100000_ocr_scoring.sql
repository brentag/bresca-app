-- OCR confidence scoring — two-pass (DeepSeek + Mistral Pixtral)
-- study_drafts: score del primer y segundo pass, flag de revisión manual
-- studies: score persistido al confirmar el draft

ALTER TABLE public.study_drafts
  ADD COLUMN IF NOT EXISTS ocr_score    numeric  CHECK (ocr_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ocr_pass     int      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS needs_review boolean  NOT NULL DEFAULT false;

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS ocr_score    numeric  CHECK (ocr_score BETWEEN 0 AND 100);
