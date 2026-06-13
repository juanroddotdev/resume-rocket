# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Doc index:** [README.md](./README.md) · **VMS status:** [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) (expansion complete)

**Related:** [MVP-PLAN.md](./MVP-PLAN.md) (historical spec) · [VMS-FIELD-MANIFEST.md](./VMS-FIELD-MANIFEST.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) · [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) · **Archived plans:** [archive/](./archive/)

**Quick nav:** [What's next](#whats-next) · [Done recently](#done-recently) · [Test automation plan](#test-automation-plan) · [Candidate intake UX](#candidate-intake-ux) · [Recruiter admin UX](#recruiter-admin-ux) · [Parse audit](#parse-audit--regression) · [Hospital parse](#hospital-parse-ux) · [Files & exports](#files--exports)

One concern per PR when implementing. Check items off when merged (optionally add PR number inline).

---

## What's next

Prioritized remaining work (updated 2026-06-09). VMS template + wizard core is **done**; focus shifts to **test automation**, release smoke, Step 4 preview, and admin polish.

| Priority | Track | Open items |
| --- | --- | --- |
| **0** | Release | One manual happy-path smoke on target env; sign off [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) |
| **1** | Test automation | Phased plan below — script/API coverage first, E2E last; closes [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) |
| **A** | Intake polish | Ratio copy disambiguation, optional validity icons; several Step 1 polish items already shipped |
| **B** | Step 4 | Document preview + admin per-employment layout (eventual — not built yet) |
| **C** | Admin hub | Open intake from table, invite success banner |
| **D** | Optional | Unit `MetricTile`s, EMR Other validation, storage upload filenames |
| **Defer** | — | Multi-license `licenses[]`, `pg_trgm` tuning (prod-only), parse debug UI (Phase C) |

---

## Done recently

- [x] Hybrid hospital seed (CMS + ArcGIS) → Supabase — `scripts/seed_hospitals.py`, [HOSPITAL-DATA.md](./HOSPITAL-DATA.md)
- [x] Remove legacy demo `hospitals` rows (`source_id IS NULL`)
- [x] Smoke: facility search + seeded data
- [x] **Parse audit Phase A** — `source_snippet`, `identified_facilities_raw` in [`geminiShared.ts`](../server/utils/geminiShared.ts); audit stripped from client ([`parseResponse.test.mjs`](../tests/parseResponse.test.mjs)); persisted under `parsed_resume.audit` in [`parse.post.ts`](../server/api/parse.post.ts)
- [x] **DOCX download filenames** — `Last_First_VMS-Resume.docx` via [`resumeDownloadFilename.ts`](../utils/resumeDownloadFilename.ts) on intake, admin, and email-link paths ([`generate-docx.post.ts`](../server/api/generate-docx.post.ts))
- [x] **Intake draft/resume flow doc** — [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md)
- [x] **Restore parse/DB highlights on draft resume** (#60) — `prefillHighlights` in localStorage + `restoreDbMetricsFromEmployers()` on bootstrap
- [x] **June 7–9 intake polish batch** — 22 PRs; see [archive/RELEASE-CHECKLIST-2026-06-07-09.md](./archive/RELEASE-CHECKLIST-2026-06-07-09.md)

---

## Test automation plan

**Goal:** Automate most of [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) and [`MANUAL-TEST-CHECKLIST.md`](./MANUAL-TEST-CHECKLIST.md) so pre-release work is `npm run test` + a short manual pass, not a full browser checklist every time.

**Issue:** Part of epic [#16](https://github.com/juanroddotdev/resume-rocket/issues/16); targets [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) (automated regression tests).

### Today (automated in CI)

| Layer | What runs | Covers |
| --- | --- | --- |
| **Unit** | `tests/*.test.mjs` (13 files) | docxBuilder, parse response/audit strip, rate limit, gap-review utils, invite token header, EMR, highlights, wizard step URL |
| **Script smoke** | `test-normalize-candidate.mjs`, `test-docx-mapping.mjs`, `test-gemini-parse-map.mjs` | JSONB normalization, full template fixture → DOCX bytes, Gemini JSON → API field map |
| **Build** | `npm run build` | Nuxt compiles |

**Gap:** No browser E2E, no live Supabase/Gemini in CI, no fixture PDF parse regression, no API integration chain (invite → parse → PATCH → DOCX). Release checklist happy path + failure UX is still **manual**.

### What should stay manual (even after automation)

- Open downloaded DOCX in Word and eyeball layout after **template.docx** edits
- Resend confirmation email in a real inbox (optional integration)
- Production config sanity (`NUXT_PUBLIC_SITE_URL`, correct Supabase project, seeded hospitals in prod)
- Subjective Gemini parse quality on new resume samples (tuning, not regression)

---

### Phase 1 — Expand script + unit coverage (no secrets, every PR)

Lowest cost; run entirely in GitHub Actions today. One concern per PR.

- [x] **`inventory-template-tags.mjs` in CI** — fail if contract tags missing from `docxBuilder`; add to `npm run test` or CI step
- [ ] **Fixture PDF regression (offline)** — synthetic PDFs in `tests/fixtures/` (no real PHI); extract text via `extractText`; optional **recorded Gemini JSON** fixtures so CI never calls the API; assert audit `source_snippet` overlaps extracted text; multi-employer fixture asserts `identified_facilities_raw` (extends [Parse audit Phase B](#backlog--phase-b-regression-scripts))
- [ ] **`vmsGapReview` contract tests** — required-field list matches [`VMS-FIELD-MANIFEST.md`](./VMS-FIELD-MANIFEST.md) Required rows; `goToField` step/id pairs stable
- [ ] **Parse route unit tests (mocked)** — `parse.post` handler with stubbed Supabase/Gemini/storage: MIME rejection, invite missing → 401, rate limit → 429, `partial_parse` / `document_scan` flags, audit stripped from client body
- [ ] **DOCX content assertions** — unzip generated buffer in `test-docx-mapping.mjs`; spot-check key tags present in `word/document.xml` (not just “non-empty buffer”)
- [x] **`npm run test:release` script** — single entry: unit + all script smokes + inventory; document in RELEASE-CHECKLIST “Automated” section

**Done when:** CI catches template/docx/gap-review/parse-contract regressions without a browser.

---

### Phase 2 — API integration tests (Supabase test project)

Hit real Nitro handlers against a **dedicated test Supabase project** (GitHub Actions secrets) or local `supabase start` in CI. No browser.

- [ ] **Test env + CI secrets** — `SUPABASE_*`, service role, optional `GEMINI_API_KEY` gated job; document in `.env.example` as test-only
- [ ] **Invite chain** — `POST /api/invites` (admin auth) → `GET /api/invites/validate` → create candidate → `PATCH` wizard payload → `POST /api/generate-docx` → assert 200 + DOCX content-type
- [ ] **Invite gating** — candidate routes without `x-intake-token` → 401; wrong token → 403
- [ ] **Parse integration (optional Gemini job)** — upload small fixture PDF with real key; separate workflow `workflow_dispatch` or nightly to avoid cost/flake on every PR
- [ ] **Hospital search smoke** — `GET /api/hospitals/search?q=…` returns rows when test DB seeded (minimal fixture hospitals or seed subset)

**Maps to release checklist:** Happy path API portions; VMS docx-mapping rows; security invite scope.

**Done when:** One integration test proves intake data round-trips to DOCX without manual upload UI.

---

### Phase 3 — Browser E2E (Playwright)

Automate the **browser** sections of RELEASE-CHECKLIST. Heavier maintenance — add after Phase 1–2 stabilize contracts.

- [ ] **Playwright setup** — `@playwright/test`, config against `npm run preview` or staging URL; store admin auth in setup project
- [ ] **Smoke: intake happy path** — open invite URL → dev prefill or fixture upload → Steps 1–4 → gap review clear → download triggered (assert response / filename)
- [ ] **Smoke: failure paths** — invalid token message; parse error shows **Continue manually**; Step 2 blocks with zero employers
- [ ] **Smoke: admin** — sign in → create invite → candidate row appears after intake completes
- [ ] **CI strategy** — run E2E on `main` + nightly, or on PRs with `e2e` label, to limit flake/time

**Maps to release checklist:** Most “Happy path” and “Failure paths” browser bullets.

**Done when:** Routine releases skip manual wizard click-through unless template or major UI changed.

---

### Phase 4 — Release docs + shrinking manual scope

- [ ] **RELEASE-CHECKLIST matrix** — tag each row Automated (CI) / Manual / Optional; link to test file or spec name
- [ ] **MANUAL-TEST-CHECKLIST trim** — move covered items to “verify only on template/UI releases”
- [ ] **Pre-deploy GitHub Action (optional)** — workflow on release tag: `test:release` + integration + E2E against staging

---

### Suggested PR sequence

| PR | Scope | Closes / links |
| --- | --- | --- |
| 1 | Inventory script in CI + `test:release` npm script | Part of #14 |
| 2 | Fixture PDF + recorded parse JSON regression | Parse audit Phase B |
| 3 | Parse route mocked unit tests + vmsGapReview tests | Part of #14 |
| 4 | DOCX XML content assertions | Part of #14 |
| 5 | Supabase integration test project + invite → DOCX chain | Part of #14 |
| 6 | Playwright happy-path smoke | Part of #14 |
| 7 | Playwright failure paths + RELEASE-CHECKLIST matrix | Part of #14, #15 |

---

## Candidate intake UX

### Done

#### Upload & parse (Step 0)

- [x] **Parse progress animation** — spinner/pulse on drop zone; staged labels: upload → extract text → AI scan → saving ([`FileDropZone.vue`](../components/intake/FileDropZone.vue))
- [x] **Timed stage copy** — rotate/hold messages on long waits; align with `document_scan` / `partial_parse` when known
- [x] **Disable drop zone while parsing** — no second upload mid-request; keep **Continue manually** on error ([empty-error-states](../.cursor/rules/empty-error-states.mdc))
- [x] **`prefers-reduced-motion`** — static “Working…” instead of animation when user prefers reduced motion

#### Parse clarity (Steps 1–3)

- [x] **`document_scan` notice** on Step 1 — e.g. “We scanned your PDF visually”
- [x] **`partial_parse` banner** on Steps 1–3 — “Some fields used basic detection — please review”
- [x] **Persist `partial_parse` / `document_scan` in form state** on refresh mid-wizard

#### Wizard navigation & validation

- [x] **Step indicator** — “Step 2 of 5: Employment” or progress dots ([`pages/intake/[token].vue`](../pages/intake/[token].vue))
- [x] **Visible field labels on Step 1** — not placeholders only; accessibility + mobile clarity
- [x] **Block Next on Step 2** when `employers.length === 0` with inline message
- [x] **Block or warn Next on Step 3** for obvious gaps (license state/number when required by gap review)

#### Employment & facilities (Step 2)

- [x] **Reorder employer cards** — Move up / Move down on [`EmployerCard.vue`](../components/intake/EmployerCard.vue); order = [`docxBuilder`](../server/utils/docxBuilder.ts) `{#professional_experiences}`; autosave via PATCH
- [x] **Show linked facility metrics** — read-only chips: beds, trauma, teaching when `hospitalId` set
- [x] **Soft link-facility reminder** when `!hospitalId` — non-blocking; see [archive/HOSPITAL-PARSE-UX-PLAN.md](./archive/HOSPITAL-PARSE-UX-PLAN.md)
- [x] **Stronger empty employer CTA** — “Add at least one hospital where you worked”
- [x] **Compact form labels** — role, start/end, employment type, scope, acuity, highlights; optional unit fields when expanded
- [x] **MetricTile on linked facility row** — Hospital beds / Trauma level / Teaching hospital
- [x] **Stacked employer card deck** — single-open accordion (#47); [archive/EMPLOYER-CARD-DECK-PLAN.md](./archive/EMPLOYER-CARD-DECK-PLAN.md)

#### Draft & recovery

- [x] **Draft restored banner** — when `restoreLocal()` loads wizard from localStorage
- [x] **Replace resume confirmation** — warn before re-upload on Step 0 if wizard already has data
- [x] **Show save chip on Step 0** — “Saved” / “Saving…” once `candidateId` + autosave active

#### Review & finish (Steps 4–success)

- [x] **Download again** on success step — if browser blocked download or tab closed
- [x] **Submit loading copy** — “Preparing your packet…” + disabled button during `finalizeAndDownload`
- [x] **One-line success context** — what “VMS-ready” means / what recruiter receives
- [x] **Focus first missing field** — gap review `go-to-step` scroll/focus first empty input

#### Forms & accessibility

- [x] **`autocomplete` on identity fields** — `given-name`, `family-name`, `email`, `tel` on Step 1
- [x] **Basic phone format hint** — optional pattern or helper text

#### Shared UI & labeling

- [x] **Shared intake field styles** — `.field`, `.field-label`, `.field-label-compact` + focus rings in [`assets/css/main.css`](../assets/css/main.css)
- [x] **Autofill background override** — `-webkit-autofill` inset box-shadow on `.field` (intake + admin sign-in)
- [x] **`MetricTile` component** — [`MetricTile.vue`](../components/intake/MetricTile.vue); linked facility row in [`EmployerCard.vue`](../components/intake/EmployerCard.vue)
- [x] **Placeholder-only audit** — visible labels on Step 1, [`ClinicalSummaryFields.vue`](../components/intake/ClinicalSummaryFields.vue), license block, [`EmployerCard.vue`](../components/intake/EmployerCard.vue), [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue) (placeholders = hints only)
- [x] **Unit beds vs hospital beds** — **Unit beds** on employer optional details; **Hospital beds** on linked-facility `MetricTile`s

#### Prefill, database data & manual entry (Steps 1–3)

- [x] **Parse → wizard prefill** + [`ParseNoticeBanner.vue`](../components/intake/ParseNoticeBanner.vue) on Steps 1–3
- [x] **Facility search + in-card linking** — [`HospitalAutocomplete.vue`](../components/intake/HospitalAutocomplete.vue), parse **Suggested matches**, **Search to link facility**
- [x] **Subtle highlight — parse-prefilled fields (in-session)** — [`useIntakePrefillHighlight.ts`](../composables/useIntakePrefillHighlight.ts), `.field-prefilled`, wired on identity, employment, education, credentials; clears on edit
- [x] **Subtle highlight — hospital DB metrics (in-session)** — `MetricTile` `from-database` / `.metric-tile-db-sourced`; `markEmployerDbMetrics()` on link
- [x] **Manual hospital entry (not in CSV)** — **+ Add hospital manually** in [`HospitalAutocomplete.vue`](../components/intake/HospitalAutocomplete.vue)
- [x] **Editable employer / hospital name** — editable when unlinked; linked name DB-sourced with **Change facility**
- [x] **EMR “Other” → custom platform** — companion text input; persists via [`emrSystem.ts`](../utils/emrSystem.ts) → `emr_system` / DOCX
- [x] **Education row labels** — degree / school / graduation year on [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue); parse highlight on row fields

#### Step 1 — visual polish (partial)

- [x] **Focus rings on all `.field` inputs** — via shared intake field styles
- [x] **Replace resume entry point** — outline button on Step 1 (re-upload confirm in [`FileDropZone`](../components/intake/FileDropZone.vue))
- [x] **Inline save indicator** — [`IntakeSaveStatus.vue`](../components/intake/IntakeSaveStatus.vue)
- [x] **Wizard footer separation** + **Parse notice banner polish** — steps 1–3 footers; [`ParseNoticeBanner.vue`](../components/intake/ParseNoticeBanner.vue)
- [x] **Restore parse/DB highlights on draft resume** (#60)

---

### Backlog

#### Shared UI & labeling (remaining)

Two patterns — don’t mix them on the same control:

| Pattern | Use for | Example |
| --- | --- | --- |
| **Form labels** | Editable `<input>` / `<textarea>` / `<select>` | Step 1 identity, license fields, employer role/dates |
| **Metric tiles** | Read-only stats and ambiguous numbers | Hospital beds, trauma level, unit bed count, ratios when shown as summary |

**Defer:** Per-field validity checkmarks; decorative icons without a11y review; rigid equal-width metric grids on variable data

- [x] **Disambiguate global vs per-employer ratios copy** — clinical summary **Average patient ratios** vs employer **Average daily patients**; helper text on [`ClinicalSummaryFields.vue`](../components/intake/ClinicalSummaryFields.vue) and [`EmployerCard.vue`](../components/intake/EmployerCard.vue)

#### Prefill & manual entry (remaining)

- [ ] **Education graduation month + year** — [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue) (intake + admin builder): collect **month and year** (not year-only); store on `education[]` JSONB (e.g. `graduationMonth` + `graduationYear` or single `MM/YYYY`); map to DOCX for download ([`docxBuilder.ts`](../server/utils/docxBuilder.ts) → `education_graduation_year` today is year-only — confirm contract template tag format or add `education_graduation_month` in [`template.docx`](../server/assets/template.docx) + [`VMS-FIELD-MANIFEST.md`](./VMS-FIELD-MANIFEST.md)); gap review, parse/Gemini, normalizeCandidate
- [ ] **Multi-license rows (State · License · expiration)** — replace separate license fields in [`CredentialsChecklist.vue`](../components/intake/CredentialsChecklist.vue) with repeatable **one-line rows**: **State** | **License #** | **Expiration** (MM/YYYY — see credential expiry todo); **+ Add license** for multiple active licenses; intake + admin builder; new `licenses[]` JSONB (e.g. `{ state, number, expiry? }`); map to `{#active_licenses_list}` and `rn_license_state_and_expiry` in [`docxBuilder.ts`](../server/utils/docxBuilder.ts) (today: single `license_state` + `license_number`, no license expiry); PATCH schema, gap review, parse prefill; migrate or fallback from legacy columns
  - **Include compact license status in this block** — move Yes/No/N/A compact select from [`ClinicalSummaryFields.vue`](../components/intake/ClinicalSummaryFields.vue) into the license section (not under “Clinical summary”)
  - **Remove average patient ratios from this area** — drop career-wide **Average patient ratios** from under compact license in clinical summary ([`ClinicalSummaryFields.vue`](../components/intake/ClinicalSummaryFields.vue)); per-employer ratios stay on employer cards; decide whether to remove `average_patient_ratios` from wizard/gap review/DOCX or relocate elsewhere
- [ ] **Credential expiry format MM/YYYY** — [`CredentialsChecklist.vue`](../components/intake/CredentialsChecklist.vue) (intake + admin builder): expiration inputs use **MM/YYYY** (not `YYYY-MM` / free text); placeholder + validation/normalize on PATCH; align DOCX output for `BLS_certification_expiration_date`, `ACLS_certification_expiration_date`, `PALS_certification_expiration_date` ([`docxBuilder.ts`](../server/utils/docxBuilder.ts)); update parse prompt in [`geminiShared.ts`](../server/utils/geminiShared.ts) if Gemini still targets `YYYY-MM`; optional normalize legacy stored values
- [ ] **“Other” selects — validation** — EMR Other shows helper when blank but does not block Next; audit whether any future select needs hard empty/error when Other + no text

#### Step 1 — visual polish (remaining)

- [ ] **Optional: app-owned field validity icons** — only if product wants explicit checks; **do not** mirror browser autofill checkmarks

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) §D (Steps 1–3)

#### Step 2 — employer cards (remaining)

Deck shipped (#47) — optional follow-ups only. Plan: [archive/EMPLOYER-CARD-DECK-PLAN.md](./archive/EMPLOYER-CARD-DECK-PLAN.md).

- [ ] **Employment type dropdown** — replace free-text on [`EmployerCard.vue`](../components/intake/EmployerCard.vue) with `<select>`: **Travel**, **Staff**, **PRN** (intake + admin builder); normalize parse values where possible; maps to `employers[].employmentType` → `experience_employment_type`
  - **When PRN selected:** show companion field for average work time (e.g. hours per week / shifts per month — label TBD); new employer JSONB field; confirm DOCX mapping (no template tag today — may need manifest + `docxBuilder` or fold into an existing experience text field)
- [ ] **Per-employer trauma + teaching inputs** — on [`EmployerCard.vue`](../components/intake/EmployerCard.vue) (intake + admin builder); maps to `employers[].traumaLevel` / `teachingStatus` → `experience_trauma_level` / `experience_is_teaching_facility` ([`VMS-FIELD-MANIFEST.md`](./VMS-FIELD-MANIFEST.md))
  - **Today:** trauma/teaching come from hospital DB when linked (read-only chips); unlinked/manual employers have no way to enter them
  - **Pick when building (linked facility behavior):**
    - **A — DB wins:** after link, trauma/teaching stay read-only; change only by unlinking or picking another hospital
    - **B — Recruiter override:** prefill from DB on link, but fields stay editable to fix bad matches or gaps in seed data
    - **C — Inputs only when unlinked:** show trauma/teaching inputs for manual hospitals only; linked cards keep read-only DB metrics
- [ ] **Charge nurse + preceptor experience (per card)** — yes/no on each [`EmployerCard.vue`](../components/intake/EmployerCard.vue) (intake + admin builder); new employer JSONB fields (e.g. `chargeNurseExperience`, `preceptorExperience` booleans); today these often appear only in free-text `highlights[]` from parse — confirm DOCX mapping (no dedicated template tags in [`VMS-FIELD-MANIFEST.md`](./VMS-FIELD-MANIFEST.md) today; may append to highlights, add tags, or new experience fields in `docxBuilder`)
- [ ] **EMR on each employment card (required)** — **not** a single Employment-section dropdown; each [`EmployerCard.vue`](../components/intake/EmployerCard.vue) gets its own EMR platform select (+ Other custom text per [`emrSystem.ts`](../utils/emrSystem.ts)); remove global `form.emr_system` / footer EMR block in intake + admin builder; store per row on `employers[]` (e.g. `emrSystem`); update [`docxBuilder.ts`](../server/utils/docxBuilder.ts) so each loop row uses that card’s EMR (`experience_emr_system`); PATCH schema, gap review (per employer), derive summary `emr_software_proficiencies` from union of card values
- [ ] **MetricTile for optional unit stats** — Unit beds, Avg daily patients as tiles in expanded deck body (today: labeled text inputs)
- [ ] **Optional section grouping** — light subheads (“Role & dates”, “Clinical”) only if manual test with 5+ employers still needs scan structure; may drop

#### Step 4 — review & finish

**Eventual plan (not built yet)** — preview before download, then admin layout control in the same initiative.

- [ ] **Document preview before download** — show filled contract template before final download; candidate confirms or goes back to edit
  - **Today:** gap review is field checklist only; DOCX on submit with no preview ([`finalizeAndDownload`](../pages/intake/[token].vue), [`docxBuilder`](../server/utils/docxBuilder.ts))
  - **Phase 1 — preview:** “Preview your packet” + **Download** / **Go back and edit**; pick implementation in PR — preview DOCX/PDF endpoint, in-browser HTML summary, or iframe PDF; must not log PHI in preview URLs; loading + retry; fallback to download-only if preview unavailable
  - **Phase 2 — admin layout (concierge):** in the same preview experience ([`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue)), recruiter configures **flexible blocks / columns per employment row** — which fields show, order, grouping — to style each hospital’s section in the final DOCX (not one fixed row layout for every employer); layout config on `employers[]` or packet JSON + [`docxBuilder.ts`](../server/utils/docxBuilder.ts) / template strategy beyond today’s fixed `{#professional_experiences}` loop; admin-first unless product expands to candidates
- [ ] **Review summary tiles (optional)** — gap review filled employer/clinical stats via `MetricTile`; pairs with document preview long-term

---

## Recruiter admin UX

MVP table action is DOCX download only — no candidate profile drill-down.

### Done

- [x] **Candidates table empty state** — “No candidates yet — create an intake link above” ([`CandidatesTable.vue`](../components/admin/CandidatesTable.vue))
- [x] **Invite copy feedback** — clipboard copy + inline “Copied!”; readonly URL if clipboard API fails ([`CreateInvitePanel`](../components/admin/CreateInvitePanel.vue))
- [x] **Parse status in table** — status + icon if `parse_error` (not full audit UI)
- [x] **Loading skeleton** for candidates table
- [x] **Admin intake preview (client / admin toggle)** — [`useIntakePreviewMode`](../composables/useIntakePreviewMode.ts) + [`IntakePreviewModeToggle.vue`](../components/intake/IntakePreviewModeToggle.vue); admin **Download draft packet** without changing candidate status
- [x] **Admin section builder (concierge)** — [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue) + [`useAdminCandidateWorkspace`](../composables/useAdminCandidateWorkspace.ts); upload/parse/PATCH via admin APIs; **Copy link** + **Mark submitted**; employer cards in panel layout
- [x] **Submitted column date layout** — `whitespace-nowrap` ([`CandidatesTable.vue`](../components/admin/CandidatesTable.vue))
- [x] **Filter-specific empty copy** — search vs drafts vs empty table
- [x] **Table row action clarity** — `hover:bg-slate-50`; **Download DOCX** label

### Backlog

- [ ] **Optional:** Real-time “updated elsewhere” banner when candidate edits via invite while admin has builder open
- [ ] **Optional: global content width** — deprioritize unless intentional app-wide layout pass

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) admin section

---

## Parse audit & regression

**Goal:** Make Gemini parse inspectable during MVP tuning without changing the intake API or DOCX path. Evidence fields are for **QA and prompt iteration**, not candidate-facing UI.

**Do not:** Rename schema to template tags. **Do not** return full audit blobs to the intake client. **Do not** treat citation substring checks as proof of correctness.

### Done — Phase A (schema + server-only storage)

- [x] **Extend `resumeJsonSchema()`** — `identified_facilities_raw`, `suggested_employers[].source_snippet` in [`geminiShared.ts`](../server/utils/geminiShared.ts)
- [x] **Map and strip audit fields** before `parsedResumeToApiFields` / client response ([`parseAudit.test.mjs`](../tests/parseAudit.test.mjs))
- [x] **Persist audit payload** under `candidates.parsed_resume.audit`; keep `{ raw: rawText }`; [phi-handling](../.cursor/rules/phi-handling.mdc)
- [x] **Confirm no facility metrics from Gemini** — beds/trauma/teaching from hospital DB only

### Backlog — Phase B (regression scripts)

See also [Test automation plan — Phase 1](#phase-1--expand-script--unit-coverage-no-secrets-every-pr).

- [x] **Unit tests for audit mapping** — [`parseAudit.test.mjs`](../tests/parseAudit.test.mjs), [`test-gemini-parse-map.mjs`](../scripts/test-gemini-parse-map.mjs) smoke
- [ ] **Fixture PDF regression** — PDFs in `tests/fixtures/`; assert `source_snippet` overlaps `rawText` (fuzzy); assert `identified_facilities_raw` on multi-job fixtures ([`test-pdf-vision.mjs`](../scripts/test-pdf-vision.mjs) is manual smoke today)
- [ ] **Optional: dev-only last-parse JSON dump** to `data/` (gitignored)

### Phase C — Admin parse debug UI (defer / staging only)

- [ ] **Expand row debug UI** — side-by-side field vs `source_snippet` for employers
- [ ] **Gate behind env flag** or non-prod only
- [ ] **No dual Gemini API pass** unless Phase B quality is still poor on image PDFs

**Out of scope for now:** Production recruiter audit workflow; mandatory two-call Gemini pipeline.

---

## Hospital parse UX

**Status:** Core work **complete** (PRs #37–#38, manual hospital, EMR Other). Historical plan: [archive/HOSPITAL-PARSE-UX-PLAN.md](./archive/HOSPITAL-PARSE-UX-PLAN.md).

### Done

- [x] **PR 2** — `hospitalMatch` util + `employer_hospital_suggestions` on parse response
- [x] **PR 3** — In-place facility linking on `EmployerCard`
- [x] **PR 4** — Expand `GEMINI_VMS_FIELD_GUIDE` (unit beds vs hospital beds; no facility metrics from Gemini)

### Backlog

- [ ] **Hospital data Google search helper** — small helper control on unlinked employer / facility link UI ([`EmployerCard.vue`](../components/intake/EmployerCard.vue), [`HospitalAutocomplete.vue`](../components/intake/HospitalAutocomplete.vue); intake + admin builder) that opens a new tab to Google with a prefilled query (employer name, city/state, e.g. “trauma level beds teaching hospital”) so recruiters can research metrics before linking or manual entry; no PHI in query beyond what’s already on the card
- [ ] **PR 1b** — Hospital search `pg_trgm` tuning (only if search feels weak in prod)
- [ ] **PR 5 (optional)** — covered by [Multi-license rows](#prefill--manual-entry-remaining) in Candidate intake UX (superseded when that ships)

---

## Hardening / VMS

VMS expansion Steps 0–5 **complete** — see [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md). Remaining hardening + test automation below.

| Issue | Scope | Status |
| --- | --- | --- |
| [#10](https://github.com/juanroddotdev/resume-rocket/issues/10) | Template inventory | **Done** — manifest + `inventory-template-tags.mjs` |
| [#11](https://github.com/juanroddotdev/resume-rocket/issues/11) | JSONB normalization | **Done** — `normalizeCandidate.ts` |
| [#12](https://github.com/juanroddotdev/resume-rocket/issues/12) | Parse outcome visibility | **Done** — `parseOutcomeLog.ts` (#45) |
| [#13](https://github.com/juanroddotdev/resume-rocket/issues/13) | Parse rate limiting | **Done** — `parseRateLimit.ts` |
| [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) | CI regression tests | **Partial** — [Test automation plan](#test-automation-plan) |
| [#15](https://github.com/juanroddotdev/resume-rocket/issues/15) | Release checklist | **Partial** — doc exists; sign-off + automation in progress |

Parse audit Phase B (fixture PDF regression) → [Test automation plan — Phase 1](#phase-1--expand-script--unit-coverage-no-secrets-every-pr). Defer parse debug UI (Phase C) unless actively tuning prompts.

### Files & exports

- [x] **DOCX download filenames (candidate name)** — `{Last}_{First}_VMS-Resume.docx` via [`resumeDownloadFilename.ts`](../utils/resumeDownloadFilename.ts); all download paths use server `Content-Disposition` ([`generate-docx.post.ts`](../server/api/generate-docx.post.ts), admin + intake client)
- [ ] **Storage upload paths (optional)** — resumes bucket still `{candidateId}/{uuid}-{original}` ([`storageUpload.ts`](../server/utils/storageUpload.ts)); human-readable storage names only if recruiters browse bucket directly

---

## How to use this file

- Check items off when merged (or link PR number in the line).
- Keep **one concern per PR** per [git-pr-workflow](../.cursor/rules/git-pr-workflow.mdc).
- Pre-release: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); grow automation per [Test automation plan](#test-automation-plan)
