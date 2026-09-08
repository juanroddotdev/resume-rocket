# Admin Settings plan

This plan captures a safe, phased path for adding an Admin Settings area that lets the client control operational defaults without developer intervention.

## Goal

Ship a self-serve admin settings experience for integrations, packet defaults, branding, lookup templates, and system diagnostics while preserving the current security and PHI handling guarantees.

## Scope guard

- Settings are app-wide in v1. Multi-tenant organization settings remain deferred.
- Admin-only access uses the existing Supabase session and server API pattern.
- Runtime secrets stay server-only. Raw API keys are never exposed to the browser.
- Settings should not silently weaken the intake, parse, or DOCX contracts.
- Existing candidate packets and invite links should keep their stored values; settings apply to new operations unless explicitly designed otherwise.

## Recommended first version

### Include in v1

- Default candidate link expiration.
- Allowed upload file types and maximum upload size.
- Company name, primary color, logo, and candidate-facing disclaimer/footer copy.
- Gemini and Resend configuration status.
- Gemini connection test.
- Parse usage summary for the current month.
- Facility and license lookup URL templates with validated placeholders.
- Whitelisted Gemini model selector.
- Optional additional parsing instructions appended inside the controlled server prompt.

### Defer until there is a stronger need

- Raw prompt replacement.
- Temperature and confidence sliders.
- Candidate self-serve account settings.
- Organization/team sharing.
- Cache flush buttons unless the app has a real cache/temp object lifecycle to manage.
- API key editing in the browser unless encrypted-at-rest secret storage is added.

## Security model

### Secrets

The safest v1 is status-only secret management:

- `GEMINI_API_KEY`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` remain in server runtime config.
- The settings UI shows configured/missing status only.
- Test-connection endpoints return success/failure without returning provider responses that could expose sensitive data.

If self-service Gemini key rotation becomes a requirement, add it as a separate PR:

- Add an app-level encryption key such as `SETTINGS_ENCRYPTION_KEY` to private runtime config.
- Store only encrypted key material plus metadata such as `last4` and `updated_at`.
- Return only masked key metadata to the browser.
- Never log submitted keys or provider request payloads.

### PHI

- Do not include candidate email, phone, license number, resume text, or parsed resume blobs in settings diagnostics.
- Lookup templates must use an allowlist of safe placeholders.
- Avoid query templates that include contact data or freeform resume excerpts.

## Data model

Create a new Supabase migration for a singleton settings table, for example `app_settings`.

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer or boolean singleton key | Enforce one app-wide row |
| `default_invite_expiration_days` | integer | Example range: 1-30 |
| `allowed_upload_mime_types` | text[] | Restrict to supported server parsers |
| `max_upload_bytes` | integer | Server remains authoritative |
| `company_name` | text | Candidate-facing branding |
| `brand_primary_color` | text | Validate hex color |
| `logo_storage_path` | text | Optional Supabase storage path |
| `packet_disclaimer` | text | Candidate-facing footer/privacy copy |
| `facility_search_template` | text | Validated HTTPS URL template |
| `license_lookup_template` | text | Validated HTTPS URL template |
| `gemini_model` | text | Must be in the server allowlist |
| `gemini_extra_instructions` | text | Length-limited prompt appendix |
| `updated_by` | uuid | References `auth.users(id)` when available |
| `created_at` / `updated_at` | timestamptz | Use the existing updated-at pattern |

Enable RLS on the table. Prefer service-role access through server routes, matching the existing admin API pattern.

## Server API plan

Add a settings utility:

- `server/utils/adminSettings.ts`
  - provides default settings
  - reads and validates DB settings
  - merges missing fields with defaults
  - serializes only safe fields for the client

Add admin routes:

- `GET /api/admin/settings`
  - returns safe settings and integration status
- `PATCH /api/admin/settings`
  - validates partial updates with Zod
  - records `updated_by`
- `POST /api/admin/settings/test-gemini`
  - performs a lightweight server-side connection test
  - returns a simple status result
- `GET /api/admin/settings/system-health`
  - returns safe health and usage metrics
- `POST /api/admin/settings/logo`
  - validates image type/size
  - stores or replaces the branding logo

Keep all routes behind `requireAdminSession`.

## UI plan

Add a Settings view to the admin area. Either add a dedicated `/admin/settings` page or extend the existing admin hub view state. Keep the first pass simple and reusable.

Recommended tabs:

1. **Integrations**
   - Gemini configured/missing badge.
   - Resend configured/missing badge.
   - Test Gemini connection button.
   - Gemini model selector.
   - Additional parsing instructions textarea.

2. **Packet Defaults**
   - Default invite expiration dropdown.
   - Upload file type toggles.
   - Maximum upload size selector.
   - Manual review/auto-approve toggle only if the workflow is fully wired.

3. **Branding**
   - Company name.
   - Logo upload.
   - Primary color picker.
   - Candidate-facing disclaimer/footer text.

4. **Lookup Templates**
   - Facility verification template.
   - License lookup template.
   - Placeholder helper text and validation errors.

5. **System**
   - Parse count this month.
   - Recent parse success/failure summary.
   - Integration health checks.
   - Reset settings to defaults.

Every section needs visible loading, error, saved, and empty/default states.

## Integration plan

### Packet defaults

Current hardcoded areas to wire:

- `components/admin/NewCandidatePacketModal.vue`
  - replace hardcoded `expires_in_days: 7` with loaded defaults or omit the field so the server default applies.
  - reflect allowed upload types and max size in the file input helper copy.
- `server/api/invites.post.ts`
  - use settings default when `expires_in_days` is omitted.
- `server/api/parse.post.ts`
  - replace hardcoded upload limit with settings-backed validation.
  - keep MIME validation on the server.

### AI settings

- Keep `server/utils/geminiShared.ts` as the canonical Gemini configuration boundary.
- Restrict model choices to the existing `GEMINI_MODELS` allowlist or a small server-owned preset map.
- Append `gemini_extra_instructions` to the existing controlled prompt instead of replacing the prompt.
- Keep graceful degradation when Gemini is missing or unavailable.

### Lookup templates

- Update `utils/facilityGoogleSearch.ts` to support settings-backed templates.
- Validate placeholders before save.
- Encode values when generating URLs.
- Do not support PHI-heavy placeholders.

### Branding

- Apply company name, primary color, logo, and disclaimer to candidate-facing intake and completion screens first.
- Use CSS variables or inline styles for runtime color rather than rebuilding Tailwind.
- Add DOCX template branding only after the template tag/data-source plan is clear.

### Diagnostics

- Count parse usage from existing candidate/parse outcome data.
- Return aggregate counts only.
- Do not return raw `parsed_resume`, resume text, invite tokens, or provider payloads.

## Suggested PR split

1. **Settings schema and admin API**
   - Migration, settings utility, GET/PATCH routes, Zod validation, serialization tests.

2. **Admin Settings UI**
   - Tabs, forms, save states, validation, integration status display.

3. **Packet defaults integration**
   - Invite expiration, upload MIME types, upload size limits.

4. **Branding integration**
   - Candidate-facing branding and logo upload.

5. **AI controls**
   - Model selector, additional instructions, Gemini connection test.

6. **Lookup templates and diagnostics**
   - Facility/license template support and safe system metrics.

## Test plan

Automated checks:

- Settings schema validation tests.
- Settings serialization test proving raw secrets are not returned.
- Admin API authorization tests.
- Invite default expiration test.
- Parse upload size/type validation tests.
- Gemini model allowlist tests.
- Prompt appendix length and merge tests.
- Lookup placeholder validation and URL generation tests.
- Branding value validation tests.
- `npm run test`.
- `npm run build`.

Manual checks:

- Admin sign-in opens Settings.
- Save each tab and reload to confirm persistence.
- Create a new invite and confirm default expiration is applied.
- Upload valid and invalid resume files.
- Confirm candidate-facing branding appears on intake screens.
- Test Gemini status with configured and missing keys.
- Confirm parse still falls back gracefully when Gemini is missing.
- Generate a DOCX after settings changes.
- Verify no `.env`, secrets, invite tokens, or PHI appear in diffs or logs.

## Open product decisions

- Should admins be allowed to rotate Gemini keys from the UI, or should v1 remain status-only?
- Should settings be app-wide forever, or will agencies/users need separate settings later?
- Should branding apply to DOCX output immediately, or only after a future template change?
- Should "auto-approve parsed data" exist before there is a clear recruiter review queue state?
- Which license boards should have first-class presets versus freeform URL templates?
