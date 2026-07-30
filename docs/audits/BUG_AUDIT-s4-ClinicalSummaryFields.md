# BUG_AUDIT — Slice 4 · `ClinicalSummaryFields.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/ClinicalSummaryFields.vue` (queue item 10) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/EducationRepeater.vue` |

## Summary

Tiny form: years + equipment `v-model`, prefill clear, no trim-on-type. No loading/error paths needed. **Product note:** does not collect `average_patient_ratios` (also not gated in `vmsGapReview` today — confirm intentional defer vs manifest/snapshot).

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-CS-M1** | Medium | Main / product | Confirm where `average_patient_ratios` is collected; add here or document defer | this SFC + step 3 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-CS-L1 | Low | Main | Heading semantics for “Clinical summary” | ~10 |
| S4-CS-L2 | Low | Main | Explicit `:for` on labels | ~11–33 |

### Tests / human smoke

- [ ] Prefill clears on edit; values autosave  

### Docs / tour

- [ ] Next: **EducationRepeater.vue**  

---

## Findings detail

### Medium

Career ratios field absent from this SFC — not a crash; alignment with manifest/snapshot.

### Low

Heading / label `for`.

### Solid

Plain `v-model`; nested labels; prefill classes.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next | **`EducationRepeater.vue`** |
| Slice 4 Done? | **No** |

## PHI

Scrubbed.
