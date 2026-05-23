-- Resume Rocket initial schema
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE candidate_status AS ENUM ('draft', 'submitted', 'confirmed', 'archived');

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX hospitals_name_trgm ON hospitals USING gin (name gin_trgm_ops);

CREATE TABLE intake_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX intake_invites_token_idx ON intake_invites (token);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_invite_id UUID NOT NULL REFERENCES intake_invites(id) ON DELETE CASCADE,
  status candidate_status NOT NULL DEFAULT 'draft',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_state TEXT,
  specialties TEXT[],
  credentials JSONB DEFAULT '{}'::jsonb,
  parsed_resume JSONB,
  employers JSONB DEFAULT '[]'::jsonb,
  preferred_hospital_id UUID REFERENCES hospitals(id),
  access_token TEXT UNIQUE,
  resume_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX candidates_invite_idx ON candidates (intake_invite_id);
CREATE INDEX candidates_access_token_idx ON candidates (access_token);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY hospitals_read_authenticated ON hospitals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY hospitals_read_anon ON hospitals
  FOR SELECT TO anon USING (true);

CREATE POLICY intake_invites_service ON intake_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY candidates_service ON candidates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospitals (name, city, state) VALUES
  ('Mayo Clinic', 'Rochester', 'MN'),
  ('Cleveland Clinic', 'Cleveland', 'OH'),
  ('Johns Hopkins Hospital', 'Baltimore', 'MD'),
  ('Mass General Hospital', 'Boston', 'MA'),
  ('UCSF Medical Center', 'San Francisco', 'CA'),
  ('Stanford Health Care', 'Stanford', 'CA'),
  ('NYU Langone', 'New York', 'NY'),
  ('Mount Sinai Hospital', 'New York', 'NY'),
  ('Cedars-Sinai', 'Los Angeles', 'CA'),
  ('Houston Methodist', 'Houston', 'TX'),
  ('Duke University Hospital', 'Durham', 'NC'),
  ('Northwestern Memorial', 'Chicago', 'IL'),
  ('UCLA Medical Center', 'Los Angeles', 'CA'),
  ('Vanderbilt University Medical Center', 'Nashville', 'TN'),
  ('Emory University Hospital', 'Atlanta', 'GA');
