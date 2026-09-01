-- Optional RN prefix on professional experience headings (packet-level; default off).
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS include_rn_experience_prefix BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN candidates.include_rn_experience_prefix IS
  'When true, DOCX job titles prefix RN if the role has no credential. Default false.';
