# BUG_AUDIT — Slice 4 · `HospitalAutocomplete.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/HospitalAutocomplete.vue` (queue item 2) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Also read** | `composables/useHospitalSearch.ts` |
| **Next file** | `components/intake/EmployerCard.vue` |

## Summary

Search loading, no-results + manual CTA, empty deck, duplicate messaging, and manual-name validation are solid. Mediums: facility hits are **click-only `<li>`s** (keyboard/a11y); `searchError` has no **Retry**; debounced `$fetch` has **no request sequencing** so a slow older response can overwrite newer results. Debounce timer not cleared on unmount (Low).

---

## Action inbox (do this later)

### Must fix

_None that leave the employers section blank with no guidance._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-HA-M1** | Medium | Main | Make search hits keyboard-activatable (`<button>` in each `li`, or listbox/combobox) | template ~207–217 |
| **S4-HA-M2** | Medium | Main | On `searchError`, add **Retry** (re-run last query ≥2 chars) | template ~223 + `useHospitalSearch` |
| **S4-HA-M3** | Medium | Main | Sequence/abort hospital search requests so stale responses cannot clobber newer queries | `useHospitalSearch.ts` ~22–35 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-HA-L1 | Low | Main | `onUnmounted` clear debounce timer | `useHospitalSearch.ts` |
| S4-HA-L2 | Low | Main | Prefer stable `:key` (hospitalId \|\| name + index) to reduce remount on rename | template ~283 |
| S4-HA-L3 | Low | Main | Manual city/state: `id`s matching labels | ~248–266 |

### Tests / human smoke

- [ ] Type 2+ chars → Searching… → results or no-results + manual CTA  
- [ ] Fail search → red error + Retry (after S4-HA-M2)  
- [ ] Fast typing: final results match final query (S4-HA-M3)  
- [ ] Duplicate facility → amber; manual empty name → validation  
- [ ] Keyboard: activate a result without mouse (S4-HA-M1)  
- [ ] View employers jump link when ≥1 employer  

### Docs / tour

- [ ] Continue file-by-file; next **EmployerCard.vue**  
- [ ] Do not mark Slice 4 Done  

---

## Findings detail

### High

None.

### Medium

1. **Results list ~207–217**  
   **Cause:** `<li @click>` only — not focusable; keyboard / SR users cannot add from search.  
   **Fix suggestion:** `<button type="button" class="w-full text-left …">` inside each `li`, or combobox + listbox.

2. **`searchError` ~223**  
   **Cause:** “try again” copy without control (`empty-error-states`).  
   **Fix suggestion:** Expose `retrySearch()` from composable; button under the error.

3. **Stale search race — `useHospitalSearch.ts` ~22–35**  
   **Cause:** Each debounce fires `$fetch` with closed-over `q`; later-finishing older request overwrites `results`.  
   **Fix suggestion:** Increment a request id / `AbortController`; ignore outdated responses.

### Low

Debounce leak on unmount; `:key` churn; manual field ids.

### Solid

| Area | Notes |
| --- | --- |
| Loading | `Searching…` |
| Empty search | No-results + manual CTA |
| Empty deck | Amber “Add at least one hospital…” |
| Manual validation | Name required + duplicate |
| Duplicate DB hit | Amber banner |
| Labels | Search + manual name labeled |
| Jump link | Text button with count |
| Reduced motion | `scrollIntoView` respects preference |
| Prefill metrics index | `markEmployerDbMetrics(length)` = new row index before parent re-render |

### Deferred

`EmployerCard` expand/fields, jump-drawer remove/reorder — next queue file.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/EmployerCard.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed: no facility PHI beyond generic placeholders in examples.
