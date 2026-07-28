# Agent lanes (parallel side work)

Operating guide for multi-agent work on Resume Rocket. Product backlog stays in [TODO.md](./TODO.md).

**Prompts:** [`.cursor/agents/`](../.cursor/agents/) · **Scope rule:** [`.cursor/rules/agent-scope-isolation.mdc`](../.cursor/rules/agent-scope-isolation.mdc)

---

## Lanes

| Lane | Owner | Output | Merge |
|------|--------|--------|--------|
| **Main** | You | Product / UX / UAT PRs | You drive |
| **Side** | One agent = one concern | Feature or test branch + PR | You review; ship only when asked |
| **Backfill** | Audit first, then implement | Checklist report and/or docs/test PR | Never fake-check RELEASE boxes |

Default parallel set: **Main + Agent 1 (QA) + Agent 2 (Bug Hunter) + Agent 5 (Docs Auditor)**.

---

## Active agents (1, 2, 5)

| Agent | Prompt | Writes | Branch from `main` |
|-------|--------|--------|-------------------|
| **1 QA** | [`qa-edge-cases.md`](../.cursor/agents/qa-edge-cases.md) | `tests/*.test.mjs`, optionally `scripts/test-*.mjs` | `test/…` → own PR |
| **2 Bug Hunter** | [`bug-hunter-audit.md`](../.cursor/agents/bug-hunter-audit.md) | Prefer chat; else `docs/audits/*.md` | Chat-only = no branch; docs = `docs/bug-audit-…` |
| **5 Docs Auditor** | [`docs-checklist-auditor.md`](../.cursor/agents/docs-checklist-auditor.md) | `docs/**` only | `docs/…` → own PR |

**Never** put Agents 1, 2, and 5 on the same branch. Prefer separate Cursor chats / cloud worktrees so they do not dirty Main’s checkout. Each starts from latest `main`, not from unmerged Main WIP.

Safe parallel path sets: Agent 1 → `tests/` · Agent 2 → read-only scan · Agent 5 → `docs/` (no overlap).

---

## Deferred agents (3, 4)

Do **not** run these in the first roster. Prompts intentionally not created yet.

| Agent | Pull in when | Still skip if |
|-------|----------------|---------------|
| **3 Design / a11y** | After Agents 1/2/5 run successfully once; or UAT [#97](https://github.com/juanroddotdev/resume-rocket/issues/97) flags layout/a11y; or clustered meta-bar overflow bugs | You are actively editing the same Vue files in Main |
| **4 DX / refactor** | After more [#14](https://github.com/juanroddotdev/resume-rocket/issues/14) Phase 1 tests exist; or a **named** debt ticket with ≤8-file path lock | “Clean the whole repo”; `template.docx` / API contract / dependency major bumps |

**Milestone order:** ship 1+2+5 prompts → run once → human smoke/UAT → Agent 3 one chrome pass → Agent 4 last with written ticket.

---

## Kickoff block (paste at start of every side-agent chat)

```text
Lane: Side | Backfill
Agent: 1 QA | 2 Bug Hunter | 5 Docs Auditor
Ticket: (issue # or TODO bullet)
Allowed paths:
Locked paths (Main owns — do not touch):
Ship: no
```

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

Do not merge or “ship PR” unless the user explicitly asks.
