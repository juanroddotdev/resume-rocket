-- Stable keys for hospital seed imports (CMS Facility ID, optional HIFLD ID)
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS hospital_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS hospitals_source_id_unique
  ON hospitals (source_id)
  WHERE source_id IS NOT NULL;
