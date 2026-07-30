# BUG_AUDIT — Slice 4 · `SpecialtyChipInput.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/SpecialtyChipInput.vue` (queue item 5) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/EmrSystemCombobox.vue` |

## Summary

Empty hint, Add button, remove with `aria-label`, and draft without mid-keystroke trim are solid. Mediums: **Space commits a chip** (blocks multi-word units like “Med Surg”; placeholder advertises Space); **label not wired with `for`/`id`**. Low: generic “Remove” label; silent duplicate add.

---

## Action inbox (do this later)

### Must fix

_None (still usable)._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-SC-M1** | Medium | Main | Drop **Space** as delimiter (keep Enter/comma); update placeholder | `onKeydown` ~41–47 |
| **S4-SC-M2** | Medium | Main | `<label :for>` ↔ input `id` when `fieldId` set | template ~62–66 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-SC-L1 | Low | Main | `aria-label="Remove {{ chip }}"` | ~84 |
| S4-SC-L2 | Low | Main | Duplicate: brief “Already added” instead of silent no-op | `addChip` ~28–32 |

### Tests / human smoke

- [ ] Empty → hint  
- [ ] Enter / comma add; Space currently adds (repro S4-SC-M1)  
- [ ] Remove chip via button  

### Docs / tour

- [ ] Next: **EmrSystemCombobox.vue**  
- [ ] Slice 4 not Done  

---

## Findings detail

### High

None.

### Medium

1. **Space delimiter ~41–47**  
   **Cause:** Space with non-empty draft commits — multi-word specialties impossible as one chip.  
   **Fix suggestion:** Remove Space branch; keep Enter + comma.

2. **Label association ~62–66**  
   **Cause:** Label has no `for`; input id only if `fieldId` set.  
   **Fix suggestion:** `:for="\`intake-field-${fieldId}\`"` when present.

### Low

Generic remove label; silent duplicate.

### Solid

| Area | Notes |
| --- | --- |
| Empty | Hint when no chips |
| Draft | Trim only on commit |
| Add | Visible text button |
| Remove | Has `aria-label` (generic) |
| Prefill | Highlight + clear on edit |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/EmrSystemCombobox.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed.
