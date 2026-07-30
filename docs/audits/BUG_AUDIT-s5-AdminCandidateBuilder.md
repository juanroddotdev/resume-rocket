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

Load skeleton + `loadError` **Retry** are solid. Preview prepare errors flow into `DocxPreviewSlideOver` / review panel. **S5-AB-H1 / M1 / M2 / M3** shipped in #165 / #168 (Download/Preview when submitted; autosave Retry; actionError Dismiss/Retry; child editors `:disabled` when `!isEditable`). Remaining items are Low polish.

---

## Action inbox (do this later)

### Must fix

_None remaining — **S5-AB-H1** resolved in #165._

### Should fix

_None remaining — **S5-AB-M1 / M2 / M3** resolved in #168._

### Resolved

| ID | Resolved in | Notes |
| --- | --- | --- |
| S5-AB-H1 | #165 | Preview + Download enabled when not editable |
| S5-AB-M1 | #168 | `IntakeSaveStatus` `@retry` → `flushAutosave` |
| S5-AB-M2 | #168 | actionError Dismiss + Retry |
| S5-AB-M3 | #168 | Employment/credentials editors respect `!isEditable` |
| S5-AB-L2 | #168 | Friendly fixed strings for download / mark-submitted errors |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AB-L1 | Low | Main | Mark-submitted dialog: focus trap / Escape | ~715–741 |
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

Cross-ref: API **S5-H1** resolved in #165 — UI lock is no longer the only defense.

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
