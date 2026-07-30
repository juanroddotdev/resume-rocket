# QA_REPORT — Slice 3 · `vmsGapReview`

| | |
| --- | --- |
| **Agent** | 1 QA |
| **Slice** | 3 — Wizard data utils |
| **Focus** | `utils/vmsGapReview.ts` |
| **Date** | 2026-07-28 |
| **Base** | `main` @ `1281cb4` · branch `test/tour-s3-vmsGapReview` |
| **Ship** | no |
| **Production edits** | none |

## Summary

Added dedicated `tests/vmsGapReview.test.mjs` for gap-review contract: required identity/specialty/employer/license/education fields, whitespace-as-empty, legacy license scalars, per-index employer EMR/date/scope gaps, graduation month normalization, and non-blocking employer-link advisories. Existing phase4 snapshot test still covers “complete form → no removed-field IDs.” Next Slice 3 Agent 1 run: `professionalSnapshot`.

---

## Action inbox (do this later)

### Must fix

_None from this module._ Complete forms clear; empties/whitespace flag correctly.

### Should fix (Side / Main)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S3-VR-M1 | Medium | Main | Advisory label when `employer.name` is empty renders as `": link facility…"` — consider fallback label (“Employer N”) | `computeEmployerLinkAdvisories` |
| S3-VR-M2 | Low | Main | Incomplete license rows are ignored entirely when **any** complete license exists — confirm product intent (submit with incomplete extra rows OK?) | `hasCompleteLicense` usage in `vmsGapReview.ts` |

### Suggested

| ID | Priority | Owner | What |
| --- | --- | --- | --- |
| S3-VR-L1 | Low | Agent 1 | Continue queue: `professionalSnapshot` next (`test/tour-s3-professionalSnapshot`) |

### Tests (this run — done)

- [x] Complete form → `[]`
- [x] Whitespace / null / undefined identity → step 1 ids
- [x] Empty / blank specialty; empty employers
- [x] Employer start/end/scope/EMR per index
- [x] Long strings do not false-positive
- [x] No licenses vs legacy scalars vs incomplete row
- [x] Education missing / invalid month / named month
- [x] Step numbers 1/2/3
- [x] Employer link advisories (none / unlinked / linked / empty name)

### Human smoke

- [ ] Gap review blocks submit when required tags empty (RELEASE / intake complete)
- [ ] Unlinked employer shows recommended link hint without blocking

### Docs / tour

- [ ] After more Slice 3 modules land, Agent 5 updates tour progress
- [ ] Do not mark RELEASE boxes from this report alone

---

## Cases covered

| Suite | Cases |
| --- | --- |
| `computeMissingTemplateFields` | 13 (complete, identity whitespace, specialties, employers, EMR index, long strings, licenses, education, steps) |
| `computeEmployerLinkAdvisories` | 4 |

Also still covered in `tests/phase4Snapshot.test.mjs` (July template non-required fields).

---

## Slice readiness (this module)

| | |
| --- | --- |
| `vmsGapReview` util tests | **Done** |
| Next queue item | `professionalSnapshot` |
| Slice 3 End (all queue modules) | **Not yet** |

---

## PHI

Synthetic only (`example.com`, placeholder hospital names). No resume text or real identifiers.
