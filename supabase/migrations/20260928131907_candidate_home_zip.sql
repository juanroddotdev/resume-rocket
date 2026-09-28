-- Candidate home ZIP for identity (preview + DOCX header).
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS home_zip TEXT;

COMMENT ON COLUMN candidates.home_zip IS 'Candidate home ZIP / postal code from parse or wizard';
