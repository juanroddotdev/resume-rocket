-- Phase B: VMS expansion — candidate scalar columns + education JSONB
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS years_nursing_experience TEXT,
  ADD COLUMN IF NOT EXISTS compact_license_status TEXT,
  ADD COLUMN IF NOT EXISTS average_patient_ratios TEXT,
  ADD COLUMN IF NOT EXISTS specialized_medical_equipment TEXT,
  ADD COLUMN IF NOT EXISTS education JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN candidates.years_nursing_experience IS 'VMS total_years_nursing_experience';
COMMENT ON COLUMN candidates.compact_license_status IS 'VMS compact_license_status (Yes/No/N/A)';
COMMENT ON COLUMN candidates.average_patient_ratios IS 'VMS average_patient_ratios';
COMMENT ON COLUMN candidates.specialized_medical_equipment IS 'VMS specialized_medical_equipment';
COMMENT ON COLUMN candidates.education IS 'VMS education loop: [{ degree, school, graduationYear }]';
