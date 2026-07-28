# Kickoff — Slice 6 · Agent 1 (QA)

Paste into a **new Agent chat** (parallel with Slice 6 Agent 2 OK).

---

Follow @.cursor/agents/qa-edge-cases.md and @docs/APP-COVERAGE-TOUR.md (Slice 6). Part of #14.

```text
Slice: 6
Lane: Backfill
Agent: 1 QA
Ticket: Coverage tour slice 6 — DOCX mapping / XML spot-check assertions
Allowed paths: tests/ ; scripts/test-docx-mapping.mjs ; scripts/smoke-docx-template.mjs ; scripts/inventory-template-tags.mjs ; package.json (test wiring only) ; docs/audits/
Locked paths: server/assets/template.docx
Ship: no
Write report file: yes
```

**Git:** Branch `test/tour-s6-docx` from latest **`main`** only. Do not modify `template.docx`. Own PR if asked. Do not merge unless I say ship.

**Do:** Strengthen mapping/smoke/inventory coverage. No PHI fixtures. `npm run test` / `test:release` green. Write `docs/audits/QA_REPORT-s6-docx.md` with Action inbox + what still needs human Word eyeball.
