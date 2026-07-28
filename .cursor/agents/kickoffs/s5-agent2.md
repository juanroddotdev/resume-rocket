# Kickoff — Slice 5 · Agent 2 (Bug Hunter) — admin UI file-by-file

Paste into a **new Agent chat**. One file per run via `Next file`.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 5).

```text
Slice: 5
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 5 — admin UI audit
Allowed paths: pages/admin.vue ; components/admin/ ; components/intake/EmployersJumpDrawer.vue ; composables/useAdminCandidateWorkspace.ts ; composables/useAdminHubMenu.ts ; composables/useAdminBuilderSectionSpy.ts ; docs/audits/
Locked paths:
Ship: no
Write report file: yes
Next file: pages/admin.vue
```

**Queue:** `admin.vue` → `AdminCandidateList.vue` → `CandidatesTable.vue` → `NewCandidatePacketModal.vue` → `AdminCandidateBuilder.vue` → `AdminProfessionalSnapshot.vue` → `AdminExtraDetailsDrawer.vue` → `AdminSupplementalBucket.vue` → `ParseQAPanel.vue` → `EmployersJumpDrawer.vue` → remaining admin components

**Git:** Branch `docs/bug-audit-s5-admin` from latest **`main`**. Never branch from Agent 1 work. No production rewrites. No merge unless ship.

**Do:** Audit **only** `Next file`. Focus autosave errors, drawer/overflow, snapshot controlled inputs, missing recovery UI. Write `docs/audits/BUG_AUDIT-s5-<slug>.md` with Action inbox. Name next file when done.
