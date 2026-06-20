-- Home address for candidate identity (VMS backlog FR-009)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS home_state TEXT;

COMMENT ON COLUMN candidates.home_address IS 'Candidate home street address from resume or wizard';
COMMENT ON COLUMN candidates.home_city IS 'Candidate home city from parse or wizard';
COMMENT ON COLUMN candidates.home_state IS 'Candidate home state from parse or wizard';
