# Resume Rocket Project Review and Architecture Notes

This document is a practical review of the current codebase: where it is strong today, where risks are likely to appear, and what to prioritize when moving beyond MVP.

Related references:
- `docs/README.md` (doc index)
- `docs/TODO.md` (active backlog)
- `docs/MVP-PLAN.md` (historical product scope)
- `docs/VMS-FULL-COVERAGE-PLAN.md` (VMS expansion status — complete)
- `docs/VMS-FIELD-MANIFEST.md` (authoritative template tags)
- `.cursor/rules/mvp-scope-guard.mdc`
- `.cursor/rules/parse-pipeline-contract.mdc`

---

## 1) Current Assessment

Resume Rocket delivers a complete invite-gated intake → parse → wizard → gap review → DOCX workflow with full VMS contract template coverage (37/37 tags mapped).

The implementation is disciplined for MVP:
- domain rules are encoded in `.cursor/rules/*`
- sensitive operations stay in `server/`
- optional dependencies (Gemini/Resend) degrade gracefully
- user-facing errors generally include recovery options

This is not an "enterprise ATS" yet, but it is a strong, shippable foundation.

---

## 2) What Is Working Well

### Parsing resilience (text + vision + heuristics)
- PDF/DOCX extraction is strict on MIME and size.
- Image-heavy PDFs trigger document vision when extracted text is too short.
- Heuristics merge with AI output to reduce complete-parse failures.
- Manual continue path prevents hard blocker UX.

### Security and privacy baseline
- Server secrets are not exposed via `NUXT_PUBLIC_*`.
- Resume processing remains server-side.
- Invite-gated candidate APIs are enforced consistently.
- Private resumes bucket is used through service-role upload flows.

### Product and UX discipline
- Token-scoped local draft storage avoids cross-link leakage.
- Autosave, retry affordances, and error states are present in the wizard.
- Invite-validated intake flow aligns to MVP intent (no public open intake).

---

## 3) Risks and Technical Debt

### JSONB shape drift in candidate fields

**Mitigated:** `server/utils/normalizeCandidate.ts` applied on parse, PATCH, and DOCX paths (#11). Re-run `node scripts/test-normalize-candidate.mjs` after schema changes.

### `docxtemplater` template fragility
Word run-splitting can silently break tags. This is a known operational hazard when non-technical edits happen in `template.docx`.

**Why it matters:** failures are often discovered late (at candidate export time).

**Pragmatic next step:** run `node scripts/inventory-template-tags.mjs` after every `template.docx` edit.

### Admin auth helper performance scope
`requireAdminSession` currently creates a Supabase client per protected server-route call.

**Important nuance:** this affects server routes that use that helper (for example invite creation and admin DOCX endpoint), not every admin page interaction.

**Pragmatic next step:** optional optimization later; not a current blocker at MVP traffic.

---

## 4) Deferred by Design (Intentional MVP Trade-offs)

The following are intentionally deferred and documented in the scope guard:
- virus scanning on uploads
- camera capture and duplicate detection
- candidate self-serve auth accounts
- recruiter notes and deeper multi-tenant features

**Shipped since original MVP defer list:** `/api/parse` rate limiting (#13), full VMS template coverage, parse outcome logging (#12).

This is not a gap in execution; it is a scope decision aligned to `docs/MVP-PLAN.md` and `.cursor/rules/mvp-scope-guard.mdc`.

---

## 5) Recommended Priority Order

Updated June 2026 — VMS expansion complete. See [`TODO.md`](./TODO.md).

1. **Release sign-off** — run [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) on target env; manual 3-profile DOCX verification
2. **Test automation (#14–#15)** — [Test automation plan](./TODO.md#test-automation-plan): fixture PDF regression, API integration, optional Playwright E2E
3. **Step 4 document preview** — largest remaining candidate-facing feature (optional product bet)
4. **Admin polish** — open intake from table, invite success banner
5. **Optional performance cleanup** — admin session helper only if latency warrants it
6. **Multi-tenancy** — only when customer model requires it

---

## 6) Testing and release (current state)

- **Automated (CI):** `npm run test` + `npm run build` — unit tests, docx/normalize/gemini-map smokes ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
- **Manual:** [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) happy path + failure paths; [`MANUAL-TEST-CHECKLIST.md`](./MANUAL-TEST-CHECKLIST.md) for deep UX
- **Expand:** [TODO.md — Test automation plan](./TODO.md#test-automation-plan)
- **After dependency upgrades:** `.cursor/rules/dependency-upgrades.mdc`, `npm run build`, parse smoke scripts

**Known limitations:** single-tenant admin visibility; no candidate auth; subjective Gemini quality requires manual sample review when tuning prompts.

---

## 7) Hardening sprint (June 2026) — status

Original two-week plan from this file. **Most items shipped.**

| Ticket | Status | Notes |
| --- | --- | --- |
| Phase A template mapping | **Done** | [`VMS-FIELD-MANIFEST.md`](./VMS-FIELD-MANIFEST.md) |
| JSONB normalization (#11) | **Done** | `normalizeCandidate.ts` |
| Parse outcome visibility (#12) | **Done** | `parseOutcomeLog.ts` (#45) |
| Parse rate limiting (#13) | **Done** | `parseRateLimit.ts` |
| Automated regression (#14) | **Partial** | 13 unit test files + script smokes; expand per TODO |
| Release checklist (#15) | **Partial** | [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md); sign-off table empty |

Historical execution details: [`archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md`](./archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md).

---

## 8) GitHub Issue Checklists (historical)

Copy-paste blocks for epic #16 child issues. **Status:** #10–#13 done; #14–#15 partial — see [§7](#7-hardening-sprint-june-2026--status) and [`TODO.md`](./TODO.md).

### Epic (tracking issue)

```markdown
## Summary
Two-week hardening sprint from `docs/PROJECT-REVIEW.md` §7: VMS mapping, JSONB normalization, parse observability, rate limits, regression tests, release checklist.

## Milestone checklist
- [ ] #___ Phase A template mapping pass
- [ ] #___ JSONB normalization utilities
- [ ] #___ Parse outcome visibility baseline
- [ ] #___ Lightweight `/api/parse` rate limiting
- [ ] #___ First automated regression tests
- [ ] #___ Release checklist hardening

## Exit criteria
- [ ] Top-priority DOCX tags populate for 3+ representative candidates
- [ ] Parse outcomes (`parse_failed`, `partial_parse`, `document_scan`) summarizable from logs without resume text
- [ ] Parse endpoint throttles abuse with clear user messaging
- [ ] CI covers invite gating, parse contract, DOCX smoke path
- [ ] Pre-release checklist documented and used once end-to-end

## References
- `docs/PROJECT-REVIEW.md`
- `docs/RELEASE-CHECKLIST.md` — pre-release manual smoke tests
- `docs/MVP-PLAN.md`
- `.cursor/rules/phase-labeling.mdc`
- `.cursor/rules/manual-test-script.mdc`
```

---

### Issue 1 — Phase A template mapping pass

```markdown
## Summary
Map existing intake data to VMS template tags in `docxBuilder.ts` (Phase A only — no new intake fields).

## Tasks
- [ ] Inventory tags in `server/assets/template.docx` vs `mapCandidateToTemplateData()`
- [ ] Wire identity, license, specialties, employers, credentials (highest value first)
- [ ] List intentionally blank tags in PR description
- [ ] Download DOCX for 3 representative candidates and verify output

## Test plan
- [ ] Intake → wizard → DOCX: name, email, phone, license appear
- [ ] At least one employer block renders in `{#professional_experiences}`
- [ ] Cert checkboxes map to template cert fields where defined
- [ ] `npm run build` passes

## Labels
`phase-a`, `docx`, `enhancement`
```

---

### Issue 2 — JSONB normalization utilities

```markdown
## Summary
Normalize `employers` and `credentials` JSONB on server read/write so key-shape drift does not break UI or DOCX.

## Tasks
- [ ] Add Zod (or shared) schemas for employer/credential shapes in `server/utils/`
- [ ] Normalize camelCase/snake_case variants (e.g. `traumaLevel` / `trauma_level`)
- [ ] Apply on PATCH ingress and DOCX/generate read paths
- [ ] Document canonical shape in types or schema file

## Test plan
- [ ] Legacy row with mixed keys → stable DOCX output
- [ ] New intake save → same normalized shape in DB
- [ ] No regression on wizard employer list display

## Labels
`tech-debt`, `server`, `enhancement`
```

---

### Issue 3 — Parse outcome visibility baseline

```markdown
## Summary
Structured, PHI-safe logging for parse outcomes so failures can be classified without logging resume text.

## Tasks
- [ ] Log counts/flags: `parse_failed`, `partial_parse`, `document_scan`, `geminiFailed`
- [ ] Include candidate id + mime + char count only (no raw text, email, phone)
- [ ] Align with `.cursor/rules/phi-handling.mdc`

## Test plan
- [ ] Text PDF parse → log shows success path
- [ ] Image PDF without Gemini key → log shows expected failure mode
- [ ] Canva/image PDF with key → log shows `document_scan`
- [ ] Confirm no resume body in server logs

## Labels
`observability`, `parse`, `enhancement`
```

---

### Issue 4 — Lightweight `/api/parse` rate limiting

```markdown
## Summary
Throttle abusive parse traffic (protect Gemini quota/cost) with per-invite-token limits.

## Tasks
- [ ] Add simple rate limit on `POST /api/parse` (e.g. N requests per token per window)
- [ ] Return 429 + human-readable `statusMessage`
- [ ] Intake UI shows retry guidance on limit hit
- [ ] Note in PR if deferred items moved in/out of MVP scope guard

## Test plan
- [ ] Normal upload flow unchanged
- [ ] Rapid repeated uploads hit limit with clear error
- [ ] Valid token can parse again after window resets

## Labels
`security`, `parse`, `enhancement`
```

---

### Issue 5 — First automated regression tests

```markdown
## Summary
Small CI-friendly test suite for core intake contracts.

## Tasks
- [ ] Invite validation / 401 without token on protected routes
- [ ] Parse response shape: `parse_failed`, `partial_parse`, `document_scan`, `fields_found`
- [ ] DOCX generation smoke (fixture candidate → buffer non-empty)
- [ ] Wire into CI (GitHub Actions or existing pipeline)

## Test plan
- [ ] Tests pass locally without `.env` secrets where mocked
- [ ] CI green on PR
- [ ] One intentional break fails the right test

## Labels
`testing`, `ci`, `enhancement`
```

---

### Issue 6 — Release checklist hardening

```markdown
## Summary
Consolidate manual smoke tests into a repeatable pre-release checklist.

## Tasks
- [ ] Merge items from `docs/MVP-PLAN.md` + `.cursor/rules/manual-test-script.mdc`
- [ ] Add one happy path (invite → upload → wizard → DOCX)
- [ ] Add one failure path (invalid token or parse fail → manual continue)
- [ ] Link checklist from README or `docs/PROJECT-REVIEW.md`

## Test plan
- [ ] Run checklist once on current `main` and record pass/fail
- [ ] Another dev (or future you) can follow without chat context

## Labels
`docs`, `process`, `enhancement`
```

---

### Quick `gh` commands (optional)

```bash
# Epic
gh issue create --title "Epic: Two-week hardening sprint (PROJECT-REVIEW §7)" \
  --body-file /path/to/epic-body.md --label "epic"

# Example child issue
gh issue create --title "Phase A: VMS template mapping pass" \
  --body-file /path/to/issue-1-body.md --label "phase-a,docx"
```

Replace `/path/to/...` with temp files containing the markdown blocks above, or paste bodies interactively in the GitHub UI.
