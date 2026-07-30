# BUG_AUDIT — Slice 4 · `DocxPreviewViewer.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/DocxPreviewViewer.vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Next file** | `components/intake/DocxPreviewSlideOver.vue` |

## Summary

Loading overlay + error/**Retry**, race-safe `renderGeneration`, unmount cleanup, labeled region. Lows: raw `Error.message`; silent no-op without `candidateId`.

## Action inbox

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-DV-L1 | Low | Stable user copy instead of raw `e.message` |
| S4-DV-L2 | Low | Empty state when no `candidateId` |

## Slice readiness

Next: **DocxPreviewSlideOver.vue**.

## PHI

Scrubbed.
