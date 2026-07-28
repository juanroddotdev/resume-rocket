-- Admin-entered identity on invite for draft candidate + intake prefill
ALTER TABLE intake_invites
  ADD COLUMN IF NOT EXISTS candidate_first_name TEXT,
  ADD COLUMN IF NOT EXISTS candidate_last_name TEXT;
