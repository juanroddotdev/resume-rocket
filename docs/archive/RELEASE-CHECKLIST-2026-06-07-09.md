> **Archived** — Point-in-time batch record (June 7–9, 2026). Ongoing pre-release: [RELEASE-CHECKLIST.md](../RELEASE-CHECKLIST.md). Doc index: [README.md](../README.md).

# Release checklist — June 7–9 batch

Pre-release verification for work merged **June 7–9, 2026** on `main` (through PR [#57](https://github.com/juanroddotdev/resume-rocket/pull/57), commit `f7b4070`).

**Use with:** [`RELEASE-CHECKLIST.md`](../RELEASE-CHECKLIST.md) (core smoke) · [`MANUAL-TEST-CHECKLIST.md`](../MANUAL-TEST-CHECKLIST.md) (deeper UX QA) · [`DEPLOY.md`](../DEPLOY.md)

**Environment:** Local `npm run dev` or staging Render URL; `.env` with Supabase; optional `GEMINI_API_KEY`, `RESEND_API_KEY`; hospitals seeded per [`HOSPITAL-DATA.md`](../HOSPITAL-DATA.md).

---

## What shipped (22 PRs)

### Parse & upload UX (#36, #39, #42, #45)

| PR | Summary |
|----|---------|
| [#36](https://github.com/juanroddotdev/resume-rocket/pull/36) | `parseMeta` persisted in draft; `ParseNoticeBanner` for document_scan / partial_parse; dismissible “Draft restored” banner |
| [#39](https://github.com/juanroddotdev/resume-rocket/pull/39) | Rotating parse stage labels; Step 1 visible field labels; gap-review links scroll/focus missing fields |
| [#42](https://github.com/juanroddotdev/resume-rocket/pull/42) | `IntakeProcessingCard` for upload parse + Step 4 submit overlay (saving → generating → finalizing) |
| [#45](https://github.com/juanroddotdev/resume-rocket/pull/45) | Gemini error classification, retry/backoff, friendly capacity/vision copy; parse outcome logging |

### Hospital parse & linking (#37, #38)

| PR | Summary |
|----|---------|
| [#37](https://github.com/juanroddotdev/resume-rocket/pull/37) | `hospitalMatch` + parse suggestions; in-place facility linking on `EmployerCard`; duplicate guard |
| [#38](https://github.com/juanroddotdev/resume-rocket/pull/38) | Expanded `GEMINI_VMS_FIELD_GUIDE` (unit vs hospital beds; no facility metrics from Gemini) |

### Wizard polish (#40, #43, #44, #47)

| PR | Summary |
|----|---------|
| [#40](https://github.com/juanroddotdev/resume-rocket/pull/40) | Re-upload confirm on Step 0; Saved chip; employer reorder; Step 3 license gate before Review |
| [#43](https://github.com/juanroddotdev/resume-rocket/pull/43) | `?step=N` URL sync; browser back/forward; server draft restore via `GET /api/candidates/:id` |
| [#44](https://github.com/juanroddotdev/resume-rocket/pull/44) | Shared `.field` / `.field-label` styles; `MetricTile` for linked facility stats |
| [#47](https://github.com/juanroddotdev/resume-rocket/pull/47) | Stacked employer card deck accordion (single open card); gap review opens correct card |

### Layout & recruiter preview (#48, #50)

| PR | Summary |
|----|---------|
| [#48](https://github.com/juanroddotdev/resume-rocket/pull/48) | Centered intake mobile shell (`layouts/intake.vue`); admin stays full-width |
| [#50](https://github.com/juanroddotdev/resume-rocket/pull/50) | Admin/client preview toggle for signed-in recruiters; draft DOCX download bypasses submit gate |

### Step 2–3 field UX (#51, #52, #53, #54, #56)

| PR | Summary |
|----|---------|
| [#51](https://github.com/juanroddotdev/resume-rocket/pull/51) | Manual hospital add; editable name/city/state on unlinked employers |
| [#52](https://github.com/juanroddotdev/resume-rocket/pull/52) | EMR **Other** reveals custom platform text field |
| [#53](https://github.com/juanroddotdev/resume-rocket/pull/53) | Education row labels (Degree / School / Graduation year) |
| [#54](https://github.com/juanroddotdev/resume-rocket/pull/54) | Removed numbered “School 1/2” headers |
| [#56](https://github.com/juanroddotdev/resume-rocket/pull/56) | Parse-prefill field tint; linked-facility MetricTile highlight until Change facility |

### Server / exports (#55, #57)

| PR | Summary |
|----|---------|
| [#55](https://github.com/juanroddotdev/resume-rocket/pull/55) | Server-only parse audit in `parsed_resume.audit` (QA tuning; not sent to client) |
| [#57](https://github.com/juanroddotdev/resume-rocket/pull/57) | Standardized download filenames: `LastName_FirstName_VMS-Resume.docx` |

### Docs (#41)

| PR | Summary |
|----|---------|
| [#41](https://github.com/juanroddotdev/resume-rocket/pull/41) | Added [`MANUAL-TEST-CHECKLIST.md`](../MANUAL-TEST-CHECKLIST.md) |

---

## Automated gates (run first)

```bash
npm run test
npm run build
node scripts/test-docx-mapping.mjs
node scripts/test-gemini-parse-map.mjs
node scripts/test-normalize-candidate.mjs
```

**New unit tests in this batch:**

- [ ] `tests/geminiErrors.test.mjs`
- [ ] `tests/parseOutcomeLog.test.mjs`
- [ ] `tests/employerLink.test.mjs`
- [ ] `tests/emrSystem.test.mjs`
- [ ] `tests/parseAudit.test.mjs`
- [ ] `tests/intakePrefillHighlight.test.mjs`
- [ ] `tests/resumeDownloadFilename.test.mjs`

**Optional (needs `.env` + seeded hospitals):**

- [ ] `node --env-file=.env scripts/test-hospital-match.mjs`
- [ ] `node --env-file=.env scripts/test-pdf-vision.mjs`

---

## Manual verification — batch-specific

### A. Layout & navigation

- [ ] Desktop `/intake/{token}` — centered phone column; header inside column; gray gutters
- [ ] Mobile intake — full width, no broken layout
- [ ] `/admin` — full-width shell unchanged
- [ ] Step 2 → browser Back → step 1 with data retained
- [ ] Step 3 → refresh → same step + data (localStorage or server restore)
- [ ] Clear localStorage → refresh with `?step=2` → form hydrates from server
- [ ] Success step → browser Back → does not return to editable wizard

### B. Parse & upload

- [ ] Text PDF — `IntakeProcessingCard` stages; success flash; advance to Step 1
- [ ] Image/vision PDF — long-wait copy; no stuck overlay
- [ ] Parse failure — error + **Continue manually**; overlay dismisses
- [ ] `prefers-reduced-motion` — static “Working…” (no spin/pulse)
- [ ] Vision PDF → **document_scan** banner Steps 1–3
- [ ] Partial/heuristic parse → **partial_parse** banner Steps 1–3
- [ ] Mid-wizard refresh → parse banners + “Draft restored” when applicable
- [ ] Step 0 with existing draft → re-upload shows confirm dialog
- [ ] Step 0 with `candidateId` → **Saved** chip visible

### C. Step 1 — identity

- [ ] Visible labels above inputs (not placeholder-only)
- [ ] Parse-prefilled fields show soft brand tint; tint clears on edit
- [ ] Manual continue path — no prefill highlights

### D. Step 2 — employment & EMR

- [ ] Parse returns employers + hospital suggestion chips
- [ ] Tap suggestion → links in place (no duplicate row)
- [ ] **+ Add hospital manually** when search misses
- [ ] Duplicate manual/search entry shows inline error
- [ ] Unlinked card — editable name/city/state; linked card — metrics + **Change facility**
- [ ] Stacked accordion — one card open; gap review opens correct card
- [ ] Reorder ↑/↓ — DOCX experience order matches
- [ ] Linked facility MetricTiles highlighted until **Change facility**
- [ ] EMR **Other** → custom text field; persists through refresh and DOCX
- [ ] Preset EMR (Epic/Cerner/Meditech) — no extra field

### E. Step 3 — credentials & education

- [ ] License number + state required before **Review** (soft hints for other gaps)
- [ ] Education rows — Degree / School / Graduation year labels; no “School 1/2” headers
- [ ] Parse-prefilled Step 3 fields highlighted until edited

### F. Step 4 — review & submit

- [ ] Gap review links focus correct field (including employer accordion + link search)
- [ ] Submit overlay: saving → generating → finalizing → success
- [ ] Submit error — overlay dismisses; retry works
- [ ] Downloaded file: `LastName_FirstName_VMS-Resume.docx` (not `resume.docx` or UUID)
- [ ] Success screen confirmation copy

### G. Recruiter admin

- [ ] Sign in; create invite; copy/open link
- [ ] Signed-in recruiter on intake — **Admin / Client** toggle visible
- [ ] **Client view** — same gates as candidate (license, gap review, etc.)
- [ ] **Admin view** — bypass Next gates; **Download draft packet** without submitting
- [ ] Admin table DOCX — `LastName_FirstName_VMS-Resume.docx`
- [ ] Email completion link (`/intake/complete/{accessToken}`) — same filename pattern
- [ ] Toggle stays on right edge of centered column on desktop

### H. Failure paths (regression)

- [ ] Invalid/expired token — blocked with recruiter guidance
- [ ] Missing `GEMINI_API_KEY` — text PDF heuristics; image PDF manual continue
- [ ] Gemini 503 / capacity — friendly message + manual continue
- [ ] Rapid re-upload rate limit — 429 + manual continue

### I. VMS / DOCX content

- [ ] Parse-heavy profile — DOCX sections match intake (including manual hospital + custom EMR)
- [ ] Manual-heavy profile — gap review catches blanks; DOCX populated
- [ ] `node scripts/inventory-template-tags.mjs` — no unmapped tags

### J. Server-only (optional QA)

- [ ] After Gemini parse — Supabase `parsed_resume.audit` populated; client API response has no audit fields

---

## Deploy checklist

- [ ] `git pull` on `main` at or after `f7b4070`
- [ ] `npm run build` on deploy target
- [ ] Supabase migrations applied (if any since last deploy)
- [ ] `NUXT_PUBLIC_SITE_URL` matches deployed host (invite + email links)
- [ ] No secrets in client bundle
- [ ] Smoke one full intake on production URL after deploy

---

## Sign-off

| Date | Tester | Commit | Environment | Result | Notes |
|------|--------|--------|-------------|--------|-------|
| | | `f7b4070` | local / Render | | |

**Known out of scope for this batch:** storage upload paths still `{candidateId}/{uuid}-{original}`; document preview before download; parse audit Phase B/C UI.
