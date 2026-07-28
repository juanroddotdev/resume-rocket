# Kickoff — Agent 5 wrap-up (after any slice)

Paste into a **new Agent chat** (or resume Agent 5) when a slice’s End criteria look met.

---

Follow @.cursor/agents/docs-checklist-auditor.md and @docs/APP-COVERAGE-TOUR.md.

```text
Slice: <N>
Lane: Backfill
Agent: 5 Docs Auditor
Ticket: Coverage tour wrap-up — mark slice <N> progress
Allowed paths: docs/
Locked paths:
Ship: no
Write report file: yes
Mode: docs-PR
```

**Git:** Branch `docs/tour-s<N>-wrapup` from latest **`main`** only (or reuse an open docs tour branch if I say so). Write `docs/audits/DOCS_REPORT-s<N>-wrapup.md`. Do not merge unless ship.

**Do:** Update APP-COVERAGE-TOUR progress for slice `<N>` only if audits/tests/PRs evidence End criteria. Note remaining automate / human-smoke / defer in the DOCS_REPORT Action inbox. Name the next kickoff file under `.cursor/agents/kickoffs/` I should paste. No app code.
