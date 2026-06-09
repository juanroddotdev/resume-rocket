# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Related plans:** [MVP-PLAN.md](./MVP-PLAN.md) · [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) · [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md) · [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) · [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md)

**Quick nav:** [What's next](#whats-next) · [Done recently](#done-recently) · [Candidate intake UX](#candidate-intake-ux) · [Recruiter admin UX](#recruiter-admin-ux) · [Parse audit](#parse-audit--regression) · [Hospital parse](#hospital-parse-ux) · [Files & exports](#files--exports)

One concern per PR when implementing. Check items off when merged (optionally add PR number inline).

---

## What's next

Prioritized remaining work (code audit 2026-06-09). Most prefill/labeling/deck items are **done**; backlog is mostly polish, highlight restore, Step 4 preview, and admin table UX.

| Priority | Track | Open items |
| --- | --- | --- |
| **A** | Intake polish | Inline save indicator, wizard footers, parse banner polish, replace-resume button styling |
| **B** | Draft resume UX | Restore parse/DB field highlights when resuming a saved draft (today cleared on `bootstrapInvite`) |
| **C** | Step 4 | Document preview before download (largest new feature) |
| **D** | Admin hub | Submitted date layout, filter empty copy, invite success banner, table/DOCX label polish |
| **E** | Optional | Unit `MetricTile`s, EMR Other validation, fixture-PDF parse regression, storage upload filenames |
| **Defer** | — | Multi-license `licenses[]`, `pg_trgm` tuning (prod-only), parse debug UI (Phase C) |

---

## Done recently

- [x] Hybrid hospital seed (CMS + ArcGIS) → Supabase — `scripts/seed_hospitals.py`, [HOSPITAL-DATA.md](./HOSPITAL-DATA.md)
- [x] Remove legacy demo `hospitals` rows (`source_id IS NULL`)
- [x] Smoke: facility search + seeded data
- [x] **Parse audit Phase A** — `source_snippet`, `identified_facilities_raw` in [`geminiShared.ts`](../server/utils/geminiShared.ts); audit stripped from client ([`parseResponse.test.mjs`](../tests/parseResponse.test.mjs)); persisted under `parsed_resume.audit` in [`parse.post.ts`](../server/api/parse.post.ts)
- [x] **DOCX download filenames** — `Last_First_VMS-Resume.docx` via [`resumeDownloadFilename.ts`](../utils/resumeDownloadFilename.ts) on intake, admin, and email-link paths ([`generate-docx.post.ts`](../server/api/generate-docx.post.ts))
- [x] **Intake draft/resume flow doc** — [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md)

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
- [x] **Soft link-facility reminder** when `!hospitalId` — non-blocking; see [HOSPITAL-PARSE-UX-PLAN](./HOSPITAL-PARSE-UX-PLAN.md)
- [x] **Stronger empty employer CTA** — “Add at least one hospital where you worked”
- [x] **Compact form labels** — role, start/end, employment type, scope, acuity, highlights; optional unit fields when expanded
- [x] **MetricTile on linked facility row** — Hospital beds / Trauma level / Teaching hospital
- [x] **Stacked employer card deck** — single-open accordion, `activeCardIndex`, gap-review `goToField` opens correct card; [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md)

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
- [x] **Replace resume entry point** — text link on Step 1 back to upload (re-upload confirm stays in [`FileDropZone`](../components/intake/FileDropZone.vue))

---

### Backlog

#### Shared UI & labeling (remaining)

Two patterns — don’t mix them on the same control:

| Pattern | Use for | Example |
| --- | --- | --- |
| **Form labels** | Editable `<input>` / `<textarea>` / `<select>` | Step 1 identity, license fields, employer role/dates |
| **Metric tiles** | Read-only stats and ambiguous numbers | Hospital beds, trauma level, unit bed count, ratios when shown as summary |

**Defer:** Per-field validity checkmarks; decorative icons without a11y review; rigid equal-width metric grids on variable data

- [ ] **Disambiguate global vs per-employer ratios copy** — clinical summary **Average patient ratios** vs employer **Average daily patients**; add helper text so candidates know which scope each field covers (labels exist; semantics still easy to confuse)

#### Prefill & manual entry (remaining)

- [ ] **Restore parse/DB highlights on draft resume** — today `bootstrapInvite()` calls `clearAllPrefillHighlights()`; linked employers don’t re-`markEmployerDbMetrics` after server/local restore. Persist highlight field ids in `localStorage` or re-derive from `parseMeta` + `hospitalId` on employers
- [ ] **“Other” selects — validation** — EMR Other shows helper when blank but does not block Next; audit whether any future select needs hard empty/error when Other + no text

**Test:** Parse-heavy resume → highlights after leaving and returning to same link; link CMS hospital → DB metric tint returns on restore

#### Step 1 — visual polish (remaining)

Candidate-facing layout and feedback. Autosave debounce: 800ms in [`useCandidateForm.ts`](../composables/useCandidateForm.ts).

- [ ] **Inline save indicator (no layout flicker)** — fixed-width status beside step indicator: spinner → check + “Saved” (~2s fade); reserve space; keep error + Retry visible ([`pages/intake/[token].vue`](../pages/intake/[token].vue))
- [ ] **“Replace resume” as secondary action** — upgrade Step 1 text link to outline button + icon below [`ParseNoticeBanner`](../components/intake/ParseNoticeBanner.vue)
- [ ] **Wizard footer separation** — `border-t border-slate-100 mt-6 pt-4` on steps 1–3 Back/Next rows; match review panel back control
- [ ] **Parse notice banner polish** — icon + flex layout on [`ParseNoticeBanner.vue`](../components/intake/ParseNoticeBanner.vue); refine hierarchy and title line
- [ ] **Optional: app-owned field validity icons** — only if product wants explicit checks; **do not** mirror browser autofill checkmarks

**Suggested PR split:** save indicator · replace resume + footer + banner polish · validity icons (if scoped)

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) §D (Steps 1–3) + no layout shift on autosave while typing

#### Step 2 — employer cards (remaining)

Plan: [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md). Deck shipped — optional follow-ups only.

- [ ] **MetricTile for optional unit stats** — Unit beds, Avg daily patients as tiles in expanded deck body (today: labeled text inputs)
- [ ] **Optional section grouping** — light subheads (“Role & dates”, “Clinical”) only if manual test with 5+ employers still needs scan structure; may drop

#### Step 4 — review & finish

- [ ] **Document preview before download** — show filled contract template before final download; candidate confirms or goes back to edit
  - **Today:** gap review is field checklist only; DOCX on submit with no preview ([`finalizeAndDownload`](../pages/intake/[token].vue), [`docxBuilder`](../server/utils/docxBuilder.ts))
  - **UX:** “Preview your packet” + **Download** / **Go back and edit**
  - **Options (pick in PR):** preview DOCX/PDF endpoint; in-browser HTML summary; iframe PDF — must not log PHI in preview URLs
  - **Empty/error:** loading + retry; fallback to download-only with clear copy if preview unavailable
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

### Backlog

- [ ] **“Open intake” from candidates table** — deep link recruiter to `/intake/{token}` for a row (needs invite token on candidate or lookup)
- [ ] **Submitted column date layout** — split date + time or `whitespace-nowrap` in [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue); avoid locale string wrapping
- [ ] **Filter-specific empty copy** — distinguish search no-match vs “Show drafts” off when all rows are drafts
- [ ] **Invite success feedback (stronger)** — prominent banner or “Intake link created and copied” (today: inline “Copied!” + readonly URL)
- [ ] **Table row action clarity** — subtle `hover:bg-slate-50`; clearer DOCX label (not `⬇ DOCX` alone); **no** row caret / whole-row `cursor-pointer`
- [ ] **Optional: global content width** — deprioritize unless intentional app-wide layout pass

**Suggested PR split:** date layout + filter empty copy · invite banner · table hover + DOCX label · open intake link

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

From [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md). Data prerequisite is **done**. Core PRs 2–4 + prefill/manual-hospital/EMR Other are **done**.

### Done

- [x] **PR 2** — `hospitalMatch` util + `employer_hospital_suggestions` on parse response
- [x] **PR 3** — In-place facility linking on `EmployerCard`
- [x] **PR 4** — Expand `GEMINI_VMS_FIELD_GUIDE` (unit beds vs hospital beds; no facility metrics from Gemini)

### Backlog

- [ ] **PR 1b** — Hospital search `pg_trgm` tuning (only if search feels weak in prod)
- [ ] **PR 5 (optional)** — Multi-license `licenses[]` if resumes often list several active licenses
- [ ] **Highlight restore on draft resume** — see [Prefill & manual entry (remaining)](#prefill--manual-entry-remaining)

---

## Hardening / VMS

See [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) and GitHub issues #10–#15. Parse audit Phase B belongs here; defer Phase C unless actively tuning prompts.

### Files & exports

- [x] **DOCX download filenames (candidate name)** — `{Last}_{First}_VMS-Resume.docx` via [`resumeDownloadFilename.ts`](../utils/resumeDownloadFilename.ts); all download paths use server `Content-Disposition` ([`generate-docx.post.ts`](../server/api/generate-docx.post.ts), admin + intake client)
- [ ] **Storage upload paths (optional)** — resumes bucket still `{candidateId}/{uuid}-{original}` ([`storageUpload.ts`](../server/utils/storageUpload.ts)); human-readable storage names only if recruiters browse bucket directly

---

## How to use this file

- Check items off when merged (or link PR number in the line).
- Keep **one concern per PR** per [git-pr-workflow](../.cursor/rules/git-pr-workflow.mdc).
- Pre-release: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
