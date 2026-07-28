# Kickoff — Slice 3 · Agent 2 (Bug Hunter) — optional light pass

Paste into a **new Agent chat** if you want a quick audit while Agent 1 owns tests.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 3).

```text
Slice: 3
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 3 — light util audit (trim/format / null render risks)
Allowed paths: utils/professionalSnapshot.ts ; utils/vmsGapReview.ts ; utils/adminCandidateForm.ts ; utils/employerLink.ts ; server/utils/schemas.ts ; server/utils/normalizeCandidate.ts
Locked paths:
Ship: no
Write report file: no
```

**Git:** Chat-only. No shared branch with Agent 1.

**Do:** Look for trim-on-every-keystroke patterns, unsafe assumptions on parse shapes, `any`. Report only. Suggest which utils Agent 1 should prioritize.
