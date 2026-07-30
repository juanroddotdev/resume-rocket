# BUG_AUDIT — Slice 5 · `AdminProfessionalSnapshot.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 6 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminExtraDetailsDrawer.vue` |

## Summary

Visibility/eye toggles, Yes/No flags, mismatch advisories, regenerate loading (“Proposing…”), no-resume amber copy, and `disabled` on controls look solid. Controlled inputs update on `@input` without trim-on-type. **Propose failure shows `role="alert"` but no Retry.** Source snippets can surface resume text in-admin (expected for recruiters; keep out of logs).

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-PS-M1 | Medium | Main | On `proposeError`, add **Retry** → `regenerateFromResume` (`empty-error-states`) | ~227 + `regenerateFromResume` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-PS-L1 | Low | Main | Prefer `userFacingGeminiError`-style copy over raw `err.message` | catch ~165–171 |
| S5-PS-L2 | Low | Main | Truncate long `sourceSnippet` in UI | ~316–317 |
| S5-PS-L3 | Low | Main | Disable “Go to Employment” mismatch CTA when `disabled` (optional) | ~325–331 |

### Human smoke

- [ ] Edit line + eye toggle; reset from wizard  
- [ ] No resume → regenerate disabled + amber hint  
- [ ] Regenerate success → notice; fail → Retry after fix  
- [ ] Mismatch → Go to Employment  
- [ ] Submitted (`disabled`) → controls inert  

### Docs / tour

Next: AdminExtraDetailsDrawer → AdminSupplementalBucket → ParseQAPanel → EmployersJumpDrawer → remaining  

---

## Findings detail

### Medium

**S5-PS-M1** — Error without recovery control.

### Low

Raw API messages; long snippets; mismatch CTA when read-only.

### Solid

| Area | Notes |
| --- | --- |
| Loading | `proposing` + button label |
| No resume | Status + disabled regenerate |
| Success notice | `role="status"` |
| Inputs | Not trim-reformat each keystroke |
| a11y | Eye `aria-pressed` / labels; flag `aria-pressed` |
| Disabled | Wired on inputs/buttons |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminExtraDetailsDrawer.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed. Admin UI may show resume snippets by design — do not copy them into tickets.
