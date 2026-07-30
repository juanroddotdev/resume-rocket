# BUG_AUDIT — Slice 4 · `FileDropZone.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/FileDropZone.vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Overlap** | Prefer Slice 1 IDs for shared fixes |
| **Next file** | `components/intake/ParseNoticeBanner.vue` |

## Summary

Processing card + stage rotation, parse failure copy, 429 message, **Continue manually** present. Open gaps still owned by Slice 1: **401/403 still offer Continue manually** (**S1-M4**), **matchMedia leak** (**S1-L1**), **no client MIME/10MB gate** (**S1-L2**).

## Action inbox

### Should fix (Slice 1)

| ID | Priority | What |
| --- | --- | --- |
| S1-M4 | Medium | On 401/403 do not offer Continue manually |
| S1-L1 | Low | Remove matchMedia listener on unmount |
| S1-L2 | Low | Client MIME + 10MB check |

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-FD-L1 | Low | dragleave flicker / relatedTarget |
| S4-FD-L2 | Low | Explicit “Try another file” when errored |

## Slice readiness

Next: **ParseNoticeBanner.vue**.

## PHI

Scrubbed.
