# Kickoff — Slice 2 · Agent 2 (Bug Hunter)

Paste into a **new Agent chat**.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 2).

```text
Slice: 2
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 2 — parse core audit
Allowed paths: server/api/parse.post.ts ; server/utils/parseCandidateResume.ts ; server/utils/geminiShared.ts ; server/utils/geminiParse.ts ; server/utils/geminiDocumentParse.ts ; server/utils/geminiErrors.ts ; server/utils/parseHeuristics.ts ; server/utils/parseResponse.ts ; server/utils/parseRateLimit.ts ; server/utils/parseOutcomeLog.ts ; server/utils/extractText.ts ; server/utils/normalizeCandidate.ts ; server/utils/storageUpload.ts ; server/api/admin/candidates/[id]/parse.post.ts ; docs/audits/
Locked paths:
Ship: no
Write report file: yes
```

**Git:** Branch `docs/bug-audit-s2-parse` from latest **`main`** only. Never share with Agent 1. No merge unless I say ship.

**Do:** Audit 401/429/MIME/partial_parse/document_scan, Gemini missing/503 graceful paths, unhandled async. Do not flag intentional soft-fails as High. Write `docs/audits/BUG_AUDIT-s2-parse.md` with Action inbox. No production rewrites. Name best Agent 1 tickets for this slice.
