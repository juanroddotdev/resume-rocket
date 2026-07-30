# BUG_AUDIT — Slice 4 · `MetricTile.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/MetricTile.vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Next file** | `components/intake/FieldValidityIcon.vue` |

## Summary

Read-only or editable tile; label/`for` when editable; no trim-on-input. Empty value shows blank (parent supplies placeholders).

## Action inbox

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-MT-L1 | Low | When non-editable and `value` empty, show em dash / “—” for clarity |

## Slice readiness

Next: **FieldValidityIcon.vue**.

## PHI

Scrubbed.
