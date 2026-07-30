# Audit & agent reports

Every coverage-tour agent run **writes a report** under this folder so you can address findings later without digging through chat.

## Naming

| Agent | Pattern | Example |
| --- | --- | --- |
| **2 Bug Hunter** | `BUG_AUDIT-s<N>-<slug>.md` | `BUG_AUDIT-s1-invite.md` |
| **1 QA** | `QA_REPORT-s<N>-<slug>.md` | `QA_REPORT-s1-invite.md` |
| **5 Docs** | `DOCS_REPORT-s<N>-<slug>.md` | `DOCS_REPORT-s0-map.md` |

Optional date suffix if re-running the same slice: `BUG_AUDIT-s1-invite-2026-07-28.md`.

## Required sections (all agents)

1. **Header table** — Agent, Slice, Date, Base commit/branch, Ship: no  
2. **Summary** — 2–4 sentences  
3. **Action inbox** — what **you** do later, tagged:
   - **Must fix** — blocks slice Done / security / broken gate  
   - **Should fix** — Side/Main ticket; recommended before calling slice hardened  
   - **Suggested** — polish / Low  
   - **Tests** — Agent 1 checklist (or “done in this PR”)  
   - **Human smoke** — browser / Word / inbox rows  
   - **Docs / tour** — progress table, RELEASE honesty  
4. **Findings detail** (Agent 2) or **Cases covered** (Agent 1) or **Doc deltas** (Agent 5)  
5. **Slice readiness** — ready for next agent? mark Done?  
6. **PHI** — scrubbed confirmation  

## Rules

- Strip PHI: no resume text, emails, phones, license numbers, or invite tokens.
- Prefer path + cause + suggested fix for bugs.
- Do not mark RELEASE/MANUAL boxes from a report alone — Agent 5 / you need evidence.
- Branch from latest `main` when writing reports:
  - Agent 2: `docs/bug-audit-s<N>-…`
  - Agent 1: report lands on the same `test/tour-s<N>-…` branch as the tests (or follow-up docs commit)
  - Agent 5: `docs/tour-s<N>-…`

## Index (fill as reports land)

| Slice | Agent 2 | Agent 1 | Agent 5 |
| --- | --- | --- | --- |
| 0 | — | — | |
| 1 | [BUG_AUDIT-s1-invite.md](./BUG_AUDIT-s1-invite.md) | | |
| 2 | [BUG_AUDIT-s2-parse.md](./BUG_AUDIT-s2-parse.md) | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | — | — | [DOCS_REPORT-s7-release.md](./DOCS_REPORT-s7-release.md) |

See [AGENT-LANES.md](../AGENT-LANES.md), [APP-COVERAGE-TOUR.md](../APP-COVERAGE-TOUR.md), and [`.cursor/agents/`](../../.cursor/agents/).
