# BUG_AUDIT — Slice 4 · `LicenseRepeater.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/LicenseRepeater.vue` (queue item 7) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/CredentialsChecklist.vue` |

## Summary

Empty state + dual add CTAs, labeled fields, and expiry validation (`aria-invalid` + status) are solid. Expiry mask formats on input by design. **Medium:** `removeRow` deletes `expiryErrors[index]` but does **not reindex** remaining keys — error messages can stick to the wrong license after delete.

---

## Action inbox (do this later)

### Must fix

_None that block adding licenses entirely._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-LR-M1** | Medium | Main | On `removeRow`, rebuild `expiryErrors` with shifted indices (or clear all) | `removeRow` ~29–36 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-LR-L1 | Low | Main | State `toUpperCase` on blur, not every `@input` | template ~116 |
| S4-LR-L2 | Low | Main | `aria-label` on Remove: “Remove license N” | ~105 |
| S4-LR-L3 | Low | Main | Prefer stable row keys if licenses gain client ids (`:key="index"` fragile) | ~101 |

### Tests / human smoke

- [ ] Empty → add first license CTA  
- [ ] Invalid partial expiry → blur shows amber + `aria-invalid`  
- [ ] Two rows, error on #2, remove #1 → error wrongly on new #2 (S4-LR-M1)  
- [ ] State uppercases while typing  

### Docs / tour

- [ ] Next: **CredentialsChecklist.vue**  
- [ ] Slice 4 not Done  

---

## Findings detail

### High

None.

### Medium

1. **`removeRow` ~29–36**  
   **Cause:** `delete errors[index]` leaves higher keys pointing at shifted rows.  
   **Fix suggestion:** Rebuild map with `i < index` keep / `i > index` → `i - 1`.

### Low

State uppercase-on-input; remove label; index keys.

### Solid

| Area | Notes |
| --- | --- |
| Empty | Hint + dashed first-add (`id="intake-field-licenses"`) |
| Expiry | Format helper + blur validate + status |
| Labels | `for`/`id` wired |
| Remove | Text button |
| Prefill | Highlight clear on edit |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** (re-validated) |
| Next queue file | **`components/intake/CredentialsChecklist.vue`** |
| Mark Slice 4 Done? | **No** |

## PHI

Scrubbed (no license numbers in report).
