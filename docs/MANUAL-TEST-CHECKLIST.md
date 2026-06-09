# Manual test checklist

Copy-paste QA for intake and admin UX. Use after merging a batch of intake/hospital PRs or before a release.

**Related:** [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) (shorter pre-release smoke) · [`MVP-PLAN.md`](MVP-PLAN.md) · [`HOSPITAL-PARSE-UX-PLAN.md`](HOSPITAL-PARSE-UX-PLAN.md)

**Scope covered:** PRs [#32](https://github.com/juanroddotdev/resume-rocket/pull/32)–[#40](https://github.com/juanroddotdev/resume-rocket/pull/40) — Render/template, wizard polish, parse clarity, hospital match + linking, Gemini prompts, candidate feel, draft/reorder/license gate.

---

## Prerequisites

- [ ] App running (`npm run dev` locally or deployed Render URL)
- [ ] `.env` has Supabase keys; optional `GEMINI_API_KEY`, `RESEND_API_KEY`
- [ ] Hospitals seeded per [`HOSPITAL-DATA.md`](HOSPITAL-DATA.md) (facility search + parse suggestions)
- [ ] Test files ready:
  - [ ] Text PDF resume (normal parse)
  - [ ] Image/Canva PDF (vision parse, `document_scan`, long wait)
  - [ ] Resume with recognizable hospital names
  - [ ] Resume with unit bed count vs hospital-wide bed count (prompt quality)

**Automated (run first):**

```bash
npm run test
npm run build
node scripts/test-gemini-parse-map.mjs
node scripts/test-docx-mapping.mjs
node scripts/test-normalize-candidate.mjs
# Optional — requires .env + seeded hospitals:
node --env-file=.env scripts/test-hospital-match.mjs
node --env-file=.env scripts/test-pdf-vision.mjs
```

---

## A. Admin / recruiter

### Login & invites

- [ ] Sign in at `/admin`
- [ ] Create intake invite → link copies (“Copied!” or readonly URL if clipboard blocked)
- [ ] Open invite in incognito → valid token loads Step 0

### Candidates table

- [ ] Empty table: “No candidates yet — create an intake link above”
- [ ] Loading shows skeleton (not plain “loading” text)
- [ ] After candidate starts intake: row appears (toggle “Show drafts” if still draft)
- [ ] Parse failure row: parse status column shows error icon when `parse_error` set

---

## B. Core intake happy path

Run once end-to-end as baseline:

- [ ] Upload PDF → wizard prefills or **Continue manually** works
- [ ] Steps 1–4 → **Download VMS-Ready Resume** → DOCX downloads
- [ ] Success step shows submitted state
- [ ] Admin: candidate shows submitted
- [ ] Invalid/expired token → “Link unavailable” with recovery copy

---

## C. Step 0 — upload & parse

### Parse progress & guards

- [ ] Upload PDF → spinner/pulse + staged labels (upload → read → AI → saving)
- [ ] Long vision PDF (~10–30s): labels rotate; “Please keep this tab open” visible
- [ ] **Reduce motion** (OS setting on): static “Working…” — no spin/pulse
- [ ] While parsing: cannot drop or choose another file
- [ ] Parse error → message + **Continue manually** still works

### Parse outcome notices

- [ ] Image PDF → Step 1 shows **document_scan** notice
- [ ] Heuristic/low-confidence parse → **partial_parse** banner on Steps 1–3
- [ ] Saving copy mentions visual scan or partial parse when API returns those flags

### Re-upload & Step 0 draft

- [ ] After Step 1+ data exists → Back to Step 0 → re-upload → **confirm dialog**
- [ ] Cancel confirm → no new parse; existing answers unchanged
- [ ] Confirm → new parse runs; fields merge/update from new file
- [ ] Step 0 with existing draft (`candidateId`) → **Saved** chip top-right

---

## D. Steps 1–3 — wizard

### Orientation & Step 1

- [ ] Step indicator: “Step X of 5 · …” on each wizard step
- [ ] Step 1: visible labels above First name, Last name, Email, Phone
- [ ] Phone helper: “Include area code — any common format is fine.”
- [ ] Browser autofill works on identity fields (`autocomplete` attrs)

### Draft recovery

- [ ] Mid-wizard (Step 2 or 3) → refresh → **Draft restored** banner
- [ ] Dismiss banner works
- [ ] After refresh: `document_scan` / `partial_parse` banners still show when applicable

### Step 2 — employment & facilities

- [ ] **Next disabled** with zero employers + amber inline message
- [ ] Add employer via search → card appears
- [ ] **Reorder:** 2+ employers → ↑ / ↓ changes card order
- [ ] Complete wizard → DOCX `{#professional_experiences}` order matches card order
- [ ] Unlinked employer: “Link facility…” + suggestion chips (when parse returned matches)
- [ ] Tap suggestion chip → links **same row** (no duplicate employer)
- [ ] “Search to link facility” → search → link → beds / trauma / teaching chips
- [ ] “Change facility” → can relink without duplicate row
- [ ] Add same hospital twice via search → duplicate blocked

### Step 2 — employer card deck ([EMPLOYER-CARD-DECK-PLAN.md](./EMPLOYER-CARD-DECK-PLAN.md))

- [ ] 3+ employers (parse or manual) → stacked headers visible; only one card expanded at a time
- [ ] Header shows hospital name, role, and dates on every card
- [ ] Tap header → previous card collapses; target expands with smooth height transition
- [ ] Expanded card has visible gap above and below collapsed headers (does not touch stack)
- [ ] Add employer via search → new card expands
- [ ] Remove active employer → no crash; index clamps correctly
- [ ] Reorder ↑ / ↓ → active card follows when the moved row was open
- [ ] `prefers-reduced-motion` → expansion is instant (no animation jank)

### Step 3 — credentials & license gate

- [ ] **Review disabled** until license number + license state filled
- [ ] Amber banner when license missing
- [ ] License filled but other Step 3 gaps → soft “N more fields recommended” (Review allowed)
- [ ] Fill gaps → **Review** → Step 4

---

## E. Step 4 — gap review & finish

### Gap review focus

- [ ] Step 4 lists missing required fields
- [ ] Tap “License number” → Step 3, license field focused/scrolled into view
- [ ] Tap employer gap (e.g. “Employer 2: role”) → Step 2, **card 2 opens**, correct input focused
- [ ] Tap facility link advisory → Step 2, **correct card opens**, inline link search visible on that row

### Submit & success

- [ ] Submit shows **“Preparing your packet…”**; button disabled while loading
- [ ] Missing fields block download until fixed
- [ ] Success always shows VMS context (DOCX downloaded; recruiter gets same file)
- [ ] With `RESEND_API_KEY`: confirmation email line **in addition to** VMS copy
- [ ] Without Resend: VMS copy still shows; no email line
- [ ] **Download again** on success step works
- [ ] Blocked download → retry via Download again

---

## F. Hospital parse UX

### Suggestions & linking

- [ ] Parse resume with known hospital names → employers prefilled on Step 2
- [ ] Suggestion chips on unlinked cards (requires seeded `hospitals` table)
- [ ] Link facility → DOCX includes hospital beds / trauma when DB has data
- [ ] Manual-only path (no parse): search + link still populates DOCX facility fields

### Gemini prompt quality (subjective — PR #38)

- [ ] Resume: “24-bed ICU” at “450-bed hospital” → unit bed count from parse; hospital total **not** from Gemini (DB after link)
- [ ] Multiple jobs on resume → separate employer rows
- [ ] Compact license / years of experience prefilled when stated on resume

---

## G. Deploy & template (PR #32)

- [ ] `npm run build` passes locally
- [ ] Render deploy starts; env vars set per [`DEPLOY.md`](DEPLOY.md)
- [ ] DOCX on Render matches local (same `server/assets/template.docx` in git)
- [ ] Deployed URL: admin → invite → intake → DOCX smoke

---

## H. Docs reference (PR #35)

- [ ] [`INTAKE-DOWNLOAD-EMAIL-FLOW.md`](INTAKE-DOWNLOAD-EMAIL-FLOW.md) matches observed submit/download/email behavior

---

## Suggested order (~45–90 min)

1. Prerequisites + automated scripts (5 min)
2. **A** Admin smoke (5 min)
3. **B** Happy path (10 min)
4. **C** Step 0 parse UX — one text PDF + one image PDF (15 min)
5. **D** Step 2 hospital linking + reorder (15 min)
6. **E** Gap review + success (10 min)
7. **C/D** Draft refresh + re-upload confirm (10 min)
8. **G** Deploy smoke if shipping to Render (5 min)

---

## Sign-off

| Date | Tester | Environment | Commit / branch | Pass | Notes |
|------|--------|-------------|-----------------|------|-------|
| | | local / Render | | | |
