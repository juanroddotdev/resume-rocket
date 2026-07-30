# BUG_AUDIT — Slice 4 · `pages/intake/complete/[accessToken].vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI (**last queue file**) |
| **File** | `pages/intake/complete/[accessToken].vue` |
| **Date** | 2026-07-29 |
| **Ship** | no |
| **Production edits** | none |

## Summary

Post-submit download page: button loading label, generic error. Download stays clickable after failure (implicit retry) but no labeled Retry / recruiter guidance; empty `accessToken` still shows Download CTA.

## Action inbox

### Should fix

| ID | Priority | What | Where |
| --- | --- | --- | --- |
| **S4-CMP-M1** | Medium | On error: labeled **Try again** + recruiter guidance | template ~28–36 |
| **S4-CMP-M2** | Medium | Empty/invalid `accessToken` → unavailable empty (not Download) | script + template |

### Suggested

| ID | Priority | What |
| --- | --- | --- |
| S4-CMP-L1 | Low | Map 404 vs 5xx copy (no PHI) |
| S4-CMP-L2 | Low | `role="alert"` on error |
| S4-CMP-X1 | Low | Confirm access_token entropy (Slice 5 / Main) |

### Human smoke

- [ ] Valid confirmation link → download  
- [ ] Bad token → error + recovery after S4-CMP-M1/M2  

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Queue complete? | **Yes** (re-validated file-by-file) |
| Mark Slice 4 Done? | **After** Agent 5 / you accept Highs ticketed + human smoke |

## PHI

Scrubbed (no tokens in report).
