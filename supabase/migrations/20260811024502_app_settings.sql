CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_invite_expiration_days INTEGER NOT NULL DEFAULT 7 CHECK (
    default_invite_expiration_days BETWEEN 1 AND 30
  ),
  allowed_upload_mime_types TEXT[] NOT NULL DEFAULT ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  max_upload_bytes INTEGER NOT NULL DEFAULT 10485760 CHECK (
    max_upload_bytes BETWEEN 1048576 AND 26214400
  ),
  company_name TEXT NOT NULL DEFAULT 'Resume Rocket',
  brand_primary_color TEXT NOT NULL DEFAULT '#1f1a40' CHECK (
    brand_primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  logo_storage_path TEXT,
  packet_disclaimer TEXT NOT NULL DEFAULT 'Candidate packets contain confidential healthcare staffing information. Share only with authorized placement teams.',
  facility_search_template TEXT NOT NULL DEFAULT 'https://www.google.com/search?q={facilityName}+{city}+{state}+trauma+level+total+beds+teaching+hospital+Magnet+EMR',
  license_lookup_template TEXT NOT NULL DEFAULT '',
  gemini_model TEXT NOT NULL DEFAULT 'gemini-3.5-flash',
  gemini_extra_instructions TEXT NOT NULL DEFAULT '' CHECK (
    char_length(gemini_extra_instructions) <= 2000
  ),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_service ON app_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
