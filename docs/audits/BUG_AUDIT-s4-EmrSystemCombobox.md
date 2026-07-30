# BUG_AUDIT — Slice 4 · `EmrSystemCombobox.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/EmrSystemCombobox.vue` (queue item 6) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/LicenseRepeater.vue` |

## Summary

Solid combobox: browse + search, `editing` flag prevents mid-keystroke overwrite from `modelValue`, keyboard arrows/Enter/Escape, empty “No matching systems.” No trim-on-type. Lows only: blur `setTimeout` not cleared on unmount; custom option uses emoji; `indexOf` inside `menuItems` loop.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

_None required for empty/error/loading or controlled-input correctness._

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-EMR-L1 | Low | Main | Clear blur `setTimeout` on unmount (or mounted flag) | `onBlur` ~187–195 |
| S4-EMR-L2 | Low | Main | Replace `➕` with text (“Use …”) for SR noise | template ~333 |
| S4-EMR-L3 | Low | Main | Build `rowIndex` with indexed `for` instead of `indexOf` in loop | `menuItems` ~58–67 |

### Tests / human smoke

- [ ] Focus → category browse → drill in → select  
- [ ] Type query → filter + custom commit  
- [ ] Escape restores committed label; arrows/Enter work  
- [ ] No matches → empty message  

### Docs / tour

- [ ] Next: **LicenseRepeater.vue**  
- [ ] Slice 4 not Done  

---

## Findings detail

### High / Medium

None.

### Low

Blur timer leak risk; emoji; `indexOf` in loop.

### Solid

| Area | Notes |
| --- | --- |
| Controlled input | `editing` + display vs query split |
| A11y | combobox / listbox / option + `aria-activedescendant` |
| Keyboard | Open on arrows; Escape backs / closes |
| Empty | “No matching systems.” |
| Browse | Categories when query empty |
| Commit | `commitEmrValue` on select; no mid-type format |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/LicenseRepeater.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed.
