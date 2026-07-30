# BUG_AUDIT — Slice 2 · Parse core

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 2 — Parse core |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Cross-ref** | Slice 1 adjacent **S1-X1** · Agent 1 util QA may land as `QA_REPORT-s2-parse.md` on `test/tour-s2-parse` (not required for this PR) |

## Summary

Parse pipeline soft-fails as designed: Gemini missing/503 → heuristics or friendly errors; `partial_parse` / `document_scan` / `parse_failed` are coherent; 401/415/413/429 are thrown before or inside shared `parseCandidateResumeFile`. **Must fix:** intake `POST /api/parse` can still mutate a **submitted** candidate when `candidateId` + invite token are retained (admin parse already 409s). Other Mediums: ignored Supabase update errors, MIME-only gate vs filename, and raw Gemini messages leaking to `parse_error`.

---

## Action inbox (do this later)

### Must fix (before calling Slice 2 “hardened”)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S2-H1** | **High** | Main | Reject parse when candidate `status` is `submitted` / `confirmed` (match admin route). Closes Slice 1 **S1-X1**. | `server/api/parse.post.ts` and/or early check in `parseCandidateResume.ts` |

### Should fix (Side / Main ticket — recommend one small PR)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S2-M3 | Medium | Main | Check Supabase `.update()` error; throw 500 / do not return a success-shaped body if persist failed | `parseCandidateResume.ts` ~172–175 |
| S2-M4 | Medium | Main | Allow resume when **filename** is `.pdf`/`.docx` even if MIME is `application/octet-stream` (align with `extractTextFromBuffer`) | `extractText.ts` `isAllowedResumeMime` **or** call site in `parseCandidateResume.ts` |
| S2-M5 | Medium | Main | Do not return raw `error.message` from Gemini to the client; map non-capacity failures to stable user copy (keep kind in `classifyParseError` / logs only) | `geminiErrors.ts` `userFacingGeminiError` ~78 |
| S2-M6 | Medium | Main | When Gemini is **not configured** and only heuristics run, consider `partial_parse: true` (or equivalent banner signal) so UI honesty matches “basic detection” | `parseCandidateResume.ts` outcome flags ~125–131 |

### Suggested (nice-to-have)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S2-L3 | Low | Main | In-memory rate-limit `Map` is per-process — document multi-instance limits or move to Redis/Upstash later | `parseRateLimit.ts` |
| S2-L4 | Low | Main | Parallel first uploads without `candidateId` can race-create two candidates for one invite | `parse.post.ts` ~41–62 |
| S2-L5 | Low | Main | `application/msword` allowed by MIME helper; mammoth path is `.docx`-oriented — prefer rejecting legacy `.doc` explicitly | `extractText.ts` |

### Already ticketed / expected from Agent 1 (align, don’t duplicate)

| ID | Owner | What |
| --- | --- | --- |
| QA util seams | Agent 1 | `parseRateLimit` / `parseResponse` / flag contracts (branch `test/tour-s2-parse`) |
| Mocked route | Agent 1 / Main | `parse.post` 401/429/MIME + response flags (#14) |
| RELEASE smoke | You | Gemini missing / vision / 503 |

### Tests (best Agent 1 tickets for this slice)

Prefer extending `test/tour-s2-parse` / #14 rather than a new branch unless asked:

1. **S2-H1** — unit/integration: submitted candidate + valid invite → **409** (not field overwrite)
2. **S2-M4** — `isAllowedResumeMime` / gate: `octet-stream` + `.pdf` filename allowed; garbage MIME + bad name → 415
3. **S2-M3** — if extractable: update failure surfaces (mock supabase) — defer if auto-imports block; keep under QA S2-M1
4. Keep util coverage already in QA report; do **not** re-test Gemini live

### Human smoke (you)

- [ ] Missing invite header/cookie → 401; wizard does not advance
- [ ] Burst uploads → 429 + Continue manually copy
- [ ] Bad MIME / >10MB → 415/413
- [ ] Text PDF, no Gemini → heuristics or manual; no hard crash
- [ ] Image/Canva PDF, no Gemini → friendly vision message + Continue manually
- [ ] Image PDF with Gemini → `document_scan` notice
- [ ] Gemini 503 → capacity copy; fields present → `partial_parse` banner
- [ ] **After S2-H1:** submitted packet cannot re-parse via intake token

### Docs / tour (Agent 5 wrap-up)

- [ ] Mark Slice 2 Done only when S2-H1 fixed or explicitly deferred + smoke/QA End criteria met
- [ ] Do not fake-check RELEASE boxes

---

## Findings detail

### High

1. **`server/api/parse.post.ts` ~63–65 + `requireInviteForCandidate` (`allowSubmitted: true`)**  
   **Cause:** Path with `candidateId` authorizes via invite even after submit. Admin `…/parse.post.ts` ~24–28 returns **409**; intake does not. Retained token + id can overwrite draft-shaped fields / resume storage on a submitted row.  
   **Fix:**
   ```ts
   // After resolving candidateId, before parseCandidateResumeFile:
   const { data: row } = await supabase.from('candidates').select('status').eq('id', resolvedCandidateId).single()
   if (row?.status === 'submitted' || row?.status === 'confirmed') {
     throw createError({ statusCode: 409, statusMessage: 'Candidate already submitted' })
   }
   ```
   Or centralize the same check at the top of `parseCandidateResumeFile`.

### Medium

1. **`parseCandidateResume.ts` ~172–175** — Supabase update result ignored; client may see fields while DB write failed.  
   **Fix:** `const { error } = await supabase…update…`; `if (error) throw error` (or `createError(500, …)`).

2. **`extractText.ts` `isAllowedResumeMime` ~9–11 vs `extractTextFromBuffer` ~18–27** — Gate is MIME-only; extract allows extension fallback. Mobile/`octet-stream` PDFs get **415** before extract.  
   **Fix:** Shared helper `isAllowedResumeUpload(mime, filename)`.

3. **`geminiErrors.ts` `userFacingGeminiError` ~78** — Non-capacity branch returns `error.message` (may include provider/JSON noise) into `parse_error` on the response.  
   **Fix:** Always return stable strings for clients; log `classifyParseError` / details server-side only.

4. **`parseCandidateResume.ts` ~94–131** — Heuristics-only (`!geminiReady`) leaves `geminiFailed === false` → `partial_parse === false` even though only basic detection ran. Intentional soft-fail is fine; flag honesty is weak vs ParseNoticeBanner.  
   **Fix:** Set `partial_parse` when `!geminiReady && hasFields`, or add an explicit `heuristics_only` flag (product call — Suggested if deferred).

### Low

1. **`parseRateLimit.ts`** — process-local `Map`; multi-instance bypass. Document or upgrade later.  
2. **`parse.post.ts` create-candidate race** — two concurrent first parses.  
3. **`application/msword`** — allowed MIME; weak DOCX-only extract path.

### Intentional soft-fails (not High)

| Behavior | Why OK |
| --- | --- |
| Gemini missing + text PDF → heuristics | `graceful-degradation.mdc` |
| Gemini 503 → retry then heuristics / vision capacity copy | `callGeminiWithRetry` + `userFacingGeminiError` |
| Image PDF + no Gemini → thrown message → `parse_failed` + manual | Expected |
| Outer try/catch sets `parseError`, still returns JSON with `parse_failed` | Intake stays on upload |
| Rate limit before storage upload | Avoids burning storage on 429 |

### Solid

- Admin parse: session + submitted **409** + `admin:{userId}` rate key  
- Intake: missing token **401**; invalid invite **403**; size **413**; bad MIME **415**; rate **429**  
- Vision vs text Gemini branching; model fallback list  
- `logParseOutcome` / `classifyParseError` PHI-safe (no resume text)  
- API response does not spread `parsed_resume` / audit raw blob to client  
- Normalize JSONB before persist; `partial_parse` = `geminiFailed && hasFields` when Gemini was attempted  

---

## Slice readiness

| Question | Answer |
| --- | --- |
| Ready for Agent 1? | **Yes** — util seams + mocked `parse.post` (#14). Prioritize tests for **S2-H1** (submitted → 409) once Main lands the fix. |
| Ready to mark Slice 2 Done? | **No** until **S2-H1** fixed or deferred in writing + human smoke |
| Next Agent 2? | Slice 3 light pass (`s3-agent2.md`) or jump to Slice 4 file queue when you say |

## PHI

Report scrubbed: no resume text, emails, phones, license numbers, or invite tokens.
