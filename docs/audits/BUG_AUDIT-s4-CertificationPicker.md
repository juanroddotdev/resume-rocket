# BUG_AUDIT — Slice 4 · `CertificationPicker.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/CertificationPicker.vue` (queue item 9) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/ClinicalSummaryFields.vue` |

## Summary

Combobox matches EMR picker: labeled input, keyboard nav, empty / all-selected messages, filters selected keys from search and drill-in. **Medium:** category badge counts use **full group size** (`certCategoryOptionCount`), not remaining selectable — can show “5” then open an empty category.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-CP-M1** | Medium | Main | Count (and optionally hide) categories by **unselected** options only | `certCategoryOptionCount` / browse ~71–75 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-CP-L1 | Low | Main | Clear blur `setTimeout` on unmount | `onBlur` |
| S4-CP-L2 | Low | Main | Indexed `for` instead of `indexOf` in `menuItems` | ~54 |

### Tests / human smoke

- [ ] Browse → pick → chip in parent  
- [ ] Search empty copy; select-all category → misleading count (S4-CP-M1)  
- [ ] Keyboard arrows/Enter/Escape  

### Docs / tour

- [ ] Next: **ClinicalSummaryFields.vue**  

---

## Findings detail

### Medium

1. **`certCategoryOptionCount` returns full group length** while drill-in filters `selectedKeys` — empty category UX.

### Low

Blur timer; `indexOf` in loop.

### Solid

Combobox a11y; filters selected; empty messages.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next | **`ClinicalSummaryFields.vue`** |
| Slice 4 Done? | **No** |

## PHI

Scrubbed.
