# BUG_AUDIT — Slice 1 · Invite + upload gate

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 1 — Invite + upload gate |
| **Date** | 2026-07-28 |
| **Base** | `main` @ `6230ff4` (re-checked after #144 name-required invites) |
| **Ship** | no — report only |
| **Production edits** | none |

## Summary

Invite UI gate is solid: invalid/expired/completed/missing tokens do not reach the wizard; parse failure stays on upload with error + **Continue manually**. No High blockers for Slice 1 End criteria on the UI path.

Mediums are mostly PHI hygiene on validate failure, cookie cleanup, recovery UX, and making `allowSubmitted` opt-in so post-submit API callers do not regress.

---

## Action inbox (do this later)

### Must fix (before calling Slice 1 “hardened”)

_None required to unblock Agent 1 or human smoke._ Gate works.

### Should fix (Side / Main ticket — recommend one small PR)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S1-M1 | Medium | Main | Stop returning PII on **invalid** validate responses (`completed` currently echoes email + first/last name) | `server/api/invites/validate.get.ts` |
| S1-M2 | Medium | Main | Clear `intake_token` cookie when validate fails (expired/invalid/revoked/completed) | `validate.get.ts` + `requireInvite.ts` (`deleteCookie` / `maxAge: 0`) |
| S1-M3 | Medium | Main | Add **Retry** on `inviteError === 'unavailable'` (re-run `bootstrapInvite`) | `pages/intake/[token].vue` |
| S1-M4 | Medium | Main | On parse 401/403, do not offer **Continue manually** (same auth will fail on `ensureDraft`); show recruiter / re-validate copy | `components/intake/FileDropZone.vue` (+ parent if needed) |
| S1-M5 | Medium | Main | Make `requireInviteForCandidate` default `allowSubmitted: false`; pass `true` only for docx / confirmation / GET-after-submit | `server/utils/requireInvite.ts` + callers |

### Suggested (nice-to-have)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S1-L1 | Low | Main | Remove `matchMedia` listener on unmount | `FileDropZone.vue` |
| S1-L2 | Low | Main | Client-side MIME + 10MB check before upload (drop + picker) | `FileDropZone.vue` |
| S1-L3 | Low | Main | Optional explicit copy for `revoked` (today uses generic recruiter line) | `[token].vue` |
| S1-L4 | Low | Main | Reduced-motion processing fallback polish | `IntakeProcessingCard.vue` |

### Adjacent (out of Slice 1 Allowed paths — do not forget)

| ID | Priority | Owner | What | Notes |
| --- | --- | --- | --- | --- |
| S1-X1 | Medium | Main / Slice 2 | Post-submit `POST /api/parse` with retained token + `candidateId` still authorizes via `allowSubmitted: true` | Confirm immutability in parse pipeline; Agent 1 Slice 2 |
| S1-X2 | Medium | Main / Slice 5 API | `patchCandidateRow` allows field updates if body includes `status: 'submitted'` while already submitted | Audit on Slice 5 API pass |

### Tests (Agent 1 — kickoff `s1-agent1.md`)

- [ ] Missing token / header → 401 shape from invite helpers
- [ ] `validateInviteToken`: invalid, expired, revoked, completed
- [ ] Cookie vs `x-intake-token` preference
- [ ] (After S1-M1) Invalid validate JSON has **no** email/name fields
- [ ] Write `docs/audits/QA_REPORT-s1-invite.md` when done

### Human smoke (you)

From `docs/RELEASE-CHECKLIST.md`:

- [ ] Invalid token → “Link unavailable” + recruiter guidance (not blank)
- [ ] Expired token → expired copy
- [ ] Completed invite → already submitted copy
- [ ] Valid → upload step; force parse failure → stay on upload + Continue manually
- [ ] Optional: revoked link; mid-session 403 messaging after S1-M4

### Docs / tour (Agent 5 wrap-up when slice closes)

- [ ] Mark Slice 1 progress in `docs/APP-COVERAGE-TOUR.md` when tests + smoke (or explicit defer) done
- [ ] Do **not** fake-check RELEASE boxes

---

## Findings detail

### High

None on Allowed Slice 1 paths for the UI gate.

### Medium

1. **`server/api/invites/validate.get.ts` ~11–18**  
   **Cause:** Failed validate with `completed` returns `candidate_email`, `candidate_first_name`, `candidate_last_name`.  
   **Fix:** Return only `{ valid: false, reason }` on failure.

2. **Cookie not cleared on failure** (`validate.get.ts` / `setInviteCookie`)  
   **Cause:** Prior valid invite cookie can linger after opening a bad link. UI still blocked; cookie auth for old token remains.  
   **Fix:** `deleteCookie` / expire cookie on `!result.valid`.

3. **`pages/intake/[token].vue` ~431–438**  
   **Cause:** `unavailable` says “try again” with no control (`empty-error-states`).  
   **Fix:** Retry button → `bootstrapInvite(token)`.

4. **`FileDropZone.vue` ~167–177 + `onManual`**  
   **Cause:** Auth errors still show Continue manually → `ensureDraft` fails the same way.  
   **Fix:** Branch 401/403 UX away from manual continue.

5. **`requireInvite.ts` ~54–66**  
   **Cause:** Always `allowSubmitted: true`; safety depends on every caller.  
   **Fix:** Opt-in flag; update docx/confirmation/GET callers only.

### Low

See Suggested table (S1-L1–L4).

### Solid (no action)

- `invites.post.ts` — admin session; names required (#144)
- `validateInviteToken` reason matrix
- `[token].vue` loading / gate / step-0 deep-link guard
- `FileDropZone` loading, 429 copy, parse_failed stay + manual
- `ParseNoticeBanner` partial / document_scan
- `docxAccess.ts` admin then invite; missing token → 401

---

## Slice readiness

| Question | Answer |
| --- | --- |
| Ready for Agent 1? | **Yes** — paste `s1-agent1.md` |
| Ready to mark Slice 1 Done? | **Not yet** — need Agent 1 report + human smoke (or documented defer) |
| Next Agent 2? | Slice 2 kickoff `s2-agent2.md` after you decide on Mediums (can parallel Agent 1) |

## PHI

Report scrubbed: no resume text, real emails, phones, license numbers, or invite tokens.
