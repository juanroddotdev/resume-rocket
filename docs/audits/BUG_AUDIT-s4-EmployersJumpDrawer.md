# BUG_AUDIT — Slice 4 · `EmployersJumpDrawer.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/EmployersJumpDrawer.vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Next file** | `components/intake/IntakeSaveStatus.vue` |

## Summary

Empty list copy, Escape close, text Close, move/remove with `aria-label`, attention dot, `aria-current` solid. Lows: generic aria-labels (no employer name); transition ignores reduced motion; remove has no confirm.

## Action inbox

### Should fix

_None blocking._

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-JD-L1 | Low | Include employer name in move/remove `aria-label` |
| S4-JD-L2 | Low | `prefers-reduced-motion` on transition |
| S4-JD-L3 | Low | Optional confirm before remove |

## Slice readiness

Next: **IntakeSaveStatus.vue**. Slice 4 not Done.

## PHI

Scrubbed.
