# BUG_AUDIT — Slice 4 · `EmployerCard.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/EmployerCard.vue` (queue item 3) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/FacilityNameCombobox.vue` |

## Summary

Deck expand a11y (`aria-expanded` / `aria-controls`), missing-name header, empty metrics hint, Google verify labeled button, and line-list drafts (focus-guarded, no mid-edit overwrite) are solid. Main footgun: **`onBedsInput` trims + `parseInt` every keystroke** and clears the controlled `:value` on non-numeric input. State also **uppercases every `@input`** (Low). Collapsed panel uses `pointer-events-none` + `aria-hidden` but not `inert` (Low).

---

## Action inbox (do this later)

### Must fix

_None that blank the card with no guidance._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-EC-M1** | Medium | Main | Beds: don’t wipe on partial/invalid keystrokes; string draft while focused, parse on blur (mirror `lineDrafts`) | `onBedsInput` ~235–243 + template ~660–669 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-EC-L1 | Low | Main | Uppercase state on **blur**, not every `@input` | template ~446 |
| S4-EC-L2 | Low | Main | Collapsed panel: prefer `inert` (when supported) so focus cannot land inside `aria-hidden` | panel ~393–397 |
| S4-EC-L3 | Low | Main | Deck header: `aria-label` with employer index when name missing | header ~355–363 |

### Tests / human smoke

- [ ] Expand/collapse deck; sticky header while scrolling fields  
- [ ] Type beds with letters / mid-edit clear — repro S4-EC-M1  
- [ ] Unlinked: trauma/teaching/Magnet + Google verify  
- [ ] Linked: metrics tiles + Change facility  
- [ ] Optional floated/equipment/highlights: Space/newlines while focused  

### Docs / tour

- [ ] Next: **FacilityNameCombobox.vue**  
- [ ] Slice 4 not Done  

---

## Findings detail

### High

None.

### Medium

1. **`onBedsInput` ~235–243**  
   **Cause:** `trim()` + `parseInt` on each input; non-finite → `beds: undefined` → `:value` becomes `''`, eating in-progress typing.  
   **Fix suggestion:** Local string ref while focused; commit number (or clear) on blur.

### Low

State `toUpperCase` on input; collapsed-panel focus; richer expand `aria-label`.

### Solid

| Area | Notes |
| --- | --- |
| Empty name | Italic “Hospital name not set” |
| Empty metrics | Hint when expanded and line empty |
| Google verify | Text button + `aria-label` |
| Line textareas | Focus lock vs prop sync |
| Most fields | Raw `@input` value (no trim-on-type) |
| Expand control | Button + `aria-expanded` / `aria-controls` |
| Change facility | Text control |
| ResizeObserver | Disconnected via `onUnmounted` inside mount |

### Deferred

`FacilityNameCombobox`, `EmrSystemCombobox`, `MetricTile` — later queue / child files.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/FacilityNameCombobox.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed.
