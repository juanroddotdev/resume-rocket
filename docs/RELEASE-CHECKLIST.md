# Release checklist

Repeatable pre-release smoke tests for Resume Rocket. Run on `main` before deploying or tagging a release.

Related: [`README.md`](./README.md) (doc index) · [`TODO.md`](./TODO.md) · [`VMS-FULL-COVERAGE-PLAN.md`](./VMS-FULL-COVERAGE-PLAN.md) (status) · [`DEPLOY.md`](./DEPLOY.md) · [`MANUAL-TEST-CHECKLIST.md`](./MANUAL-TEST-CHECKLIST.md) (detailed UX QA) · [`archive/RELEASE-CHECKLIST-2026-06-07-09.md`](./archive/RELEASE-CHECKLIST-2026-06-07-09.md) (June 7–9 batch record) · Slice 7 matrix: [`audits/DOCS_REPORT-s7-release.md`](./audits/DOCS_REPORT-s7-release.md)

**Environment:** Local `npm run dev` with `.env` filled (Supabase, optional Gemini + Resend). Contract template at `server/assets/template.docx`.

### How to read tags

| Tag | Meaning |
| --- | --- |
| **Automated** | Covered by CI / `npm run test:release` (or named script). Re-run locally if needed; no browser required. |
| **Manual** | Needs browser, Word, inbox, or seeded data judgment. |
| **Optional** | Skip unless that integration/env is in scope for the release. |

### Automated vs manual (summary)

| Automated in CI (every PR) | Still manual |
| --- | --- |
| `npm run test:release` — unit tests, docx/normalize/gemini-map smokes, template inventory | Browser happy path (admin → intake → download) |
| `npm run build` | Open DOCX in Word after template edits |
| | Resend email inbox check |
| | Production URL + Supabase project sanity |

Expand automation: [TODO.md — Test automation plan](./TODO.md#test-automation-plan).

**Automated (run first locally or trust CI on `main`):**

```bash
npm run test:release
npm run build
```

---

## Happy path — invite → upload → wizard → DOCX

- [ ] **Admin sign-in** — `/admin` loads; recruiter can log in · **Manual**
- [ ] **Create invite** — first + last name required; email optional; copy/open candidate link works; table shows the name (not “Unnamed candidate”) · **Manual** (schema coverage partial in unit tests)
- [ ] **Valid token** — `/intake/{token}` loads upload step (not “Link unavailable”) · **Manual**
- [ ] **Upload resume** — PDF or DOCX; parse prefills or shows manual continue · **Manual** (parse flags/rate-limit unit tests exist; full upload path not in CI)
- [ ] **Wizard step 1** — identity fields; autosave shows Saved; Next works · **Manual**
- [ ] **Wizard step 2** — specialties, employer cards, EMR; at least one facility · **Manual**
- [ ] **Wizard step 3** — credentials, clinical summary, education row · **Manual**
- [ ] **Wizard step 4** — gap review passes; download succeeds · **Manual** (`vmsGapReview` unit tests · **Automated** for gap logic only)
- [ ] **Success screen** — confirmation copy; file downloaded · **Manual**
- [ ] **Admin table** — candidate appears (toggle “Show drafts” if still draft) · **Manual**
- [ ] **Admin DOCX** — per-row download opens populated contract sections · **Manual** (mapping smokes · **Automated** via `test-docx-mapping.mjs` / `docxBuilder` tests)
- [ ] **Optional:** confirmation email received if `RESEND_API_KEY` configured · **Optional**

---

## Failure paths — graceful degradation

- [ ] **Invalid/expired token** — blocked with recruiter guidance (no blank screen) · **Manual** (invite validate helpers may have unit coverage — browser still required)
- [ ] **Parse failure** — stay on upload; error message + **Continue manually** works through wizard · **Manual**
- [ ] **Partial parse** — advance with review hint; gap review catches missing required fields · **Manual** + gap **Automated**
- [ ] **Rate limit** — rapid re-uploads show 429 message + manual continue option · **Manual** (rate-limit unit tests · **Automated** for limiter logic)
- [ ] **Missing Gemini key** — text PDF still heuristics-parse; image PDF offers manual continue · **Manual** / **Optional** without Gemini in env

---

## VMS / contract template (post-expansion)

- [ ] `node scripts/inventory-template-tags.mjs` — all tags mapped in docxBuilder · **Automated** (`npm run test:release`)
- [ ] `node scripts/test-docx-mapping.mjs` — full fixture populates required fields · **Automated** (`npm run test:release`)
- [ ] `node scripts/smoke-docx-template.mjs` — template renders · **Automated** (`npm run test:release`)
- [ ] Manual-heavy profile (minimal parse) — wizard + gap review → DOCX has no blank required tags · **Manual**
- [ ] Parse-heavy profile — Gemini prefill + light edits → DOCX matches intake data · **Manual** / **Optional** without Gemini
- [ ] Open DOCX in Word after template edits · **Manual**

---

## Hospital seed (after CMS/ArcGIS refresh or new Supabase project)

See [`HOSPITAL-DATA.md`](HOSPITAL-DATA.md) for local vs prod rules.

- [ ] `supabase db push` includes `hospitals.source_id` migrations · **Manual** (ops)
- [ ] `python3 scripts/seed_hospitals.py --fetch --dry-run` — stats look reasonable · **Manual** / **Optional** per release
- [ ] Seed target matches intent (local `.env` vs prod — never accidental cross-project) · **Manual**
- [ ] `python3 scripts/seed_hospitals.py --fetch` — upsert completes · **Manual** / **Optional**
- [ ] Intake Step 2: facility search returns results; linked employer shows beds in DOCX when matched · **Manual**

---

## Security / config sanity

- [ ] No secrets in client bundle (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY` server-only) · **Manual** (spot-check / review)
- [ ] `.env` not committed; `data/` CSVs not committed · **Automated**-ish via git hygiene / PR review
- [ ] Production `NUXT_PUBLIC_SITE_URL` matches deployed host (invite + email links) · **Manual** / **Optional** for prod deploys
- [ ] `npm run build` succeeds · **Automated** (CI)

---

## Sign-off

| Date | Tester | Branch / commit | Result | Notes |
|------|--------|-----------------|--------|-------|
| | | | | |
