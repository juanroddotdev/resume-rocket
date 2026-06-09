# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Related plans:** [MVP-PLAN.md](./MVP-PLAN.md) · [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) · [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md) · [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) · [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md)

**Quick nav:** [Done recently](#done-recently) · [Candidate intake UX](#candidate-intake-ux) · [Recruiter admin UX](#recruiter-admin-ux) · [Parse audit](#parse-audit--regression) · [Hospital parse](#hospital-parse-ux) · [VMS / hardening](#hardening--vms) · [Files & exports](#files--exports)

One concern per PR when implementing. Check items off when merged (optionally add PR number inline).

---

## Done recently

- [x] Hybrid hospital seed (CMS + ArcGIS) → Supabase — `scripts/seed_hospitals.py`, [HOSPITAL-DATA.md](./HOSPITAL-DATA.md)
- [x] Remove legacy demo `hospitals` rows (`source_id IS NULL`)
- [x] Smoke: facility search + seeded data

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

---

### Backlog

#### Shared UI & labeling (cross-cutting)

Two patterns — don’t mix them on the same control:

| Pattern | Use for | Example |
| --- | --- | --- |
| **Form labels** | Editable `<input>` / `<textarea>` / `<select>` | Step 1 identity, license fields, employer role/dates |
| **Metric tiles** | Read-only stats and ambiguous numbers | Hospital beds, trauma level, unit bed count, ratios when shown as summary |

**Principles:** Labels always visible (placeholders = hints only). Value is the hero on tiles; micro-label is `text-xs uppercase text-slate-500`, value is `text-sm font-semibold`. Soft chips (`bg-slate-50 rounded-xl p-2.5`), not heavy bordered grids. Min `text-xs` on mobile. Use `brand-*`, not `blue-*`. No dark-mode variants until app supports dark mode.

- [x] **Shared intake field styles** — `.field`, `.field-label`, `.field-label-compact` + focus rings in [`assets/css/main.css`](../assets/css/main.css); removed duplicated scoped `.field` from intake components + admin search
- [x] **Autofill background override** — `-webkit-autofill` inset box-shadow on `.field` (intake identity fields + admin sign-in)
- [x] **`MetricTile` component** — [`components/intake/MetricTile.vue`](../components/intake/MetricTile.vue); wired on linked facility row in [`EmployerCard.vue`](../components/intake/EmployerCard.vue)
- [ ] **Placeholder-only audit** — [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue) still placeholder-only; Step 1, [`ClinicalSummaryFields.vue`](../components/intake/ClinicalSummaryFields.vue), license block, and [`EmployerCard.vue`](../components/intake/EmployerCard.vue) labeled
- [ ] **Disambiguate metric semantics app-wide** — employer card unit fields labeled (**Unit beds** vs linked **Hospital beds**); remaining: global **Ratios** in clinical summary vs per-employer stats

**Suggested PR split:** shared `.field` + autofill + `MetricTile` · then EmployerCard labels · then EducationRepeater

**Defer:** Per-field validity checkmarks; decorative icons without a11y review; rigid equal-width metric grids on variable data

#### Step 1 — visual polish

Candidate-facing layout and feedback. Use `brand-*` tokens. Autosave debounce exists (800ms in [`useCandidateForm.ts`](../composables/useCandidateForm.ts)) — these items are presentation.

- [ ] **Inline save indicator (no layout flicker)** — fixed-width status beside step indicator: spinner → check + “Saved” (~2s fade); reserve space; keep error + Retry visible ([`pages/intake/[token].vue`](../pages/intake/[token].vue))
- [x] **Focus rings on all `.field` inputs** — via [shared intake field styles](#shared-ui--labeling-cross-cutting)
- [ ] **“Replace resume” as secondary action** — outline button + icon below [`ParseNoticeBanner`](../components/intake/ParseNoticeBanner.vue); keep re-upload confirm in [`FileDropZone`](../components/intake/FileDropZone.vue)
- [ ] **Wizard footer separation** — `border-t border-slate-100 mt-6 pt-4` on steps 1–3 Back/Next rows; match review panel back control
- [ ] **Parse notice banner polish** — icon + flex layout on [`ParseNoticeBanner.vue`](../components/intake/ParseNoticeBanner.vue); refine hierarchy and title line
- [ ] **Optional: app-owned field validity icons** — only if product wants explicit checks; **do not** mirror browser autofill checkmarks; reuse `canAdvanceStep1()` rules

**Suggested PR split:** save indicator + focus rings · replace resume + footer + banner polish · validity icons (if ever scoped)

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) §D (Steps 1–3) + no layout shift on autosave while typing

#### Step 2 — employer cards

**Priority:** stacked deck first (structural mobile UX), then unit MetricTiles, then section grouping only if deck headers are not enough. Plan: [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md).

[`EmployerCard.vue`](../components/intake/EmployerCard.vue) · [`HospitalAutocomplete.vue`](../components/intake/HospitalAutocomplete.vue)

- [x] **Compact form labels** — role, start/end, employment type, scope, acuity, highlights; optional unit fields when expanded
- [x] **MetricTile on linked facility row** — Hospital beds / Trauma level / Teaching hospital ([`EmployerCard.vue`](../components/intake/EmployerCard.vue))
- [x] **Stacked employer card deck** — single-open accordion, `activeCardIndex`, Next card nav, gap-review `goToField` opens correct card; see [EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md)
- [ ] **MetricTile for optional unit stats** — Unit beds, Avg daily patients, etc. in expanded deck body (after deck lands)
- [ ] **Optional section grouping** — light subheads (“Role & dates”, “Clinical”) only if still needed after deck; may drop

**Suggested PR split:** deck + gap-review integration (standalone) · unit MetricTiles in expanded body · section grouping if manual test with 5+ employers still needs scan structure

#### Step 3 — education

- [ ] **Education row labels** — degree / school / graduation year on [`EducationRepeater.vue`](../components/intake/EducationRepeater.vue) (same compact label pattern as clinical summary)

#### Step 4 — review & finish

- [ ] **Document preview before download** — show filled contract template before final download; candidate confirms or goes back to edit
  - **Today:** gap review is field checklist only; DOCX on submit with no preview ([`finalizeAndDownload`](../pages/intake/[token].vue), [`docxBuilder`](../server/utils/docxBuilder.ts))
  - **UX:** “Preview your packet” + **Download** / **Go back and edit**
  - **Options (pick in PR):** preview DOCX/PDF endpoint; in-browser HTML summary; iframe PDF — must not log PHI in preview URLs
  - **Empty/error:** loading + retry; fallback to download-only with clear copy if preview unavailable
- [ ] **Review summary tiles (optional)** — gap review filled employer/clinical stats via `MetricTile` instead of mystery numbers; pairs with document preview long-term

---

## Recruiter admin UX

MVP table action is DOCX download only — no candidate profile drill-down.

### Done

- [x] **Candidates table empty state** — “No candidates yet — create an intake link above” ([`CandidatesTable.vue`](../components/admin/CandidatesTable.vue))
- [x] **Invite copy feedback** — clipboard copy + inline “Copied!”; readonly URL if clipboard API fails ([`CreateInvitePanel`](../components/admin/CreateInvitePanel.vue))
- [x] **Parse status in table** — status + icon if `parse_error` (not full audit UI)
- [x] **Loading skeleton** for candidates table

### Backlog

- [ ] **Admin intake preview (unblocked wizard)** — signed-in recruiter can open an invite link and move through the full intake wizard (all steps + review) without candidate completion gates; use for QA, support, and verifying parse/prefill
  - **Today:** admin uses the same [`pages/intake/[token].vue`](../pages/intake/[token].vue) as candidates — `canAdvanceStep2()` / `canAdvanceStep3()`, gap review, and submit still block progress when fields are empty
  - **Candidate rules unchanged** — invite-only intake keeps required validation, license gate, and gap review before DOCX for normal users
  - **Admin bypass (pick in PR):** detect recruiter session (Supabase auth cookie / server flag on invite validate); skip or soften step Next/Review disabled states; allow submit/download with missing template tags (warn, don’t block); optional “Preview as admin” banner on wizard
  - **Scope:** navigation + submit path only — not a separate admin-only field schema; optional link from [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue) row (“Open intake”) later
  - **Test:** admin walks draft with empty employers → can reach Step 4 and download; candidate on same link still blocked until requirements met
- [ ] **Submitted column date layout** — split date + time or `whitespace-nowrap` in [`CandidatesTable.vue`](../components/admin/CandidatesTable.vue); avoid locale string wrapping
- [ ] **Filter-specific empty copy** — distinguish search no-match vs “Show drafts” off when all rows are drafts
- [ ] **Invite success feedback (stronger)** — prominent banner or “Intake link created and copied”; reduce double-click anxiety; optional shared toast only if reused elsewhere
- [ ] **Table row action clarity** — subtle `hover:bg-slate-50`; clearer DOCX label (not `⬇ DOCX` alone); **no** row caret / whole-row `cursor-pointer` (no profile drill-down in MVP)
- [ ] **Optional: global content width** — header/main already `max-w-6xl` in [`app.vue`](../app.vue); deprioritize unless intentional app-wide layout pass

**Note:** [Autofill background override](#shared-ui--labeling-cross-cutting) lives under shared intake UI (admin sign-in + invite email use `.field` too).

**Suggested PR split:** date layout + filter empty copy · invite banner · table hover + DOCX label

**Test:** [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) admin section — sign in, create invite, filter/search empty states, DOCX download

---

## Parse audit & regression

**Goal:** Make Gemini parse inspectable during MVP tuning without changing the intake API or DOCX path. Evidence fields are for **QA and prompt iteration**, not candidate-facing UI.

**Do not:** Rename schema to template tags. **Do not** return full audit blobs to the intake client. **Do not** treat citation substring checks as proof of correctness.

### Phase A — Schema + server-only storage (one PR)

- [ ] **Extend `resumeJsonSchema()`** in [`geminiShared.ts`](../server/utils/geminiShared.ts) — `identified_facilities_raw: string[]`; `suggested_employers[].source_snippet` (max length in prompt); skip long `candidate_summary_analysis` unless needed
- [ ] **Map and strip audit fields** in `mapGeminiResumeJson` before `parsedResumeToApiFields` / client response
- [ ] **Persist audit payload** under `candidates.parsed_resume.audit` (or `parse_audit` JSONB); keep `{ raw: rawText }`; follow [phi-handling](../.cursor/rules/phi-handling.mdc)
- [ ] **Confirm no facility metrics from Gemini** — beds/trauma/teaching from hospital DB only

**Files:** `server/utils/geminiShared.ts`, `geminiParse.ts`, `geminiDocumentParse.ts`, `server/api/parse.post.ts`, `types/parse.ts`

### Phase B — Regression scripts (one PR)

- [ ] **Extend parse regression scripts** — [`scripts/test-gemini-parse-map.mjs`](../scripts/test-gemini-parse-map.mjs) and/or [`scripts/test-pdf-vision.mjs`](../scripts/test-pdf-vision.mjs): fixture PDFs in `tests/fixtures/`; assert `source_snippet` overlaps `rawText` (fuzzy); assert `identified_facilities_raw` on multi-job fixtures
- [ ] **Optional: dev-only last-parse JSON dump** to `data/` (gitignored), not `logs/` in repo

### Phase C — Admin parse debug UI (defer / staging only)

- [ ] **Expand row debug UI** — side-by-side field vs `source_snippet` for employers
- [ ] **Gate behind env flag** or non-prod only; recruiter does not need this for daily MVP
- [ ] **No dual Gemini API pass** unless Phase A quality is still poor on image PDFs

**Out of scope for now:** Production recruiter audit workflow; mandatory two-call Gemini pipeline.

---

## Hospital parse UX

From [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md). Data prerequisite is **done**.

### Done

- [x] **PR 2** — `hospitalMatch` util + `employer_hospital_suggestions` on parse response
- [x] **PR 3** — In-place facility linking on `EmployerCard` (avoid duplicate parsed vs search-added rows)
- [x] **PR 4** — Expand `GEMINI_VMS_FIELD_GUIDE` (unit beds vs hospital beds; no facility metrics from Gemini)

### Backlog

- [ ] **PR 1b** — Hospital search `pg_trgm` tuning (only if search feels weak in prod)
- [ ] **PR 5 (optional)** — Multi-license `licenses[]` if resumes often list several active licenses

---

## Hardening / VMS

See [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) and GitHub issues #10–#15. Parse audit Phases A–B belong here; defer Phase C unless actively tuning prompts.

### Files & exports

- [ ] **Standardize resume file names (include candidate name)** — downloads saved to a laptop should be easy to find: use a consistent pattern with **first + last name** (e.g. `Coon_Allison_VMS-Resume.docx` or `Allison-Coon-resume.pdf`), not UUIDs or generic `resume.docx`. **Today:** intake DOCX uses `resume-{lastName}.docx` ([`generate-docx.post.ts`](../server/api/generate-docx.post.ts)); admin hub uses `candidate-{id}.docx` ([`pages/admin.vue`](../pages/admin.vue)); email link page uses `resume.docx` ([`complete/[accessToken].vue`](../pages/intake/complete/[accessToken].vue)). Uploaded PDFs in storage use `{candidateId}/{uuid}-{original}` ([`storageUpload.ts`](../server/utils/storageUpload.ts)) — align storage + all download paths in one PR; sanitize for filesystem (no `/`, trim length)

---

## How to use this file

- Check items off when merged (or link PR number in the line).
- Keep **one concern per PR** per [git-pr-workflow](../.cursor/rules/git-pr-workflow.mdc).
- Pre-release: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
