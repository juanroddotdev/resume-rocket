# Kickoff — Slice 5 · Agent 2 (Bug Hunter) — admin/candidate APIs

Paste into a **new Agent chat** after (or parallel to) the UI queue if paths stay read-only / no file overlap with another writer.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 5 API roots).

```text
Slice: 5
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 5 — admin + candidate API audit
Allowed paths: server/api/admin/ ; server/api/candidates/ ; server/utils/requireAdmin.ts ; server/utils/patchCandidateRow.ts ; server/utils/candidateDraftResponse.ts ; server/api/candidates/[id]/send-confirmation.post.ts ; server/utils/sendEmail.ts
Locked paths:
Ship: no
Write report file: no
```

**Git:** Chat-only default. Optional `docs/bug-audit-s5-api` from **`main`**. No production rewrites. No merge unless ship.

**Do:** Auth gaps, PATCH normalization footguns, Resend soft-fail, draft vs submitted. Report High/Medium/Low. Suggest Agent 1 test seams if any pure helpers are uncovered.
