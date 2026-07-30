# BUG_AUDIT — Slice 5 · `EmployersJumpDrawer.vue` (admin shared)

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 10 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Note** | Shared with intake; S4 report may live on unmerged `docs/bug-audit-s4-intake` — this is the admin-context pass |
| **Next file** | `components/admin/AdminNavMenu.vue` |

## Summary

Empty list, Escape/Close, attention dots, and move/remove controls match the intake audit (lows: generic aria-labels, reduced-motion, remove confirm). **Admin gap:** builder can open this drawer while `!isEditable` (Employers control not disabled on submitted), so remove/reorder mutate local form without save — confusing read-only mode (pairs with **S5-AB-M3**).

---

## Action inbox (do this later)

### Must fix

_None in the drawer alone._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-JD-M1 | Medium | Main | When builder `!isEditable`: don’t open jump drawer, or pass `disabled` and hide remove/reorder (select-only) | `AdminCandidateBuilder` Employers button + optional drawer prop |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-JD-L1 | Low | Main | Aria-labels include employer name | ~146–168 |
| S5-JD-L2 | Low | Main | Reduced-motion on slide transition | style ~182–192 |
| S5-JD-L3 | Low | Main | Confirm before remove | `onRemove` |

### Human smoke

- [ ] Admin: open Employers → jump / reorder / remove (draft)  
- [ ] Empty list copy  
- [ ] Submitted: drawer should not allow destructive edits after S5-JD-M1  

### Docs / tour

Remaining admin SFCs: **AdminNavMenu** → AdminSectionTabs → AdminCandidateBuilderSkeleton (light) → then Slice 5 UI queue complete (API pass separate).

---

## Findings detail

### Medium

**S5-JD-M1** — Read-only builder still allows mutate via jump drawer.

### Low

Same polish as intake jump drawer.

### Solid

| Area | Notes |
| --- | --- |
| Empty | Status guidance |
| Escape | Works; listener cleaned up |
| Admin wiring | select/remove/move connected in builder |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminNavMenu.vue`** |
| Mark Slice 5 Done? | **No** — 2–3 small admin SFCs left |

## PHI

Scrubbed.
