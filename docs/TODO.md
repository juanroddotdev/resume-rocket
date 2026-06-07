# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Related plans:** [MVP-PLAN.md](./MVP-PLAN.md) · [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) · [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) · [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md)

---

## Done recently

- [x] Hybrid hospital seed (CMS + ArcGIS) → Supabase — `scripts/seed_hospitals.py`, [HOSPITAL-DATA.md](./HOSPITAL-DATA.md)
- [x] Remove legacy demo `hospitals` rows (`source_id IS NULL`)
- [x] Smoke: facility search + seeded data

---

## UX backlog (order TBD)

Candidate + recruiter polish. One concern per PR when implementing. Priority order not set — sort when planning sprints.

### Upload & parse (Step 0)

- [x] **Parse progress animation** — spinner/pulse on drop zone so upload does not look frozen during long `/api/parse` (10–30s+ on vision PDFs); staged labels: upload → extract text → AI scan → saving ([`FileDropZone.vue`](../components/intake/FileDropZone.vue))
- [x] **Timed stage copy** — rotate/hold messages on long waits; align with `document_scan` / `partial_parse` when known
- [x] **Disable drop zone while parsing** — no second upload mid-request; keep **Continue manually** on error ([empty-error-states](../.cursor/rules/empty-error-states.mdc))
- [x] **`prefers-reduced-motion`** — static “Working…” instead of animation when user prefers reduced motion

### After parse — clarity (Steps 1–3)

- [x] **`document_scan` notice** on Step 1 when API returned `document_scan` — e.g. “We scanned your PDF visually”
- [x] **`partial_parse` banner** on Steps 1–3 when `partial_parse` — “Some fields used basic detection — please review”
- [x] **Persist `partial_parse` / `document_scan` in form state** if user refreshes mid-wizard (today only in `onParsed` message)

### Wizard navigation & orientation

- [x] **Step indicator** — “Step 2 of 5: Employment” or progress dots on [`pages/intake/[token].vue`](../pages/intake/[token].vue)
- [x] **Visible field labels** on Step 1 (not placeholders only) — accessibility + clarity on mobile
- [x] **Block Next on Step 2** when `employers.length === 0` with inline message (don’t wait until gap review)
- [x] **Block or warn Next on Step 3** for obvious gaps (optional: license state/number if required by gap review)

### Employment & facilities (Step 2)

- [x] **Reorder employer cards** — Move up / Move down (or drag) on [`EmployerCard`](../components/intake/EmployerCard.vue); order = [`docxBuilder`](../server/utils/docxBuilder.ts) `{#professional_experiences}` order; autosave via PATCH
- [x] **Show linked facility metrics** on card — read-only chips: beds, trauma, teaching when `hospitalId` set
- [x] **Soft link-facility reminder** when `!hospitalId` — “Link facility for bed count & trauma (recommended)” — non-blocking; see [HOSPITAL-PARSE-UX-PLAN](./HOSPITAL-PARSE-UX-PLAN.md)
- [x] **Stronger empty employer CTA** under hospital search — “Add at least one hospital where you worked”

### Draft & recovery

- [x] **Draft restored banner** — when `restoreLocal()` loads wizard from localStorage after refresh/return
- [x] **Replace resume confirmation** — warn before re-upload on Step 0 if wizard already has data
- [x] **Show save chip on Step 0** after draft exists — “Saved” / “Saving…” visible once `candidateId` + autosave active (today chip mainly on steps 1+)

### Review & finish (Steps 4–success)

- [ ] **Document preview before download** — show what the VMS packet will look like (filled contract template) **before** triggering the final download; candidate confirms “looks right” or goes back to fix
  - **Today:** gap review (Step 4) is field checklist only; DOCX generates on submit with no visual preview ([`finalizeAndDownload`](../pages/intake/[token].vue), [`docxBuilder`](../server/utils/docxBuilder.ts))
  - **UX:** new step or expanded review — “Preview your packet” + primary **Download** / secondary **Go back and edit** (return to relevant wizard step without losing draft)
  - **Implementation options (pick in PR):** server endpoint that returns preview DOCX/PDF once per session; in-browser HTML summary of mapped sections (faster, not pixel-perfect); iframe PDF if converted server-side — must not log PHI in preview URLs
  - **Empty/error:** loading state while preview builds; retry if generation fails; if preview unavailable, keep current download-only path with clear copy
- [x] **Download again** on success step — if browser blocked download or tab closed
- [x] **Submit loading copy** — “Preparing your packet…” + disabled button during `finalizeAndDownload`
- [x] **One-line success context** — what “VMS-ready” means / what recruiter receives
- [x] **Focus first missing field** — when jumping from gap review (`go-to-step`), scroll/focus target step’s first empty input

### Forms & accessibility

- [x] **`autocomplete` on identity fields** — `given-name`, `family-name`, `email`, `tel` on Step 1
- [x] **Basic phone format hint** — optional pattern or helper text (no strict validation unless product wants it)

### Recruiter admin

- [x] **Candidates table empty state** — “No candidates yet — create an intake link above”
- [x] **Invite copy feedback** — “Copied!” toast; show readonly URL if clipboard API fails ([`CreateInvitePanel`](../components/admin/CreateInvitePanel.vue))
- [x] **Parse status column (optional)** — draft/submitted + icon if `parse_error` (not full audit UI)
- [x] **Loading skeleton** for candidates table (today plain “loading” text)

---

## Parse audit & regression (dev / hardening — phased)

**Goal:** Make Gemini parse inspectable during MVP tuning without changing the intake API or DOCX path. Evidence fields are for **QA and prompt iteration**, not candidate-facing UI.

**Do not:** Rename schema to template tags (`candidate_first_name`, `professional_experiences`). **Do not** return full audit blobs to the intake client. **Do not** treat citation substring checks as proof of correctness.

### Phase A — Schema + server-only storage (one PR)

- [ ] Extend `resumeJsonSchema()` in [`geminiShared.ts`](../server/utils/geminiShared.ts):
  - `identified_facilities_raw: string[]` — facility names exactly as on resume
  - `suggested_employers[].source_snippet` — short quote per job (max length cap in prompt)
  - Skip long `candidate_summary_analysis` unless needed (token cost)
- [ ] Map in `mapGeminiResumeJson`; **strip** audit fields before `parsedResumeToApiFields` / client response
- [ ] Persist under `candidates.parsed_resume.audit` (or `parse_audit` JSONB) — keep existing `{ raw: rawText }`; follow [phi-handling](../.cursor/rules/phi-handling.mdc) (no full resume in prod logs)
- [ ] Still **no** beds/trauma/teaching from Gemini — hospital DB only

**Files:** `server/utils/geminiShared.ts`, `geminiParse.ts`, `geminiDocumentParse.ts`, `server/api/parse.post.ts`, `types/parse.ts`

### Phase B — Regression scripts (one PR)

- [ ] Extend [`scripts/test-gemini-parse-map.mjs`](../scripts/test-gemini-parse-map.mjs) and/or [`scripts/test-pdf-vision.mjs`](../scripts/test-pdf-vision.mjs):
  - Fixture PDFs in `tests/fixtures/` (gitignore or synthetic minimal resumes)
  - Assert `source_snippet` overlaps `rawText` (fuzzy/normalized), not naive `citation.includes(name.slice(0,5))`
  - Assert `identified_facilities_raw` non-empty on multi-job fixtures
- [ ] Optional: dev-only write of last parse JSON to `data/` (gitignored), not `logs/` in repo

### Phase C — Admin parse debug UI (defer / staging only)

- [ ] Admin expand row: side-by-side field vs `source_snippet` for employers
- [ ] Gate behind env flag or non-prod only; recruiter does not need this for daily MVP
- [ ] No true dual API pass unless Phase A quality is still poor on image PDFs

**Out of scope for now:** Production recruiter audit workflow; mandatory two-call Gemini pipeline.

---

## Hospital parse UX (from [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md))

Data prerequisite is **done**. Remaining app work:

- [x] **PR 2** — `hospitalMatch` util + `employer_hospital_suggestions` on parse response
- [x] **PR 3** — In-place facility linking on `EmployerCard` (avoid duplicate parsed vs search-added rows)
- [x] **PR 4** — Expand `GEMINI_VMS_FIELD_GUIDE` (unit beds vs hospital beds; no facility metrics from Gemini)
- [ ] **PR 1b** — Hospital search `pg_trgm` tuning (only if search feels weak in prod)
- [ ] **PR 5 (optional)** — Multi-license `licenses[]` if resumes often list several active licenses

---

## Hardening / VMS (when scheduled)

See [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) and GitHub issues #10–#15. Parse audit Phases A–B belong here; defer Phase C unless actively tuning prompts.

---

## How to use this file

- Check items off here when merged (or link PR number in the line).
- Keep **one concern per PR** per [git-pr-workflow](../.cursor/rules/git-pr-workflow.mdc).
- Pre-release: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
