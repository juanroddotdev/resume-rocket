# Agent lanes (parallel side work)

Operating guide for multi-agent work on Resume Rocket. Product backlog stays in [TODO.md](./TODO.md).

**Coverage path (start → end):** [APP-COVERAGE-TOUR.md](./APP-COVERAGE-TOUR.md)  
**Paste-ready kickoffs:** [`.cursor/agents/kickoffs/`](../.cursor/agents/kickoffs/README.md) (one file per agent×slice — open new chat, paste file)  
**Prompts:** [`.cursor/agents/`](../.cursor/agents/) · **Scope rule:** [`.cursor/rules/agent-scope-isolation.mdc`](../.cursor/rules/agent-scope-isolation.mdc)

---

## Lanes

| Lane | Owner | Output | Merge |
|------|--------|--------|--------|
| **Main** | You | Product / UX / UAT PRs | You drive |
| **Side** | One agent = one concern | Feature or test branch + PR | You review; ship only when asked |
| **Backfill** | Audit first, then implement | Checklist report and/or docs/test PR | Never fake-check RELEASE boxes |

Default parallel set: **Main + Agent 1 (QA) + Agent 2 (Bug Hunter) + Agent 5 (Docs Auditor)** — always with a **Slice: N** from the coverage tour.

---

## Active agents (1, 2, 5)

| Agent | Prompt | Writes | Branch from `main` |
|-------|--------|--------|-------------------|
| **1 QA** | [`qa-edge-cases.md`](../.cursor/agents/qa-edge-cases.md) | `tests/*.test.mjs`, optionally `scripts/test-*.mjs` | `test/tour-sN-…` → own PR |
| **2 Bug Hunter** | [`bug-hunter-audit.md`](../.cursor/agents/bug-hunter-audit.md) | Prefer chat; else `docs/audits/*.md` | Chat-only = no branch; docs = `docs/bug-audit-sN-…` |
| **5 Docs Auditor** | [`docs-checklist-auditor.md`](../.cursor/agents/docs-checklist-auditor.md) | `docs/**` only | `docs/…` → own PR |

**Never** put Agents 1, 2, and 5 on the same branch. Prefer separate Cursor chats / cloud worktrees. Each starts from latest `main`, not from unmerged Main WIP.

**Tour order:** Slice **0** (Agent 5) → **1–6** (2 then 1, file queues on 4–5) → **7** (Agent 5 + your smoke). Details and End criteria: [APP-COVERAGE-TOUR.md](./APP-COVERAGE-TOUR.md).

Safe parallel path sets: Agent 1 → `tests/` · Agent 2 → read-only scan · Agent 5 → `docs/` (no overlap).

---

## Deferred agents (3, 4)

Do **not** run these in the first roster. Prompts intentionally not created yet.

| Agent | Pull in when | Still skip if |
|-------|----------------|---------------|
| **3 Design / a11y** | After coverage tour slices 4–5 audited once; or UAT [#97](https://github.com/juanroddotdev/resume-rocket/issues/97) flags layout/a11y; or clustered meta-bar overflow bugs | You are actively editing the same Vue files in Main |
| **4 DX / refactor** | After more [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) Phase 1 tests exist; or a **named** debt ticket with ≤8-file path lock | “Clean the whole repo”; `template.docx` / API contract / dependency major bumps |

**Milestone order:** run tour 0→7 once → human smoke → Agent 3 chrome pass → Agent 4 last with written ticket.

---

## Kickoff block (paste at start of every side-agent chat)

```text
Slice: 0-7
Lane: Side | Backfill
Agent: 1 QA | 2 Bug Hunter | 5 Docs Auditor
Ticket: Coverage tour slice N — <short name>
Allowed paths: <from APP-COVERAGE-TOUR slice card>
Locked paths: <Main owns — or blank>
Ship: no
```

For Agent 2 on slices 4–5 also set `Next file:` to the next queue item.

---

## Path locks (hot files)

Declare Main-exclusive paths when spawning side agents. Common collision surfaces:

- `components/admin/AdminCandidateBuilder.vue`, `AdminProfessionalSnapshot.vue`
- `components/intake/EmployerCard.vue`, facility combobox files
- `server/assets/template.docx`, `server/utils/docxBuilder.ts`
- `utils/professionalSnapshot.ts` while snapshot work is in flight

---

## Stop conditions (all side agents)

Stop and report (do not expand scope) when:

- A product / UX decision is required
- Work needs files outside Allowed paths or inside Locked paths
- The change would become more than one concern ([pr-size](../.cursor/rules/pr-size.mdc))
- Tests stay red after a reasonable fix attempt
- Agent tries to jump to another tour slice mid-run

Do not merge or “ship PR” unless the user explicitly asks.
