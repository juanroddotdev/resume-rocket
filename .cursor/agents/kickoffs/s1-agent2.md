# Kickoff — Slice 1 · Agent 2 (Bug Hunter)

Paste this entire message into a **new Agent chat** (separate from Agent 1).

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 1).

```text
Slice: 1
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 1 — invite + upload gate audit
Allowed paths: server/api/invites.post.ts ; server/api/invites/validate.get.ts ; server/utils/requireInvite.ts ; server/utils/docxAccess.ts ; composables/useIntakeInvite.ts ; pages/intake/[token].vue ; components/intake/FileDropZone.vue ; components/intake/IntakeProcessingCard.vue ; components/intake/ParseNoticeBanner.vue
Locked paths:
Ship: no
Write report file: no
```

**Git:** Chat-only report (no branch). If I ask you to write `docs/audits/…`: branch `docs/bug-audit-s1-invite` from latest `main` only. Never share a branch with Agent 1. Do not merge unless I say ship.

**Do:** Read-only audit for invalid/expired token, missing header, upload/parse entry failure UX. High / Medium / Low with path+line+cause+fix snippet. PHI scrubbed. End with whether Slice 1 is ready for Agent 1 and any human-smoke notes. Do not rewrite production code.
