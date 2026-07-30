# BUG_AUDIT — Slice 4 · `CredentialsChecklist.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/CredentialsChecklist.vue` (queue item 8) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/CertificationPicker.vue` |

## Summary

Empty certs copy, chip remove with **sr-only** “Remove {cert}”, expiry `aria-label` / `aria-invalid` / status, and nested `LicenseRepeater` are solid. Expiry errors keyed by cert name (no reindex bug). Prefill highlight clears on add/remove. Low: expiry inputs skip `fieldClasses` (parse ring may not show).

---

## Action inbox (do this later)

### Must fix / Should fix

_None on this wrapper._ License reindex stays **S4-LR-M1**.

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-CC-L1 | Low | Main | Apply `fieldClasses(\`credential-${cert}\`)` on expiry inputs | template ~134–145 |
| S4-CC-L2 | Low | Main | Explicit `:for` on compact status label | ~156–163 |

### Tests / human smoke

- [ ] No certs → hint + picker  
- [ ] Add/remove chip; bad expiry → amber  
- [ ] Compact select + licenses  

### Docs / tour

- [ ] Next: **CertificationPicker.vue**  

---

## Findings detail

### High / Medium

None beyond child **S4-LR-M1**.

### Low

Expiry `fieldClasses`; compact label polish.

### Solid

Empty guidance; named remove; cert-keyed expiry errors; a11y attributes.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next | **`CertificationPicker.vue`** |
| Slice 4 Done? | **No** |

## PHI

Scrubbed.
