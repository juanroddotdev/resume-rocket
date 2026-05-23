-- Align schema with MVP plan fields
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS beds INT,
  ADD COLUMN IF NOT EXISTS trauma_level TEXT,
  ADD COLUMN IF NOT EXISTS teaching_status BOOLEAN DEFAULT false;

ALTER TABLE intake_invites
  ADD COLUMN IF NOT EXISTS candidate_email TEXT,
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS emr_system TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parse_error TEXT,
  ADD COLUMN IF NOT EXISTS resume_original_filename TEXT;

UPDATE hospitals SET beds = 500, trauma_level = 'I', teaching_status = true WHERE name = 'Mayo Clinic';
UPDATE hospitals SET beds = 1200, trauma_level = 'I', teaching_status = true WHERE name = 'Cleveland Clinic';
UPDATE hospitals SET beds = 1000, trauma_level = 'I', teaching_status = true WHERE name = 'Johns Hopkins Hospital';
