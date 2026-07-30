# QA_REPORT — Slice 6 · DOCX mapping

| | |
| --- | --- |
| **Agent** | 1 QA |
| **Slice** | 6 — DOCX + template |
| **Date** | 2026-07-30 |
| **Updated** | 2026-07-30 — inbox sync after #165 / #168 |
| **Base** | `main` (post-#168) |
| **Ship** | no |
| **Production edits** | none |

## Summary

`tests/docxBuilder.test.mjs` covers snapshot_line inclusion and **S6-H1** (home TX + license CA → `candidate_state` is TX — fixed in #165). Mapping/inventory/smoke scripts remain in `npm run test` / `test:release`. No PHI fixtures.

---

## Action inbox

### Must fix (Main — from Agent 2)

_None remaining — **S6-H1** resolved in #165._

### Should fix

| ID | What |
| --- | --- |
| S6-M2 | Confirm orphan builder keys vs template (still open) |

### Resolved

| ID | Resolved in | Notes |
| --- | --- | --- |
| S6-H1 | #165 | Home state for `candidate_state`; test expects `TX` |
| S6-M1 | #168 | Friendly generate-docx catch |

### Tests done this run

- [x] Empty / not-included snapshot lines omitted from `snapshot_lines`
- [x] Included valued lines present with DOCX labels
- [x] S6-H1 regression: home state wins over license state
- [x] Prior suite + `npm run test` scripts still green

### Human smoke (still you)

- [ ] Open generated DOCX in Word — no empty snapshot bullets
- [ ] Home state ≠ license state → header location shows home

### Docs / tour

Agent 1 Slice 6 report filed; Slice End still needs Word smoke (Musts closed).

---

## Cases covered

| Case | Where |
| --- | --- |
| Snapshot include/exclude | `docxBuilder.test.mjs` |
| S6-H1 home vs license | same |
| Sanitize / sparse / metrics / licenses / certs | existing tests |
| Full fixture + inventory | `scripts/test-docx-mapping.mjs`, `inventory-template-tags.mjs` via `npm test` |

## Slice readiness

| Question | Answer |
| --- | --- |
| Agent 1 Slice 6 done? | **Yes** (tests + report) |
| Mark Slice 6 tour Done? | **No** until human Word check |

## PHI

Scrubbed.
