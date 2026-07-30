# BUG_AUDIT — Slice 4 · `EducationRepeater.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/EducationRepeater.vue` (queue item 11) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/IntakeReviewPanel.vue` |

## Summary

Empty CTAs, accordion a11y, location suggestion Accept/Dismiss, and non-formatting inputs look good. **Medium:** `activeIndex` starts at `-1` and the length watch is **not immediate**, so a **hydrated draft with education** can render with **no card expanded** until the user clicks a header.

---

## Action inbox (do this later)

### Must fix

_None that hide the empty state._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-ED-M1** | Medium | Main | When `modelValue.length > 0` and `activeIndex < 0`, select `0`. Prefer `immediate: true` on length watch | `activeIndex` + watch ~19–31 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-ED-L1 | Low | Main | Optional toggle-collapse on header click | `openCard` ~93–96 |
| S4-ED-L2 | Low | Main | Collapsed panel: `inert` when supported | panel |
| S4-ED-L3 | Low | Main | Remove: `aria-label="Remove education N"` | remove button |

### Tests / human smoke

- [ ] Empty → add first school  
- [ ] Restore draft with education → all collapsed until click (S4-ED-M1)  
- [ ] Location Accept/Dismiss; gap focus via `openEducationField`  

### Docs / tour

- [ ] Next: **IntakeReviewPanel.vue**  

---

## Findings detail

### Medium

1. **Hydrated draft starts with `activeIndex === -1`** — no expanded card until click.

### Low

Toggle-collapse; inert; remove label.

### Solid

Empty CTAs; gap-focus expose; location suggestion status; labeled fields.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next | **`IntakeReviewPanel.vue`** |
| Slice 4 Done? | **No** |

## PHI

Scrubbed.
