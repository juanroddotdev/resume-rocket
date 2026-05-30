# Resume Rocket Project Review and Architecture Notes

This document is a practical review of the current codebase: where it is strong today, where risks are likely to appear, and what to prioritize when moving beyond MVP.

Related references:
- `docs/MVP-PLAN.md` (product scope and flow)
- `docs/VMS-FULL-COVERAGE-PLAN.md` (next steps: full template coverage via parse + wizard)
- `docs/PROJECT-REVIEW.md` (this file)
- `.cursor/rules/mvp-scope-guard.mdc`
- `.cursor/rules/parse-pipeline-contract.mdc`
- `.cursor/rules/phase-labeling.mdc`

---

## 1) Current Assessment

Resume Rocket is a focused, pragmatic MVP. It uses Nuxt 3 + Supabase + Gemini to deliver a complete intake-to-DOCX workflow with invite gating, autosave, parse fallback paths, and recruiter visibility.

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
`credentials` and `employers` are JSONB. This is fast for MVP, but schema drift can break downstream consumers (notably DOCX mapping) as field names evolve.

**Why it matters:** data is accepted flexibly now, but template builders and UI code assume specific keys.

**Pragmatic next step:** add strict normalization/parsing on read/write boundaries (for example, centralized Zod parsing in server utils) before introducing more fields.

### `docxtemplater` template fragility
Word run-splitting can silently break tags. This is a known operational hazard when non-technical edits happen in `template.docx`.

**Why it matters:** failures are often discovered late (at candidate export time).

**Pragmatic next step:** keep current approach for MVP, but enforce template safety checks and maintain a known-good tag inventory.

### Admin auth helper performance scope
`requireAdminSession` currently creates a Supabase client per protected server-route call.

**Important nuance:** this affects server routes that use that helper (for example invite creation and admin DOCX endpoint), not every admin page interaction.

**Pragmatic next step:** optional optimization later; not a current blocker at MVP traffic.

---

## 4) Deferred by Design (Intentional MVP Trade-offs)

The following are intentionally deferred and already documented in the scope guard:
- rate limiting on parse endpoints
- virus scanning on uploads
- camera capture and duplicate detection
- candidate self-serve auth accounts
- recruiter notes and deeper multi-tenant features

This is not a gap in execution; it is a scope decision aligned to `docs/MVP-PLAN.md` and `.cursor/rules/mvp-scope-guard.mdc`.

---

## 5) Recommended Priority Order

When resuming this work, prioritize in this order:

1. **Phase A VMS mapping completeness**
   - Expand `docxBuilder` mappings for high-value template tags already collected by intake.
   - Keep Phase A/B/C boundaries explicit per `phase-labeling.mdc`.

2. **JSONB normalization hardening**
   - Add strict parsing/normalization for `employers` and `credentials` on server boundaries.
   - Prevent future key-shape drift from breaking exports.

3. **Basic parse endpoint guardrails**
   - Add low-complexity rate limiting to `/api/parse` before heavier controls.

4. **Operational visibility**
   - Add structured error/event logs for parse failure categories and DOCX render failures.
   - Track rates of `parse_failed`, `partial_parse`, and `document_scan`.

5. **Optional performance cleanup**
   - Revisit admin session helper/client creation only if latency warrants it.

6. **Multi-tenancy model**
   - Introduce tenant/agency boundaries only when customer model requires it.

---

## 6) Additional Items Worth Including

If this file is meant to guide active implementation later, add:

- **Testing strategy snapshot**
  - what is currently covered manually
  - first automated tests to add (parse route contract, DOCX generation smoke, invite gating)

- **Operational checklist**
  - "what to verify after dependency upgrades"
  - "what to smoke test before release"

- **Known limitations section**
  - template tags intentionally blank today
  - assumptions about recruiter workflow and single-tenant admin visibility

- **Definition of done for next milestone**
  - 3-5 concrete acceptance criteria so resuming work is faster.

---

## 7) Near-Term Execution Plan (2 Weeks)

Use this as a practical sprint starter when resuming work.

### Week 1: Stabilize Core Data and Output

1. **Ticket: Phase A template mapping pass**
   - Review `server/utils/docxBuilder.ts` against current `template.docx` tags.
   - Map highest-value existing intake fields first (identity, license, specialties, recent employers, credentials).
   - Document any intentionally unmapped tags as known gaps.
   - **Done when:** top-priority tags populate in downloaded DOCX for at least 3 representative candidates.

2. **Ticket: JSONB normalization utilities**
   - Add server-side normalization/parsing helpers for `employers` and `credentials`.
   - Ensure inconsistent key shapes do not break DOCX mapping or UI rendering.
   - Apply in route handlers where candidate rows are read/written.
   - **Done when:** legacy/new key variants produce stable, identical DOCX output.

3. **Ticket: Parse outcome visibility baseline**
   - Add structured logging/events around `parse_failed`, `partial_parse`, and `document_scan`.
   - Capture enough context to classify failure mode without logging resume text.
   - **Done when:** parse outcomes can be summarized from logs for a test day run.

### Week 2: Guardrails and Regression Safety

4. **Ticket: Lightweight `/api/parse` rate limiting**
   - Add a minimal per-token (or per-IP + token) limiter for parse attempts.
   - Return user-friendly error/retry guidance when limit is exceeded.
   - Keep implementation simple and reversible.
   - **Done when:** repeated rapid parse calls are throttled and UX remains clear.

5. **Ticket: First automated regression tests**
   - Add focused tests for:
     - invite-gated route behavior
     - parse contract shape (`parse_failed`, `partial_parse`, `document_scan`)
     - DOCX generation smoke path
   - Keep test suite small, deterministic, and CI-friendly.
   - **Done when:** CI can catch regressions in intake gating, parse output contract, and export generation.

6. **Ticket: Release checklist hardening**
   - Promote manual checks in `docs/MVP-PLAN.md` and `.cursor/rules/manual-test-script.mdc` into a reusable pre-release checklist.
   - Include one happy path and one failure-path smoke test.
   - **Done when:** releases follow a repeatable checklist with explicit pass/fail evidence.

### Suggested Ownership and Sequence

- **Sequence:** 1 -> 2 -> 3 -> 4 -> 5 -> 6
- **Single owner mode:** run sequentially to reduce context switching.
- **Pair mode:** split by lane:
  - lane A: template/data normalization (1, 2)
  - lane B: reliability/testing (3, 4, 5, 6)

### Exit Criteria for This Plan

Treat this two-week plan as successful when all are true:
- DOCX output quality is measurably better for existing captured fields.
- Parse behavior is observable and failure modes are classifiable.
- Abuse controls exist on parse endpoint.
- Core intake -> parse -> DOCX path has baseline automated regression coverage.

---

## 8) GitHub Issue Checklists (copy-paste)

Use the blocks below in GitHub Issues or as PR bodies. Create one **Epic** issue plus six child issues, or a single tracking issue with all checkboxes.

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
