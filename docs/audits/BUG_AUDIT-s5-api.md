# BUG_AUDIT — Slice 5 · admin + candidate APIs

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — API roots pass (admin/candidate) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s5-api` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Allowed** | `server/api/admin/**`, `server/api/candidates/**`, `requireAdmin.ts`, `patchCandidateRow.ts`, `candidateDraftResponse.ts`, `sendEmail.ts` |
| **Next** | Slice 5 **UI** queue (`pages/admin.vue` …) via `s5-agent2.md` — separate from this API pass |

## Summary

Admin routes consistently call `requireAdminSession`; invite-scoped candidate GET/PATCH/send-confirmation call `requireInviteForCandidate`. Draft vs submitted stripping in `buildCandidateDraftResponse` is solid. Resend missing key soft-skips (intentional). **Must:** `patchCandidateRow` immutability hole — already-submitted/confirmed rows accept further field writes when the body includes `status: 'submitted'` (confirms **S1-X2**; can also **downgrade** `confirmed` → `submitted`). No automated tests cover these helpers/routes yet.

---

## Action inbox (do this later)

### Must fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-H1 | High | Main | Lock submitted/confirmed candidates: reject PATCH field updates (and status downgrades). Do not treat `body.status === 'submitted'` as a bypass. Prefer hard 409 for any non-empty patch when `existing.status` ∈ {submitted, confirmed}, unless a dedicated admin “reopen” exists | `server/utils/patchCandidateRow.ts` ~33–43, ~67–81 |

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-M1 | Medium | Main | Restrict `status` transitions in schema or `patchCandidateRow` (e.g. only `draft`→`submitted` via submit path; `confirmed` only via send-confirmation). Today invite/admin can PATCH `confirmed` / `archived` from draft | `schemas.ts` `candidatePatchSchema` + `patchCandidateRow.ts` |
| S5-M2 | Medium | Main | `requireAdminSession` accepts **any** valid Supabase user JWT — no role/allowlist. Document “Auth users = recruiters only” or check `app_metadata` / allowlist | `server/utils/requireAdmin.ts` ~27–32 |
| S5-M3 | Medium | Main | Candidate PATCH still authorized post-submit because `requireInviteForCandidate` hardcodes `allowSubmitted: true` (**S1-M5**). Pair with S5-H1 so token retention cannot mutate | `requireInvite.ts` ~63 (call sites under `server/api/candidates/`) |
| S5-M4 | Medium | Main | Soft-fail path logs full Resend/`catch` error — strip recipient / message body from `console.error` | `send-confirmation.post.ts` ~53–54; `sendEmail.ts` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-L1 | Low | Main | Check error on `intake_invites.used_at` update after submit | `patchCandidateRow.ts` ~76–80 |
| S5-L2 | Low | Main | Admin delete: storage remove failure only warns — orphan objects in `resumes` bucket | `admin/.../delete.ts` ~33–37 |
| S5-L3 | Low | Main | Map Zod `.parse` failures to 400 (global or per-route `safeParse`) | admin/candidate PATCH POST bodies |
| S5-L4 | Low | Main | Admin create: ignore failure on `intake_invites.candidate_id` update | `admin/candidates.post.ts` ~62–65 |
| S5-L5 | Low | Main | `propose-snapshot` has no rate limit (Gemini cost) | `propose-snapshot.post.ts` |
| S5-L6 | Low | Main | Success payload returns `email` — prefer `{ sent: true }` only | `send-confirmation.post.ts` ~69 |

### Tests (Agent 1)

Pure / easy seams (no live Supabase required if mocked):

- [ ] `buildCandidateDraftResponse`: draft returns fields; submitted/confirmed return `{ id, status }` only
- [ ] `patchCandidateRow` (mocked admin client): submitted + `{ status: 'submitted', first_name }` → **409** after S5-H1; today would update (regression test for the hole)
- [ ] confirmed + `{ status: 'submitted', ... }` → 409 (no downgrade)
- [ ] draft + `{ status: 'submitted' }` → allowed; draft + `{ status: 'confirmed' }` → rejected after S5-M1
- [ ] `requireAdminSession`: missing Bearer → 401; invalid JWT → 401 (integration or thin wrapper test)
- [ ] send-confirmation: no `RESEND_API_KEY` → `{ skipped: true }` without throwing (mock runtimeConfig)

Write `docs/audits/QA_REPORT-s5-api.md` when done.

### Human smoke

- [ ] Admin list/load/patch draft candidate  
- [ ] Submit intake → further PATCH with invite cookie fails (after S5-H1)  
- [ ] Confirmation email: with Resend → sent + status confirmed; without key → skipped, intake still OK  
- [ ] Delete draft packet → gone; submitted cannot delete  

### Docs / tour

- [ ] Agent 5: note API pass complete; UI queue still open for Slice 5  
- [ ] Cross-link S1-X2 / S1-M5 as closed when S5-H1 + S5-M3 land  

---

## Findings detail

### High

**S5-H1 — submitted/confirmed mutable via PATCH** (`patchCandidateRow.ts` ~33–43)

```ts
if (existing?.status === 'submitted' || existing?.status === 'confirmed') {
  if (body.status !== 'submitted') {
    throw createError({ statusCode: 409, statusMessage: 'Candidate already submitted' })
  }
}
```

**Cause:** Gate opens when the client re-sends `status: 'submitted'`, then `update(patch)` applies **all** other body fields. For `confirmed`, the same bypass also writes `status: 'submitted'` (downgrade) plus field changes. Invite PATCH and admin PATCH share this helper.

**Fix (suggestion):**

```ts
if (existing?.status === 'submitted' || existing?.status === 'confirmed') {
  throw createError({
    statusCode: 409,
    statusMessage: 'Candidate already submitted',
  })
}
```

(Or allow only empty/no-op / explicit admin reopen flag.)

### Medium

1. **S5-M1** — `status` enum on patch is unconstrained by lifecycle.  
2. **S5-M2** — Admin = any Auth user.  
3. **S5-M3** — Post-submit invite still authorizes candidate routes (`allowSubmitted: true`).  
4. **S5-M4** — Error logging may include PII adjacent to Resend failures.

### Low

See Suggested table (used_at error, storage orphans, Zod 400, create link update, snapshot rate limit, email echo).

### Solid (no action)

| Area | Notes |
| --- | --- |
| Admin auth on all `admin/**` handlers | `requireAdminSession` first |
| Invite↔candidate match | `requireInviteForCandidate` compares `intake_invite_id` |
| Draft response | Submitted/confirmed strip field payload |
| Admin parse | 409 if already submitted |
| Admin delete | Draft-only; revokes invite |
| Resend missing key | `{ skipped: true }` — matches graceful-degradation |
| send-confirmation catch | Returns soft failure; does not mark confirmed |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| API pass done? | **Yes** (this report) |
| Ready for Agent 1 on API seams? | **Yes** — especially `buildCandidateDraftResponse` + patch immutability |
| Mark Slice 5 Done? | **No** — UI queue (`pages/admin.vue` …) still pending |
| Next Agent 2 queue | **`pages/admin.vue`** (kickoff `s5-agent2.md` / tour UI list) |
| Ship | **no** until user asks for PR |

## PHI

Scrubbed — no tokens, emails, or resume blobs in this report.
