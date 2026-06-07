# Release checklist

Repeatable pre-release smoke tests for Resume Rocket. Run on `main` before deploying or tagging a release.

Related: [`MVP-PLAN.md`](MVP-PLAN.md), [`VMS-FULL-COVERAGE-PLAN.md`](VMS-FULL-COVERAGE-PLAN.md), [`PROJECT-REVIEW.md`](PROJECT-REVIEW.md), [`DEPLOY.md`](DEPLOY.md), [`MANUAL-TEST-CHECKLIST.md`](MANUAL-TEST-CHECKLIST.md) (detailed UX QA).

**Environment:** Local `npm run dev` with `.env` filled (Supabase, optional Gemini + Resend). Contract template at `server/assets/template.docx`.

**Automated (run first):**

```bash
npm run test
npm run build
```

---

## Happy path — invite → upload → wizard → DOCX

- [ ] **Admin sign-in** — `/admin` loads; recruiter can log in
- [ ] **Create invite** — email optional; copy/open intake link works
- [ ] **Valid token** — `/intake/{token}` loads upload step (not “Link unavailable”)
- [ ] **Upload resume** — PDF or DOCX; parse prefills or shows manual continue
- [ ] **Wizard step 1** — identity fields; autosave shows Saved; Next works
- [ ] **Wizard step 2** — specialties, employer cards, EMR; at least one facility
- [ ] **Wizard step 3** — credentials, clinical summary, education row
- [ ] **Wizard step 4** — gap review passes; download succeeds
- [ ] **Success screen** — confirmation copy; file downloaded
- [ ] **Admin table** — candidate appears (toggle “Show drafts” if still draft)
- [ ] **Admin DOCX** — per-row download opens populated contract sections
- [ ] **Optional:** confirmation email received if `RESEND_API_KEY` configured

---

## Failure paths — graceful degradation

- [ ] **Invalid/expired token** — blocked with recruiter guidance (no blank screen)
- [ ] **Parse failure** — stay on upload; error message + **Continue manually** works through wizard
- [ ] **Partial parse** — advance with review hint; gap review catches missing required fields
- [ ] **Rate limit** — rapid re-uploads show 429 message + manual continue option
- [ ] **Missing Gemini key** — text PDF still heuristics-parse; image PDF offers manual continue

---

## VMS / contract template (post-expansion)

- [ ] `node scripts/inventory-template-tags.mjs` — all tags mapped in docxBuilder
- [ ] `node scripts/test-docx-mapping.mjs` — full fixture populates required fields
- [ ] Manual-heavy profile (minimal parse) — wizard + gap review → DOCX has no blank required tags
- [ ] Parse-heavy profile — Gemini prefill + light edits → DOCX matches intake data

---

## Hospital seed (after CMS/ArcGIS refresh or new Supabase project)

See [`HOSPITAL-DATA.md`](HOSPITAL-DATA.md) for local vs prod rules.

- [ ] `supabase db push` includes `hospitals.source_id` migrations
- [ ] `python3 scripts/seed_hospitals.py --fetch --dry-run` — stats look reasonable
- [ ] Seed target matches intent (local `.env` vs prod — never accidental cross-project)
- [ ] `python3 scripts/seed_hospitals.py --fetch` — upsert completes
- [ ] Intake Step 2: facility search returns results; linked employer shows beds in DOCX when matched

---

## Security / config sanity

- [ ] No secrets in client bundle (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY` server-only)
- [ ] `.env` not committed; `data/` CSVs not committed
- [ ] Production `NUXT_PUBLIC_SITE_URL` matches deployed host (invite + email links)

---

## Sign-off

| Date | Tester | Branch / commit | Result | Notes |
|------|--------|-----------------|--------|-------|
| | | | | |
