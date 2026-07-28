# Kickoff — Slice 3 · Agent 1 (QA) — one util per chat

Paste into a **new Agent chat**. Re-run this kickoff for each module in the Slice 3 queue (change Ticket + focus module).

---

Follow @.cursor/agents/qa-edge-cases.md and @docs/APP-COVERAGE-TOUR.md (Slice 3).

```text
Slice: 3
Lane: Backfill
Agent: 1 QA
Ticket: Coverage tour slice 3 — vmsGapReview contract tests
Allowed paths: tests/ ; scripts/test-*.mjs ; package.json (test wiring only)
Locked paths:
Ship: no
Focus module: utils/vmsGapReview.ts
```

**Queue (next runs — change Focus module + Ticket each time):**  
`professionalSnapshot` → `employerLink` → `employerLineList` → `employerMetricsLine` → `employerClinicalFlags` → `emrSystem` → `emrSearch` → `licenseRows` → `certificationOptions` → `educationGraduation` → `credentialExpiry` → `employmentType` → `traumaLevel` → `supplementalBucket` → `adminCandidateForm` → `intakeDraft` → `intakeWizardStep` → `resumeDownloadFilename` → `displayResumeFilename` → `facilityGoogleSearch` → `server/utils/schemas.ts` → `hospitalMatch` → `parseEmployerSuggestions`

**Git:** Branch `test/tour-s3-<module>` from latest **`main`** only (new branch per module/PR). Never reuse Agent 2/5 branches. Do not merge unless I say ship.

**Do:** One module only. Edge cases: null/missing, long strings, special chars, empty vs missing. Extend existing tests when present. No production edits. `npm run test` green.
