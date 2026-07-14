-- Professional Snapshot lines for July 2026 contract template (Phase 2)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS professional_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN candidates.professional_snapshot IS
  'Approved Professional Snapshot lines for DOCX: { snapshot_*: { value, included, source?, sourceSnippet? } }';
