# Kickoff — Slice 4 · Agent 2 (Bug Hunter) — intake UI file-by-file

Paste into a **new Agent chat**. After each file, tell me the next queue item; I’ll re-paste or say “continue with \<file\>”.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 4).

```text
Slice: 4
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 4 — intake UI audit
Allowed paths: pages/intake/[token].vue ; components/intake/ ; composables/useCandidateForm.ts ; composables/useIntakeWizardNav.ts ; composables/useHospitalSearch.ts ; composables/useIntakePrefillHighlight.ts
Locked paths:
Ship: no
Write report file: no
Next file: pages/intake/[token].vue
```

**Queue:** `[token].vue` → `HospitalAutocomplete.vue` → `EmployerCard.vue` → `FacilityNameCombobox.vue` → `SpecialtyChipInput.vue` → `EmrSystemCombobox.vue` → `LicenseRepeater.vue` → `CredentialsChecklist.vue` → `CertificationPicker.vue` → `ClinicalSummaryFields.vue` → `EducationRepeater.vue` → `IntakeReviewPanel.vue` → `DocxPreviewSlideOver.vue` / `DocxPreviewViewer.vue` → other intake components → `pages/intake/complete/[accessToken].vue`

**Git:** Chat-only unless I ask for `docs/audits/` → then `docs/bug-audit-s4-intake` from **`main`**. No production rewrites. No merge unless ship.

**Do:** Audit **only** `Next file` this run (plus directly required imports). Empty/error/loading, a11y labels on icon buttons, controlled-input footguns. End with next queue file name.
