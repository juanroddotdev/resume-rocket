# Product & engineering backlog

Living task list for Resume Rocket. Epic context: [#16 hardening sprint](https://github.com/juanroddotdev/resume-rocket/issues/16).

**Related plans:** [MVP-PLAN.md](./MVP-PLAN.md) · [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) · [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md) · [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) · [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)

---

## Done recently

- [x] Hybrid hospital seed (CMS + ArcGIS) → Supabase — `scripts/seed_hospitals.py`, [HOSPITAL-DATA.md](./HOSPITAL-DATA.md)
- [x] Remove legacy demo `hospitals` rows (`source_id IS NULL`)
- [x] Smoke: facility search + seeded data

---

## UX — intake (requested)

### Parse progress animation (Step 0 upload)

**Goal:** After upload, show clear motion/progress so the screen does not look frozen while `/api/parse` runs (often 10–30+ seconds for vision PDFs).

**Today:** [`FileDropZone.vue`](../components/intake/FileDropZone.vue) sets `parseStage` text only (`Reading file…`, `Reading and scanning document…`) — no spinner, steps, or timed stage progression.

**Ideas to implement:**

- Visible spinner or pulse on the drop zone + staged labels (upload → extract text → AI scan → saving)
- Optional timed stage copy when the request is long (align with `document_scan` / partial parse outcomes)
- Keep error + **Continue manually** path per [empty-error-states](../.cursor/rules/empty-error-states.mdc)
- Respect `prefers-reduced-motion` for accessibility

**Files likely touched:** `components/intake/FileDropZone.vue`, maybe `pages/intake/[token].vue`

---

### Reorder employment / facility cards (Step 2)

**Goal:** Let the candidate move employer cards **up/down** so `{#professional_experiences}` in the final DOCX follows their preferred order.

**Today:** [`employers[]`](../types/candidate.ts) order in the form is insert order (parse + add hospital). [`docxBuilder`](../server/utils/docxBuilder.ts) maps `candidate.employers` in array order. No reorder UI on [`EmployerCard`](../components/intake/EmployerCard.vue) / [`HospitalAutocomplete`](../components/intake/HospitalAutocomplete.vue).

**Ideas to implement:**

- Per-card **Move up** / **Move down** (or drag handle) on `EmployerCard`
- Persist order via existing PATCH / `useCandidateForm` autosave
- Disable up on first row, down on last; empty-state copy unchanged
- Quick test: two employers reordered → DOCX section order matches

**Files likely touched:** `components/intake/EmployerCard.vue`, `pages/intake/[token].vue`, `composables/useCandidateForm.ts`

---

## Hospital parse UX (from [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md))

Data prerequisite is **done**. Remaining app work:

- [ ] **PR 2** — `hospitalMatch` util + `employer_hospital_suggestions` on parse response
- [ ] **PR 3** — In-place facility linking on `EmployerCard` (avoid duplicate parsed vs search-added rows)
- [ ] **PR 4** — Expand `GEMINI_VMS_FIELD_GUIDE` (unit beds vs hospital beds; no facility metrics from Gemini)
- [ ] **PR 1b** — Hospital search `pg_trgm` tuning (only if search feels weak in prod)
- [ ] **PR 5 (optional)** — Multi-license `licenses[]` if resumes often list several active licenses

---

## Hardening / VMS (when scheduled)

See [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) and GitHub issues #10–#15. Defer unless explicitly in scope for the next PR.

---

## How to use this file

- Check items off here when merged (or link PR number in the line).
- Keep **one concern per PR** per [git-pr-workflow](../.cursor/rules/git-pr-workflow.mdc).
- Pre-release: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
