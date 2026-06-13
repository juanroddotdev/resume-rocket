-- Multi-license rows stored as JSONB (Track A intake polish)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb;
