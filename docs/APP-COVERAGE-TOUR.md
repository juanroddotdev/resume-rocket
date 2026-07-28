# App coverage tour

Start-to-end path for Agents **1 / 2 / 5** to cover the product surfaces that matter. Not every file in the repo — every **risk slice** on the invite → parse → wizard → DOCX → admin loop.

**Prompts:** [`.cursor/agents/`](../.cursor/agents/) · **Paste-ready kickoffs:** [`.cursor/agents/kickoffs/`](../.cursor/agents/kickoffs/README.md) · **Lanes:** [AGENT-LANES.md](./AGENT-LANES.md) · **Backlog:** [TODO.md](./TODO.md) · **Release:** [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)

---

## How to use

1. Work **one slice at a time** in order **0 → 7** (do not skip ahead unless that slice is already Done).
2. Open a **new Agent chat** and paste the matching file from [`.cursor/agents/kickoffs/`](../.cursor/agents/kickoffs/README.md) (do not invent Allowed paths).
3. Inside a slice: **Agent 5** (truth) → **Agent 2** (audit) → **you** fix Highs / ticket Mediums → **Agent 1** (tests for that slice). Agents that write use **their own branch from `main`**.
4. Mark the slice Done in the progress table below when its **End criteria** are met.

**Out of tour (ignore unless a ticket names them):** `components/archive/`, historical `docs/archive/`, one-off scratch scripts, untracked local assets.

---

## Progress

Update when a slice closes (optional PR #).

| Slice | Name | Status | Closed |
| --- | --- | --- | --- |
| 0 | Map / docs truth | [ ] Not started | |
| 1 | Invite + upload gate | [ ] Not started | |
| 2 | Parse core | [ ] Not started | |
| 3 | Wizard data utils | [ ] Not started | |
| 4 | Intake UI | [ ] Not started | |
| 5 | Admin UI | [ ] Not started | |
| 6 | DOCX + template | [ ] Not started | |
| 7 | Release close | [ ] Not started | |

**Tour complete when** Slice 7 is Done: RELEASE rows tagged Automated vs Manual, `npm run test:release` green, human smoke list is short and honest.

---

## Slice cards

### Slice 0 — Map / docs truth

| | |
| --- | --- |
| **Goal** | Turn “behind” into a ranked backlog; stop lying checkboxes |
| **Primary agent** | **5** |
| **Also** | 2/1 idle |
| **Scan / write roots** | `docs/TODO.md`, `docs/RELEASE-CHECKLIST.md`, `docs/MANUAL-TEST-CHECKLIST.md`, `docs/AGENT-LANES.md`, this file, open issues #14 #15 #16 #97 |
| **End** | Ranked backlog: stale / automate / human-smoke / defer; What’s next not wildly outdated |

### Slice 1 — Invite + upload gate

| | |
| --- | --- |
| **Goal** | Nobody reaches wizard without a valid invite; upload entry fails gracefully |
| **Primary** | **2** then **1** |
| **Roots** | `server/api/invites.post.ts`, `server/api/invites/validate.get.ts`, `server/utils/requireInvite.ts`, `server/utils/docxAccess.ts`, `composables/useIntakeInvite.ts`, `pages/intake/[token].vue` (upload step only — read), `components/intake/FileDropZone.vue`, `components/intake/IntakeProcessingCard.vue`, `components/intake/ParseNoticeBanner.vue` |
| **Agent 1 focus** | Invite header/token helpers already tested — extend edge cases; MIME/auth unit seams if extractable without rewriting handlers |
| **End** | Invalid/expired token + missing header paths audited; tests or RELEASE human-smoke row for browser bits |

### Slice 2 — Parse core

| | |
| --- | --- |
| **Goal** | Parse never hard-crashes intake; rate limit + partial/document_scan flags honest |
| **Primary** | **2** then **1** |
| **Roots** | `server/api/parse.post.ts`, `server/utils/parseCandidateResume.ts`, `server/utils/geminiShared.ts`, `server/utils/geminiParse.ts`, `server/utils/geminiDocumentParse.ts`, `server/utils/geminiErrors.ts`, `server/utils/parseHeuristics.ts`, `server/utils/parseResponse.ts`, `server/utils/parseRateLimit.ts`, `server/utils/parseOutcomeLog.ts`, `server/utils/extractText.ts`, `server/utils/normalizeCandidate.ts`, `server/utils/storageUpload.ts`, `server/api/admin/candidates/[id]/parse.post.ts` |
| **Agent 1 focus** | TODO #14 Phase 1: mocked parse route tests, recorded fixtures (no PHI), rate-limit util tests |
| **End** | 401/429/MIME/partial_parse covered or ticketed; graceful Gemini missing/503 documented |

### Slice 3 — Wizard data utils

| | |
| --- | --- |
| **Goal** | Pure data paths don’t corrupt PATCH/DOCX (nulls, long strings, trim-on-type bugs) |
| **Primary** | **1** (heavy) + light **2** |
| **Roots (queue — one module per Agent 1 run)** | `utils/vmsGapReview.ts`, `utils/professionalSnapshot.ts`, `utils/employerLink.ts`, `utils/employerLineList.ts`, `utils/employerMetricsLine.ts`, `utils/employerClinicalFlags.ts`, `utils/emrSystem.ts`, `utils/emrSearch.ts`, `utils/licenseRows.ts`, `utils/certificationOptions.ts`, `utils/educationGraduation.ts`, `utils/credentialExpiry.ts`, `utils/employmentType.ts`, `utils/traumaLevel.ts`, `utils/supplementalBucket.ts`, `utils/adminCandidateForm.ts`, `utils/intakeDraft.ts`, `utils/intakeWizardStep.ts`, `utils/resumeDownloadFilename.ts`, `utils/displayResumeFilename.ts`, `utils/facilityGoogleSearch.ts`, `server/utils/schemas.ts`, `server/utils/hospitalMatch.ts`, `server/utils/parseEmployerSuggestions.ts` |
| **End** | Each listed module has tests **or** an explicit defer note in the Agent 5 backlog; gap-review matches manifest Required rows |

### Slice 4 — Intake UI

| | |
| --- | --- |
| **Goal** | Wizard UX: empty/error/loading; no silent broken cards |
| **Primary** | **2** file-by-file; **1** only for logic extracted in utils |
| **Queue** | `pages/intake/[token].vue` → `HospitalAutocomplete.vue` → `EmployerCard.vue` → `FacilityNameCombobox.vue` → `SpecialtyChipInput.vue` → `EmrSystemCombobox.vue` → `LicenseRepeater.vue` → `CredentialsChecklist.vue` → `CertificationPicker.vue` → `ClinicalSummaryFields.vue` → `EducationRepeater.vue` → `IntakeReviewPanel.vue` → `DocxPreviewSlideOver.vue` / `DocxPreviewViewer.vue` → remaining intake components → `pages/intake/complete/[accessToken].vue` |
| **Also read** | `composables/useCandidateForm.ts`, `useIntakeWizardNav.ts`, `useHospitalSearch.ts`, `useIntakePrefillHighlight.ts` |
| **End** | Each queued file audited once; Highs fixed or ticketed; empty-error-states satisfied or deferred |

### Slice 5 — Admin UI

| | |
| --- | --- |
| **Goal** | Recruiter hub + builder safe for daily use |
| **Primary** | **2** file-by-file |
| **Queue** | `pages/admin.vue` → `AdminCandidateList.vue` → `CandidatesTable.vue` → `NewCandidatePacketModal.vue` → `AdminCandidateBuilder.vue` → `AdminProfessionalSnapshot.vue` → `AdminExtraDetailsDrawer.vue` → `AdminSupplementalBucket.vue` → `ParseQAPanel.vue` → `EmployersJumpDrawer.vue` (shared) → remaining admin components |
| **Also read** | `composables/useAdminCandidateWorkspace.ts`, `useAdminHubMenu.ts`, `useAdminBuilderSectionSpy.ts` |
| **API roots (Agent 2 pass)** | `server/api/admin/**`, `server/api/candidates/**`, `server/utils/requireAdmin.ts`, `server/utils/patchCandidateRow.ts`, `server/utils/candidateDraftResponse.ts`, `server/api/candidates/[id]/send-confirmation.post.ts`, `server/utils/sendEmail.ts` |
| **End** | Builder/list/snapshot/drawers audited; Highs fixed or ticketed |

### Slice 6 — DOCX + template

| | |
| --- | --- |
| **Goal** | Contract output trustworthy |
| **Primary** | **1** + script smokes; **2** on builder edge cases |
| **Roots** | `server/utils/docxBuilder.ts`, `server/api/generate-docx.post.ts`, `server/assets/template.docx` (**read-only** unless a named template ticket), `scripts/inventory-template-tags.mjs`, `scripts/test-docx-mapping.mjs`, `scripts/smoke-docx-template.mjs`, `utils/downloadResumeDocxClient.ts`, `utils/fetchPreviewDocx.ts` |
| **Agent 1 focus** | DOCX XML spot-checks; mapping regressions; filename helpers |
| **End** | `npm run test:release` includes inventory + mapping + smoke; no unmapped tags |

### Slice 7 — Release close

| | |
| --- | --- |
| **Goal** | Honest pre-deploy bar |
| **Primary** | **5**; **you** run human-smoke rows |
| **Roots** | `docs/RELEASE-CHECKLIST.md`, `docs/MANUAL-TEST-CHECKLIST.md`, `docs/TODO.md` test automation section, this progress table |
| **End** | Each RELEASE row tagged Automated (CI) / Manual / Optional; manual list short; tour progress all Done or explicitly deferred with reason |

---

## Parallelism cheat sheet

| Slice | Safe parallel |
| --- | --- |
| 0 | Agent 5 only |
| 1–2 | Agent 2 (server read) \|\| Agent 1 (`tests/` only) |
| 3 | Agent 1 on one util; Agent 2 on next util folder (read) |
| 4–5 | Agent 2 one Vue file; do not parallel two writers on same SFC |
| 6 | Agent 1 tests/scripts \|\| Agent 2 read docxBuilder |
| 7 | Agent 5 only (+ your browser) |

---

## Shared kickoff fields

```text
Slice: 0-7
Lane: Backfill
Agent: 1 | 2 | 5
Ticket: Coverage tour slice N — <short name>
Allowed paths: <from slice card>
Locked paths: <Main WIP or blank>
Ship: no
```
