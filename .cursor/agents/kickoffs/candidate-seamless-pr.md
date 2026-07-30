# Kickoff — Candidate seamless polish (Main) — one PR per chat

Paste into a **new Agent chat**. Fill in **PR number** before sending. Do **not** implement more than one PR in the same chat.

**Source of truth:** Read and follow the Candidate seamless polish plan before coding. Prefer the plan attached in chat; otherwise open:

`~/.cursor/plans/candidate_seamless_polish_9fa269f7.plan.md`

PR scopes below are a short reminder — if they conflict with the plan, **the plan wins**.

---

Follow the plan above, plus @.cursor/rules/agent-scope-isolation.mdc, @.cursor/rules/mobile-first-intake.mdc, @.cursor/rules/empty-error-states.mdc, @.cursor/rules/pr-size.mdc.

```text
Lane: Main
Ticket: Candidate seamless polish — PR N of 3
Plan: ~/.cursor/plans/candidate_seamless_polish_9fa269f7.plan.md
Allowed paths: pages/intake/[token].vue ; pages/intake/complete/[accessToken].vue (PR3 only) ; components/intake/ (new IntakeWizardSkeleton only as needed) ; layouts/intake.vue (only if skeleton spacing requires it) ; docs/TODO.md (optional backlog note)
Locked paths: pages/admin.vue ; layouts/admin.vue ; components/admin/** ; AdminProfessionalSnapshot ; AdminExtraDetailsDrawer ; Parse QA ; server/** ; server/assets/template.docx ; utils/professionalSnapshot.ts ; shared field widgets (prefer page-level fixes)
Ship: no
Implement ONLY: PR___   ← fill 1, 2, or 3
```

## PR scopes (pick one)

| PR | Do this only |
| --- | --- |
| **1** | `IntakeWizardSkeleton.vue` + replace `Loading…` in `[token].vue`; `unavailable` invite **Try again** (re-validate) |
| **2** | Step 1 amber advance hint when Next blocked; `aria-describedby` on gated Next/Review (steps 1–3); keep `isAdminView` gates |
| **3** | Success CTA polish + recruiter-finalizes line; `[accessToken].vue` complete-page copy/recovery; no auto-download |

## Out of scope (every PR — stop if tempted)

- Snapshot / Extra details / Parse QA on candidate
- Admin sidebar, section tabs, builder chrome, or editing `AdminCandidateBuilderSkeleton` (mirror pattern only)
- Landing `pages/index.vue` redesign
- Shared widget redesigns that change admin appearance
- E2E suite (manual smoke is enough)
- Starting PR N+1 in this chat

## Stop rules

- When **this** PR’s code is done and smoke-checked: **STOP**.
- Do **not** commit, push, or open a PR unless I say `commit` / `ship PR`.
- Do **not** continue to the next PR in this chat.
- If work needs Locked paths or expands past one concern: stop and report.

## Git

- Branch from latest **`main`**: `feat/intake-seamless-prN-…` (e.g. `feat/intake-seamless-pr1-skeleton`).
- Prefer merge PR N before starting PR N+1 on a fresh branch from `main`.
- PR body: `Part of #16` + Summary + Test plan.

## Verify (this PR + admin-safe)

- [ ] Intake path for this PR’s change works on mobile-width shell
- [ ] Autosave chip still Saving / Saved / Retry (if editable steps touched)
- [ ] `/admin` builder + table + snapshot + Extra details unchanged (open once after changes)

## How to start

1. Open a **new** Agent chat.
2. Paste this whole file (with `Implement ONLY: PR1` / `PR2` / `PR3` filled in).
3. Attach or `@`-mention the plan: `candidate_seamless_polish_9fa269f7.plan.md` (Cursor Plans).
4. Send. Review. Say `commit` / `ship PR` when ready.
5. After merge: new chat + paste again with the next PR number.
