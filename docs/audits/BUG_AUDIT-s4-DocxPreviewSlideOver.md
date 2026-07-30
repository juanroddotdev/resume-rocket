# BUG_AUDIT — Slice 4 · `DocxPreviewSlideOver.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/DocxPreviewSlideOver.vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Next file** | `components/intake/EmployersJumpDrawer.vue` |

## Summary

Escape close, scroll lock, preparing / no-draft empties. **Mediums:** `prepareError` without Retry; `aria-modal` without focus trap / initial focus.

## Action inbox

### Should fix

| ID | Priority | What |
| --- | --- | --- |
| **S4-SO-M1** | Medium | prepareError **Retry** |
| **S4-SO-M2** | Medium | Focus trap + initial focus on open |

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-SO-L1 | Low | Optional backdrop close |

## Slice readiness

Next: **EmployersJumpDrawer.vue**.

## PHI

Scrubbed.
