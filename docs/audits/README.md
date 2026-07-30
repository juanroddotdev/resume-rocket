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
| 2 | [BUG_AUDIT-s2-parse.md](./BUG_AUDIT-s2-parse.md) | [QA_REPORT-s2-parse.md](./QA_REPORT-s2-parse.md) | |
| 3 | [BUG_AUDIT-s3-wizard-utils.md](./BUG_AUDIT-s3-wizard-utils.md) | [QA_REPORT-s3-vmsGapReview.md](./QA_REPORT-s3-vmsGapReview.md) | |
| 4 | [token](./BUG_AUDIT-s4-intake-token.md) · [HospitalAutocomplete](./BUG_AUDIT-s4-HospitalAutocomplete.md) · [EmployerCard](./BUG_AUDIT-s4-EmployerCard.md) · [FacilityNameCombobox](./BUG_AUDIT-s4-FacilityNameCombobox.md) · [SpecialtyChipInput](./BUG_AUDIT-s4-SpecialtyChipInput.md) · [EmrSystemCombobox](./BUG_AUDIT-s4-EmrSystemCombobox.md) · [LicenseRepeater](./BUG_AUDIT-s4-LicenseRepeater.md) · [CredentialsChecklist](./BUG_AUDIT-s4-CredentialsChecklist.md) · [CertificationPicker](./BUG_AUDIT-s4-CertificationPicker.md) · [ClinicalSummaryFields](./BUG_AUDIT-s4-ClinicalSummaryFields.md) · [EducationRepeater](./BUG_AUDIT-s4-EducationRepeater.md) · [IntakeReviewPanel](./BUG_AUDIT-s4-IntakeReviewPanel.md) · [DocxPreviewViewer](./BUG_AUDIT-s4-DocxPreviewViewer.md) · [DocxPreviewSlideOver](./BUG_AUDIT-s4-DocxPreviewSlideOver.md) · [EmployersJumpDrawer](./BUG_AUDIT-s4-EmployersJumpDrawer.md) · [IntakeSaveStatus](./BUG_AUDIT-s4-IntakeSaveStatus.md) · [IntakePreviewModeToggle](./BUG_AUDIT-s4-IntakePreviewModeToggle.md) · [MetricTile](./BUG_AUDIT-s4-MetricTile.md) · [FieldValidityIcon](./BUG_AUDIT-s4-FieldValidityIcon.md) · [FileDropZone](./BUG_AUDIT-s4-FileDropZone.md) · [ParseNoticeBanner](./BUG_AUDIT-s4-ParseNoticeBanner.md) · [IntakeProcessingCard](./BUG_AUDIT-s4-IntakeProcessingCard.md) · [DevParseFixturePanel](./BUG_AUDIT-s4-DevParseFixturePanel.md) · [complete](./BUG_AUDIT-s4-intake-complete.md) — **Agent 2 queue done** | | |
| 5 | [BUG_AUDIT-s5-api.md](./BUG_AUDIT-s5-api.md) (API pass) · [admin.vue](./BUG_AUDIT-s5-admin.md) · [AdminCandidateList](./BUG_AUDIT-s5-AdminCandidateList.md) · [CandidatesTable](./BUG_AUDIT-s5-CandidatesTable.md) · [NewCandidatePacketModal](./BUG_AUDIT-s5-NewCandidatePacketModal.md) · [AdminCandidateBuilder](./BUG_AUDIT-s5-AdminCandidateBuilder.md) · [AdminProfessionalSnapshot](./BUG_AUDIT-s5-AdminProfessionalSnapshot.md) · [AdminExtraDetailsDrawer](./BUG_AUDIT-s5-AdminExtraDetailsDrawer.md) · [AdminSupplementalBucket](./BUG_AUDIT-s5-AdminSupplementalBucket.md) · [ParseQAPanel](./BUG_AUDIT-s5-ParseQAPanel.md) · [EmployersJumpDrawer](./BUG_AUDIT-s5-EmployersJumpDrawer.md) · [AdminNavMenu](./BUG_AUDIT-s5-AdminNavMenu.md) · [AdminSectionTabs](./BUG_AUDIT-s5-AdminSectionTabs.md) · [skeleton](./BUG_AUDIT-s5-AdminCandidateBuilderSkeleton.md) — **Agent 2 UI queue done** | | |
| 6 | [BUG_AUDIT-s6-docx.md](./BUG_AUDIT-s6-docx.md) | [QA_REPORT-s6-docx.md](./QA_REPORT-s6-docx.md) | |
| 7 | — | — | [DOCS_REPORT-s7-release.md](./DOCS_REPORT-s7-release.md) |

See [AGENT-LANES.md](../AGENT-LANES.md), [APP-COVERAGE-TOUR.md](../APP-COVERAGE-TOUR.md), and [`.cursor/agents/`](../../.cursor/agents/).
