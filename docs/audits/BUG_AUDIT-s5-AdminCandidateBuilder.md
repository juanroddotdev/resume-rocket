# BUG_AUDIT — Slice 5 · `AdminCandidateBuilder.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 5 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminProfessionalSnapshot.vue` |

## Summary

Load skeleton + `loadError` **Retry** are solid. Preview prepare errors flow into `DocxPreviewSlideOver` / review panel. **Submitted packets contradict themselves:** copy says use **Download draft**, but that button (and Preview) are `:disabled` when `!isEditable`. Autosave `IntakeSaveStatus` still has **no `@retry`** (same as **S4-SS-M1**). `actionError` is message-only. Several child editors lack `:disabled="!isEditable"` so submitted forms look editable while autosave is off.

---

## Action inbox (do this later)

### Must fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AB-H1 | High | Main | Allow **Download draft** (and optionally Preview) when status ≠ draft — only lock field edits. Today `:disabled="… \|\| !isEditable"` blocks download while banner tells recruiters to use it | toolbar ~422–437 + copy ~479–481 |

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AB-M1 | Medium | Main | Wire `@retry` on `IntakeSaveStatus` → `scheduleAutosave` / `flushAutosave` (**S4-SS-M1**) | ~420 |
| S5-AB-M2 | Medium | Main | `actionError`: Dismiss + Retry where applicable (download / mark submitted) | ~442–444 |
| S5-AB-M3 | Medium | Main | Pass `:disabled="!isEditable"` into SpecialtyChipInput, HospitalAutocomplete, CredentialsChecklist, ClinicalSummaryFields, EducationRepeater (identity already disables) | employment/credentials sections ~600–635 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AB-L1 | Low | Main | Mark-submitted dialog: focus trap / Escape | ~715–741 |
| S5-AB-L2 | Low | Main | Prefer fixed friendly strings over raw `e.message` for actionError | ~147, ~263 |
| S5-AB-L3 | Low | Main | Narrow slide margin when helper open + sidebar collapsed — verify small viewports don’t clip | `formSlidForHelper` ~345–347 |

### Human smoke

- [ ] Draft: edit → Saving/Saved; force save fail → Retry after S5-AB-M1  
- [ ] Load fail → Retry  
- [ ] Preview prepare fail → slide-over Retry  
- [ ] **Submitted** candidate: Download draft works (after S5-AB-H1); fields locked  
- [ ] Mark submitted confirm → locks invite  
- [ ] Extra details / Employers jump + sidebar collapse slide  

### Docs / tour

Next: AdminProfessionalSnapshot → AdminExtraDetailsDrawer → AdminSupplementalBucket → ParseQAPanel → EmployersJumpDrawer (shared) → remaining admin components  

Cross-ref: API **S5-H1** still allows PATCH when status re-sent as submitted — UI lock alone is not enough.

---

## Findings detail

### High

**S5-AB-H1** — Download disabled for non-draft while UI instructs recruiters to download.

### Medium

Save Retry missing; actionError recovery; child controls not disabled when read-only.

### Low

Confirm dialog a11y; raw errors; helper slide layout.

### Solid

| Area | Notes |
| --- | --- |
| Load | Skeleton + Retry |
| Preview prepare | Error string + reload token to slide-over |
| No resume | Guidance when editable |
| Submitted banner | Intent clear (download broken until H1) |
| EMR advisory | Amber status before download |
| Drawers | Mutual exclusion extra vs employers jump |
| Dev fixture | Overlay + confirm replace |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminProfessionalSnapshot.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed.
