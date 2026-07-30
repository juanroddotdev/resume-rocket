# BUG_AUDIT — Slice 4 · `FacilityNameCombobox.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/FacilityNameCombobox.vue` (queue item 4) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Also read** | `composables/useHospitalSearch.ts` |
| **Next file** | `components/intake/SpecialtyChipInput.vue` |

## Summary

Stronger than top-level hospital search: **combobox / listbox / option**, Arrow keys + Enter, loading / empty / suggestion headers, outside-click cleanup on unmount. Gaps: **`searchError` without Retry** (same as **S4-HA-M2**); inherits **stale-search race** from shared composable (**S4-HA-M3**). Input does not trim mid-keystroke.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-FN-M1** | Medium | Main | Search failure: **Retry** in menu (shared `retrySearch` with S4-HA-M2) | template ~173–175 |
| **S4-FN-M2** | Medium | Main | Fix search request sequencing in `useHospitalSearch` (same as **S4-HA-M3**) | `useHospitalSearch.ts` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-FN-L1 | Low | Main | Optional live region / focus cue when `searchError` appears | menu ~173–175 |
| S4-FN-L2 | Low | Main | Debounce clear on unmount (**S4-HA-L1**) | `useHospitalSearch.ts` |

### Tests / human smoke

- [ ] Focus → menu; type 2+ chars → Searching… → options  
- [ ] Arrow/Enter selects and emits `select`  
- [ ] No hits → empty hint; suggestions header when parse suggestions present  
- [ ] Network fail → red error + Retry (after S4-FN-M1)  
- [ ] Click outside closes; Escape closes  

### Docs / tour

- [ ] Next: **SpecialtyChipInput.vue**  
- [ ] Slice 4 not Done  

---

## Findings detail

### High

None.

### Medium

1. **`searchError` ~173–175**  
   **Cause:** Error text only; no recovery control.  
   **Fix suggestion:** Shared `retrySearch()` + button in menu (and HospitalAutocomplete).

2. **Shared search race**  
   **Cause:** Same as S4-HA-M3 — stale `$fetch` can overwrite results while typing.  
   **Fix suggestion:** Request id / AbortController in `useHospitalSearch`.

### Low

See Suggested.

### Solid

| Area | Notes |
| --- | --- |
| A11y | `combobox` / `listbox` / `option`, `aria-expanded`, `aria-activedescendant` |
| Keyboard | Escape, ArrowUp/Down, Enter |
| Loading | “Searching facilities…” |
| Empty | DB miss hint; suggestion fallback copy |
| Outside click | Removed on unmount |
| Input | No mid-keystroke trim |
| Select | `@mousedown.prevent` avoids blur-before-click |

### Contrast vs `HospitalAutocomplete`

Top-level search still uses click-only `<li>`s (**S4-HA-M1**). Prefer aligning that list to this combobox pattern.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/SpecialtyChipInput.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed.
