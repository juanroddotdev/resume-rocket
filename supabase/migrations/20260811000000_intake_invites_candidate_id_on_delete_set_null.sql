-- Allow deleting a candidate without first nulling intake_invites.candidate_id.
-- (Circular FK: candidates.intake_invite_id → invites, invites.candidate_id → candidates)
ALTER TABLE intake_invites
  DROP CONSTRAINT IF EXISTS intake_invites_candidate_id_fkey;

ALTER TABLE intake_invites
  ADD CONSTRAINT intake_invites_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL;
