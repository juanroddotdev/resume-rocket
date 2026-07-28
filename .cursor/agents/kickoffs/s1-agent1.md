# Kickoff — Slice 1 · Agent 1 (QA)

Paste this entire message into a **new Agent chat** (can run in parallel with Slice 1 Agent 2).

---

Follow @.cursor/agents/qa-edge-cases.md and @docs/APP-COVERAGE-TOUR.md (Slice 1).

```text
Slice: 1
Lane: Backfill
Agent: 1 QA
Ticket: Coverage tour slice 1 — invite token / requireInvite edge tests
Allowed paths: tests/ ; scripts/test-*.mjs ; package.json (test wiring only) ; docs/audits/
Locked paths:
Ship: no
Write report file: yes
```

**Git:** Create branch `test/tour-s1-invite` from latest **`main`** (not from my WIP, not from Agent 2/5). Own PR only if I ask. **Ship: no** — do not merge.

**Do:** Add/extend `node --test` coverage for invite token / requireInvite / related helpers. Null/missing header, edge strings. No production source edits. `npm run test` must pass. Write `docs/audits/QA_REPORT-s1-invite.md` with Action inbox (cases covered, gaps, follow-ups for Main, human smoke). Update audits README index. Point to existing `tests/intakeAuth.test.mjs` if present and extend rather than duplicate blindly.
