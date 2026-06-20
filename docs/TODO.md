# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Doc index:** [README.md](./README.md) · **VMS status:** [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) (expansion complete)

**Related:** [MVP-PLAN.md](./MVP-PLAN.md) (historical spec) · [VMS-FIELD-MANIFEST.md](./VMS-FIELD-MANIFEST.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) · [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) · **Archived plans:** [archive/](./archive/)

**Quick nav:** [What's next](#whats-next) · [Done recently](#done-recently) · [Test automation plan](#test-automation-plan) · [Candidate intake UX](#candidate-intake-ux) · [Recruiter admin UX](#recruiter-admin-ux) · [Parse audit](#parse-audit--regression) · [Hospital parse](#hospital-parse-ux) · [Files & exports](#files--exports)

One concern per PR when implementing. Check items off when merged (optionally add PR number inline).

---

## What's next

Prioritized remaining work (updated 2026-06-13). VMS template + wizard core is **done**; focus shifts to **test automation**, release smoke, and admin polish.

| Priority | Track | Open items |
| --- | --- | --- |
| **Client UAT** | VMS backlog | Recruiter feedback Clips 1–8 — epic [#97](https://github.com/juanroddotdev/resume-rocket/issues/97); detail in [`VMS_BACKLOG.md`](./VMS_BACKLOG.md) |
| **0** | Release | One manual happy-path smoke on target env; sign off [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) |
| **1** | Test automation | Phased plan below — script/API coverage first, E2E last; closes [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) |
| **A** | Intake polish | Track A shipped (#76–#82) — see [Candidate intake UX](#candidate-intake-ux) |
| **B** | Step 4 | DOCX preview shipped (#89–#91); Phase 2 admin per-employment DOCX layout deferred |
| **C** | Admin hub | Open intake from table row (done in list view); optional real-time sync banner |
| **D** | Optional | Storage upload filenames |
| **Defer** | — | `pg_trgm` tuning (prod-only), parse debug UI (Phase C) |

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
- [x] **June 13 intake field batch** — credential MM/YYYY (#68), unit MetricTiles (#69), employer subheads (#70), charge/preceptor (#71), trauma/teaching unlinked (#72), education graduation month+year (#73); admin builder (#63) + hub layout (#67)

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

- [x] **Education graduation month + year** (#73) — [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue): month select + year; `graduationMonth` on `education[]` JSONB; DOCX `education_graduation_year` as MM/YYYY when month known; gap review, parse/Gemini, normalizeCandidate
- [x] **Multi-license rows (State · License · expiration)** — [`LicenseRepeater.vue`](../components/intake/LicenseRepeater.vue): repeatable rows in [`CredentialsChecklist.vue`](../components/intake/CredentialsChecklist.vue); `licenses[]` JSONB + legacy scalar bridge; DOCX `{#active_licenses_list}` + `rn_license_state_and_expiry` with expiry; parse/Gemini `licenses[]`; gap review, intake + admin builder
  - [x] **Include compact license status in this block** — moved to [`CredentialsChecklist.vue`](../components/intake/CredentialsChecklist.vue) RN license section
  - [x] **Average patient ratios** — kept on Step 3 clinical summary (required); not removed per product decision
- [x] **Credential expiry format MM/YYYY** (#68) — [`CredentialsChecklist.vue`](../components/intake/CredentialsChecklist.vue): MM/YYYY input + normalize on PATCH; DOCX BLS/ACLS/PALS expiry; Gemini prompt aligned
- [x] **“Other” selects — validation** — per-card EMR on [`EmployerCard.vue`](../components/intake/EmployerCard.vue) blocks Other + empty custom via `isStoredEmrComplete` (step gate + gap review)

#### Step 1 — visual polish (remaining)

- [x] **Optional: app-owned field validity icons** — [`FieldValidityIcon.vue`](../components/intake/FieldValidityIcon.vue) on Step 1 identity fields (touched + valid only); expand if product wants more

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) §D (Steps 1–3)

#### Step 2 — employer cards (remaining)

Deck shipped (#47) — optional follow-ups only. Plan: [archive/EMPLOYER-CARD-DECK-PLAN.md](./archive/EMPLOYER-CARD-DECK-PLAN.md).

- [x] **Employment type dropdown** (#67) — [`EmployerCard.vue`](../components/intake/EmployerCard.vue): Travel / Staff / PRN `<select>`; [`employmentType.ts`](../utils/employmentType.ts) normalize; maps to `experience_employment_type`
  - [x] **When PRN selected:** companion **Typical schedule** field on [`EmployerCard.vue`](../components/intake/EmployerCard.vue); `prnSchedule` on `employers[]` JSONB; appended to `experience_employment_type` in DOCX
- [x] **Per-employer trauma + teaching inputs** (#72, Option C) — trauma level + teaching Yes/No on **unlinked** employers only; linked cards keep read-only DB `MetricTile`s → `experience_trauma_level` / `experience_is_teaching_facility`
- [x] **Charge nurse + preceptor experience (per card)** (#71) — yes/no on each [`EmployerCard.vue`](../components/intake/EmployerCard.vue); `chargeNurseExperience` / `preceptorExperience` on `employers[]` JSONB; appended to `experience_highlights` in DOCX
- [x] **EMR on each employment card (required)** — per-card EMR on [`EmployerCard.vue`](../components/intake/EmployerCard.vue); removed global footer in [`HospitalAutocomplete.vue`](../components/intake/HospitalAutocomplete.vue); `employers[].emrSystem`; DOCX per-row `experience_emr_system` + union `emr_software_proficiencies`; gap review per employer; legacy `emr_system` backfill on hydrate
- [x] **MetricTile for optional unit stats** (#69) — Unit beds, Avg daily patients as editable `MetricTile`s in expanded deck body
- [x] **Optional section grouping** (#70) — `<fieldset>` subheads “Role & dates” and “Clinical” on employer cards

#### Step 4 — review & finish

**Phase 1 shipped (#84–#91)** — two-step review with DOCX-faithful preview via `docx-preview`; Phase 2 admin DOCX layout control deferred.

- [x] **Document preview before download** — gap checklist → **Preview packet** → [`DocxPreviewViewer.vue`](../components/intake/DocxPreviewViewer.vue) renders generated contract DOCX; **Make changes** / **Download** on [`IntakeReviewPanel.vue`](../components/intake/IntakeReviewPanel.vue); intake Step 4 + admin builder; autosave before preview (#89–#91)
  - [ ] **Phase 2 — admin layout (concierge):** in the preview experience ([`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue)), recruiter configures **flexible blocks / columns per employment row** — which fields show, order, grouping — to style each hospital’s section in the final DOCX; layout config on `employers[]` or packet JSON + [`docxBuilder.ts`](../server/utils/docxBuilder.ts) / template strategy beyond today’s fixed `{#professional_experiences}` loop; admin-first unless product expands to candidates
- [ ] **Review summary tiles (optional)** — gap review filled employer/clinical stats via `MetricTile`; pairs with document preview long-term

---

## Recruiter admin UX

MVP table action is DOCX download only — no candidate profile drill-down.

**Dashboard product model:** The admin hub’s **primary purpose** is filling out the VMS packet in [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue) (concierge / operator workflow). The sidebar candidate list + builder layout is the default home — **do not replace or demote the builder** with a full-width table.

**Candidates table:** [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue) should ship as a **separate dashboard view** (e.g. tab, toggle, or route segment like “Builder” vs “All candidates”) for scan/search/download-at-a-glance. Switching to list view must not remove quick path back to builder + selected candidate. Row actions: open in builder, download DOCX, copy/open intake link — not a standalone profile app.

### Done

- [x] **Candidates table empty state** — “No candidates yet — create an intake link above” ([`CandidatesTable.vue`](../components/admin/CandidatesTable.vue))
- [x] **Invite copy feedback** — clipboard copy + inline “Copied!” in builder footer and modal flow ([`NewCandidatePacketModal.vue`](../components/admin/NewCandidatePacketModal.vue))
- [x] **Parse status in table** — status + icon if `parse_error` (not full audit UI)
- [x] **Loading skeleton** for candidates table
- [x] **Admin intake preview (client / admin toggle)** — [`useIntakePreviewMode`](../composables/useIntakePreviewMode.ts) + [`IntakePreviewModeToggle.vue`](../components/intake/IntakePreviewModeToggle.vue); admin **Download draft packet** without changing candidate status
- [x] **Admin section builder (concierge)** (#63) — [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue) + [`useAdminCandidateWorkspace`](../composables/useAdminCandidateWorkspace.ts); upload/parse/PATCH via admin APIs; **Copy link** + **Mark submitted**; employer cards in panel layout
- [x] **Admin hub Day 1** (#67) — desktop sidebar layout (create link + candidate list beside builder); employment type dropdown; post-create opens builder (full-width success banner removed — see notifications backlog)
- [x] **Candidates table as alternate dashboard view** — Builder | All candidates toggle on [`pages/admin.vue`](../pages/admin.vue); default builder + sidebar; full [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue) in table mode; **Open in builder**, **Open intake**, Download DOCX, Parse QA row actions; `?view=table` query sync
- [x] **Submitted column date layout** — `whitespace-nowrap` ([`CandidatesTable.vue`](../components/admin/CandidatesTable.vue))
- [x] **Filter-specific empty copy** — search vs drafts vs empty table
- [x] **Table row action clarity** — `hover:bg-slate-50`; **Download DOCX** label

### Planned UI polish

Incremental admin hub / builder UX tweaks — implement in small PRs after layout shell (#94).

- [x] **New candidate packet modal — start path (upload vs scratch)** — Redesign [`NewCandidatePacketModal.vue`](../components/admin/NewCandidatePacketModal.vue) so **+ New candidate packet** is the primary creation moment: recruiter chooses **upload resume** (parse + prefill) or **start from scratch** (empty builder). Packet creation and first-step UX belong here, not only on the builder Resume tab. **Defer:** optional candidate email in the modal (keep invite `candidate_email` API for later handoff/prefill; hide or remove from modal until needed).
- [x] **Dev tools & Parse QA in Admin dropdown** — Move operator-only affordances out of the builder canvas and table rows into [`AdminNavMenu.vue`](../components/admin/AdminNavMenu.vue): **Parse QA** (opens [`ParseQAPanel.vue`](../components/admin/ParseQAPanel.vue) for selected candidate; remove Resume-tab button and per-row **Parse QA** in [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue)), and **dev-only parse fixtures** ([`DevParseFixturePanel.vue`](../components/intake/DevParseFixturePanel.vue) — hide from [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue) Resume section; expose under dropdown when `import.meta.dev`). Keeps recruiter-facing builder focused on production workflow.
- [x] **Resume upload in sidebar, not builder canvas** — Remove the drop-zone / [`FileDropZone.vue`](../components/intake/FileDropZone.vue) from the builder Resume section ([`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue)); editor shows parsed fields and filename/status only. Add **Re-upload resume** (or compact upload control) in the left sidebar on [`pages/admin.vue`](../pages/admin.vue), placed under **+ New candidate packet** when a candidate is selected — same parse API, scoped to selected draft. Pairs with **New candidate packet modal — start path** for initial upload vs scratch; sidebar handles replace/re-parse on an existing packet.
- [x] **Pin builder chrome; scroll form only** — In [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue), keep the **candidate name + save status + Preview packet / Download draft** action row and [`AdminSectionTabs.vue`](../components/admin/AdminSectionTabs.vue) section nav **fixed within the builder card** (non-scrolling chrome). Only the form canvas (`overflow-y-auto` middle pane) scrolls. Verify parent height chain from [`pages/admin.vue`](../pages/admin.vue) so long forms do not push tabs off-screen or scroll the whole card like a blog post. **Optional:** pin intake-link footer separately from form scroll.
- [x] **Builder | All candidates toggle in sidebar** — Move the dashboard view switch from the top header row on [`pages/admin.vue`](../pages/admin.vue) into the left sidebar (e.g. under **+ New candidate packet** or above the candidate list). Right panel becomes workspace-only; sidebar owns navigation between builder and table modes. Keep `?view=table` query sync.
- [x] **Remove “Recruiter dashboard” page title** — Drop the top-level `h1` on [`pages/admin.vue`](../pages/admin.vue); reclaim vertical space for the pinned sidebar + workspace. Page context comes from sidebar selection and builder chrome (candidate name, section tabs).
- [x] **Education cards — single-open accordion (all breakpoints)** — Refactor [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue) to match the stacked employer deck pattern ([`EmployerCard.vue`](../components/intake/EmployerCard.vue) / [archive/EMPLOYER-CARD-DECK-PLAN.md](./archive/EMPLOYER-CARD-DECK-PLAN.md)): collapsed summary headers by default on **desktop and mobile**; tap/click header to expand one card; opening a card closes others. Wire gap-review focus (`education-{n}-*`) to expand the target row before focus. Applies to intake Step 3 and admin builder Credentials section.
- [x] **Pin global main nav (app header)** — Keep the top **Resume Rocket** + **Admin** header in [`layouts/admin.vue`](../layouts/admin.vue) fixed/static at all times (`shrink-0`, no page-level scroll). Only [`pages/admin.vue`](../pages/admin.vue) inner regions scroll (sidebar list, builder canvas, table). Pairs with **Pin builder chrome** and pinned left sidebar — full hierarchy: global header → sidebar + workspace → builder tabs → form scroll.
- [x] **Remove builder footer copy-link bar** — Drop the pinned intake-link row at the bottom of [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue) (readonly URL + **Copy link**). Reclaim vertical space for the form canvas; handoff via **Open intake** in the candidates table or a future sidebar/copy affordance if needed.
- [x] **Dev fixture load — no scroll jump; keep section nav pinned** — Loading **Partial** or **Complete fixture** from [`AdminNavMenu.vue`](../components/admin/AdminNavMenu.vue) (`onDevFixture` in [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue)) currently scrolls the form canvas (often to the bottom on complete fixture); scrolling back up can leave [`AdminSectionTabs.vue`](../components/admin/AdminSectionTabs.vue) off-screen. **Fix:** apply fixture data in place only — do not call `scrollToSection` / `scrollIntoView` on prefill; preserve canvas scroll position and pinned builder chrome. OK to show loading/disabled state on the builder while fields populate (`devPrefilling`). Review `onParsed` → `activeSection = 'identity'` and any accordion/card `scrollIntoView` side effects from large complete payloads.
- [x] **Section tabs follow scroll (scroll-spy)** — When the user scrolls the builder form canvas manually, [`AdminSectionTabs.vue`](../components/admin/AdminSectionTabs.vue) should update the active tab (Resume, Identity, Employment, etc.) to match the section in view. Today `activeSection` only changes on tab click or programmatic `scrollToSection` ([`useAdminCandidateWorkspace.ts`](../composables/useAdminCandidateWorkspace.ts)). **Fix:** observe `#admin-section-*` anchors inside the scroll container (`canvasRef` in [`AdminCandidateBuilder.vue`](../components/admin/AdminCandidateBuilder.vue)) — e.g. `IntersectionObserver` with the canvas as root — and sync `activeSection` on scroll; keep tab-click scroll behavior unchanged.
- [ ] **Employer deck in admin builder (deferred)** — Use stacked single-open employer accordion in admin like intake; reverted to `deck-mode="multi"` panel layout (all cards expanded) until desktop deck spacing/stack behavior is fixed.

### Backlog

- [ ] **App notifications & toasts (cross-cutting)** — Replace ad-hoc inline banners with a shared notification layer (toast stack or compact status rail). **Scope:** post-create packet success (“builder ready”, clipboard copied), save/autosave errors, DOCX download failures, parse outcomes, confirmation email skipped, real-time “updated elsewhere” when candidate edits via invite. **Principles:** non-blocking, dismissible, no full-width dashboard chrome; reuse across admin hub, builder, and intake where appropriate. **Deferred:** removed green “Packet created — builder ready” banner from [`pages/admin.vue`](../pages/admin.vue); create flow still auto-opens builder (intake handoff via **Open intake** in table).
- [ ] **Optional:** Real-time “updated elsewhere” banner when candidate edits via invite while admin has builder open (fold into notifications project above)
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
- [x] **PR 5 (optional)** — multi-license parse + `licenses[]` JSONB (Track A #78–#80)

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
