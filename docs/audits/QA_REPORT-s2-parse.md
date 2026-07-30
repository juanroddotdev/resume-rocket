# QA_REPORT — Slice 2 · Parse core

| | |
| --- | --- |
| **Agent** | 1 QA |
| **Slice** | 2 — Parse core |
| **Date** | 2026-07-28 |
| **Base** | `main` @ `1281cb4` · branch `test/tour-s2-parse` |
| **Ship** | no |
| **Production edits** | none |
| **Issue** | Part of #16 · Addresses #14 Phase 1 (util seams; mocked `parse.post` still open) |

## Summary

Extended util-level coverage for invite parse rate limiting and parse response / outcome flags without live Gemini or real resumes. `partial_parse` / `document_scan` / `parse_failed` contracts are locked via pure flag helpers mirroring `parseCandidateResume`. Mocked `POST /api/parse` (401/429/MIME) remains a remaining #14 gap — ticketed below, not attempted (Nuxt handler + Supabase/Gemini auto-imports).

---

## Action inbox (do this later)

### Must fix (before calling Slice 2 “hardened”)

_None from this QA pass._ Util seams for rate limit + response flags are green.

### Should fix (Side / Main ticket — recommend one small PR)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S2-M1 | Medium | Agent 1 / Main | **Mocked `parse.post` / `parseCandidateResume` route tests** — MIME reject, missing invite → 401, rate limit → 429, `partial_parse` / `document_scan` on returned body, audit stripped | `tests/` + thin test seams or handler extract; see TODO #14 Phase 1 |
| S2-M2 | Medium | Main | Confirm graceful paths when `GEMINI_API_KEY` missing (text PDF heuristics; image PDF → friendly error + Continue manually) stay covered by RELEASE smoke | `docs/RELEASE-CHECKLIST.md` / human |

### Suggested (nice-to-have)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S2-L1 | Low | Agent 1 | Synthetic recorded fixture (no PHI) for heuristic-only merge golden | `tests/fixtures/` |
| S2-L2 | Low | Main | Optional: inject `Date.now` into `parseRateLimit` for deterministic window tests (current test uses short `setTimeout`) | `server/utils/parseRateLimit.ts` |

### Tests (this run — done)

- [x] `checkParseRateLimit` — under limit, block + `retryAfterSec`, per-token buckets
- [x] Edge: empty-string token bucket, `max: 0`, exact max, `retryAfterSec >= 1`, window reset, store reset
- [x] Parse response contract — success, total failure, `partial_parse`, `document_scan`
- [x] Flag invariant — `partial_parse` never true when `parse_failed`
- [x] `parsedResumeToApiFields` null / mapping / empty employers
- [x] `countParsedFields` empty strings/arrays; licenses once
- [x] `countDetectedCredentials` undefined/empty
- [x] `credentialsInputFromParsed` null, canonical certs, details + expiry
- [x] `hasParsedFields` credentials-only → partial path; empty → failure
- [ ] Mocked `parse.post` 401/429/MIME — **deferred (S2-M1)**

### Human smoke (you)

From `docs/RELEASE-CHECKLIST.md` / graceful degradation:

- [ ] Missing invite on parse → 401 (not wizard advance)
- [ ] Burst parse → 429 + retry messaging
- [ ] Bad MIME / oversized file rejected
- [ ] Text PDF without Gemini → heuristics / manual continue path
- [ ] Image/Canva PDF with Gemini → `document_scan` notice; without Gemini → friendly error + Continue manually
- [ ] Gemini 503 → capacity copy; partial fields → `partial_parse` banner

### Docs / tour (Agent 5 wrap-up when slice closes)

- [ ] Mark Slice 2 progress in `docs/APP-COVERAGE-TOUR.md` when S2-M1 ticketed or done + smoke
- [ ] Do **not** fake-check RELEASE boxes from this report alone

---

## Cases covered

### `tests/parseRateLimit.test.mjs` (9 cases)

| Case | Expectation |
| --- | --- |
| Under limit | `allowed: true` |
| Over max | `allowed: false`, `retryAfterSec > 0` |
| Per-token | Exhausted token blocked; other token allowed |
| Empty-string token | Own bucket |
| `max: 0` | Always blocked |
| Exact max | Allows `max` then blocks |
| Tiny window | `retryAfterSec >= 1` |
| Window elapse | Allows again after `windowMs` |
| `resetParseRateLimitStore` | Counters cleared |

### `tests/parseResponse.test.mjs` (expanded)

| Area | Cases |
| --- | --- |
| Contract | Success, total failure, partial, document_scan, flag mutual exclusion |
| `parsedResumeToApiFields` | null → empty employers; camel→snake; empty employers array |
| Counts | Empty strings/arrays ignored; licenses once; credentials undefined/empty/N |
| `credentialsInputFromParsed` | null/empty; BLS/ACLS active; details+expiry + unknown key |
| Flags + `hasParsedFields` | Credentials-only partial; empty + vision still `parse_failed` |

### Existing (unchanged this run, still relevant)

- `tests/geminiErrors.test.mjs` — 503 capacity + user-facing copy
- `tests/parseHeuristics.test.mjs` — merge / home fields
- `tests/parseOutcomeLog.test.mjs` — error kind classification (no PHI echo)
- `tests/parseAudit*.test.mjs` — audit strip / view

---

## Remaining gaps (mocked `parse.post`)

Out of reach without production edits or a Nitro test harness:

1. **401** — missing/invalid invite header before rate limit  
2. **429** — wiring `checkParseRateLimit` failure into HTTP status + `Retry-After`  
3. **MIME / size** — PDF/DOCX only, 10MB  
4. **End-to-end flag plumbing** — stub Gemini fail → heuristics → response `partial_parse: true`  
5. **Client body** — assert `audit` / raw resume text never returned  

Track as **S2-M1** / TODO #14 Phase 1 checklist item “Parse route unit tests (mocked)”.

---

## Slice readiness

| Criterion | Status |
| --- | --- |
| Rate-limit util edges | **Done** |
| `partial_parse` / `document_scan` / `parse_failed` honesty (util contract) | **Done** |
| Graceful Gemini missing/503 documented | **Covered** by existing `geminiErrors` tests + human smoke rows above |
| 401/429/MIME route tests | **Ticketed** S2-M1 — not blocking Agent 2 audit |
| Ready for Agent 2 / human smoke | **Yes** |
| Mark Slice 2 End in tour | **Not yet** — wait for S2-M1 or explicit defer + smoke |

---

## PHI

Synthetic only (`example.com`, placeholder UUIDs, generic hospital names). No resume text, real emails, phones, license numbers, or invite tokens in tests or this report.
