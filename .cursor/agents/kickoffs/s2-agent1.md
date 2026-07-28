# Kickoff — Slice 2 · Agent 1 (QA)

Paste into a **new Agent chat** (parallel with Slice 2 Agent 2 is OK).

---

Follow @.cursor/agents/qa-edge-cases.md and @docs/APP-COVERAGE-TOUR.md (Slice 2). Addresses #14 Phase 1 where applicable.

```text
Slice: 2
Lane: Backfill
Agent: 1 QA
Ticket: Coverage tour slice 2 — parse rate-limit + parse response / flag edge tests
Allowed paths: tests/ ; scripts/test-*.mjs ; package.json (test wiring only) ; tests/fixtures/ (synthetic only, no PHI)
Locked paths:
Ship: no
```

**Git:** Branch `test/tour-s2-parse` from latest **`main`** only. Own PR if asked. Do not merge unless I say ship.

**Do:** Prefer util-level and mocked seams already used in repo (`parseRateLimit`, `parseResponse`, heuristics). No live Gemini. No real resumes. No production edits. `npm run test` green. Summarize coverage gaps still needing mocked `parse.post` handler tests if out of reach without prod changes.
