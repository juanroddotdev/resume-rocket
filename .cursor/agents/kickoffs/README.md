# Paste-ready kickoffs (one chat each)

Open a **new Agent chat** → paste the whole kickoff file → send.

**Order:** [APP-COVERAGE-TOUR.md](../../docs/APP-COVERAGE-TOUR.md) slices **0 → 7**. Do not skip slices unless marked Done.

## Branching (yes — off `main`)

| Agent | Writes? | Git |
| --- | --- | --- |
| **1 QA** | Yes (`tests/`, `docs/audits/QA_REPORT-…`, maybe scripts) | **Own branch** from latest `main`: `test/tour-sN-…` → own PR. Never share a branch with 2 or 5. |
| **2 Bug Hunter** | `docs/audits/BUG_AUDIT-…` (+ chat pointer) | **Own branch** `docs/bug-audit-sN-…` from `main`. |
| **5 Docs** | `docs/` including `docs/audits/DOCS_REPORT-…` | **Own branch** from `main`: `docs/tour-sN-…` → own PR. |

**Every agent writes a report** under [`docs/audits/`](../../docs/audits/README.md) with an **Action inbox** (Must fix / Should fix / Suggested / Tests / Human smoke). That file is what you use later to prioritize work — not the chat scrollback.

Use a **separate chat / worktree** per agent so they do not dirty your Main checkout. They must **not** branch from your unmerged feature work.

`Ship: no` in every kickoff — you merge only when you say ship.

---

## Index (run in this order)

| Step | Kickoff | Agent | Branch? |
| --- | --- | --- | --- |
| 1 | [s0-agent5.md](./s0-agent5.md) | 5 | `docs/tour-s0-…` + `DOCS_REPORT-s0-…` |
| 2a | [s1-agent2.md](./s1-agent2.md) | 2 | `docs/bug-audit-s1-…` + `BUG_AUDIT-s1-…` |
| 2b | [s1-agent1.md](./s1-agent1.md) | 1 | `test/tour-s1-…` + `QA_REPORT-s1-…` (can run parallel with 2a) |
| 3a | [s2-agent2.md](./s2-agent2.md) | 2 | `docs/bug-audit-s2-…` |
| 3b | [s2-agent1.md](./s2-agent1.md) | 1 | `test/tour-s2-…` + QA report |
| 4a | [s3-agent1.md](./s3-agent1.md) | 1 | `test/tour-s3-…` (repeat per util; edit Ticket module) |
| 4b | [s3-agent2.md](./s3-agent2.md) | 2 | docs audit branch (optional light pass) |
| 5 | [s4-agent2.md](./s4-agent2.md) | 2 | docs audit; re-paste with next `Next file` |
| 6a | [s5-agent2.md](./s5-agent2.md) | 2 | docs audit; UI queue |
| 6b | [s5-agent2-api.md](./s5-agent2-api.md) | 2 | docs audit; admin/candidate APIs |
| 7a | [s6-agent2.md](./s6-agent2.md) | 2 | docs audit |
| 7b | [s6-agent1.md](./s6-agent1.md) | 1 | `test/tour-s6-…` + QA report |
| 8 | [s7-agent5.md](./s7-agent5.md) | 5 | `docs/tour-s7-…` + DOCS report |
| * | [wrapup-agent5.md](./wrapup-agent5.md) | 5 | optional after any slice closes |

Parent prompts: [`qa-edge-cases.md`](../qa-edge-cases.md) · [`bug-hunter-audit.md`](../bug-hunter-audit.md) · [`docs-checklist-auditor.md`](../docs-checklist-auditor.md)
