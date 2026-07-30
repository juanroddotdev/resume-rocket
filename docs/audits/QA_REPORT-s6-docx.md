# QA_REPORT — Slice 6 · DOCX mapping

| | |
| --- | --- |
| **Agent** | 1 QA |
| **Slice** | 6 — DOCX + template |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `b48ecf1` · branch `test/tour-s6-docx` |
| **Ship** | no |
| **Production edits** | none |

## Summary

Extended `tests/docxBuilder.test.mjs` for snapshot_line inclusion rules and a **documented** S6-H1 regression pin (`candidate_state` still prefers license state). Existing mapping/inventory/smoke scripts already wire into `npm run test` / `test:release`. No PHI fixtures.

---

## Action inbox

### Must fix (Main — from Agent 2)

| ID | What |
| --- | --- |
| S6-H1 | Flip `candidate_state` to home state; then invert the pin test to expect `TX` |

### Should fix

| ID | What |
| --- | --- |
| S6-M1 | Friendly catch around `buildResumeDocx` in generate-docx |
| S6-M2 | Confirm orphan builder keys vs template |

### Tests done this run

- [x] Empty / not-included snapshot lines omitted from `snapshot_lines`
- [x] Included valued lines present with DOCX labels
- [x] S6-H1 current behavior pinned (`candidate_state` = license)
- [x] Prior suite + `npm run test` scripts still green

### Human smoke (still you)

- [ ] Open generated DOCX in Word — no empty snapshot bullets
- [ ] Home state ≠ license state → verify header location after S6-H1 fix

### Docs / tour

Agent 1 Slice 6 report filed; Slice End still needs Word smoke + S6-H1 fix.

---

## Cases covered

| Case | Where |
| --- | --- |
| Snapshot include/exclude | `docxBuilder.test.mjs` |
| S6-H1 pin | same |
| Sanitize / sparse / metrics / licenses / certs | existing tests |
| Full fixture + inventory | `scripts/test-docx-mapping.mjs`, `inventory-template-tags.mjs` via `npm test` |

## Slice readiness

| Question | Answer |
| --- | --- |
| Agent 1 Slice 6 done? | **Yes** (tests + report) |
| Mark Slice 6 tour Done? | **No** until S6-H1 + human Word check |

## PHI

Scrubbed.
