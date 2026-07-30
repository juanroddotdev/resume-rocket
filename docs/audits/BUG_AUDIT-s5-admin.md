# BUG_AUDIT — Slice 5 · `pages/admin.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 1 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminCandidateList.vue` |

## Summary

Hub shell: sign-in, sidebar list, builder/table toggle, packet modal, Parse QA. List load has loading + error **Retry**. Empty builder has CTA. Action-bar errors (DOCX / intake / delete) use `role="alert"` + **Dismiss** but no Retry. Sign-in has no busy state and is not a `<form>` (Enter may not submit). Collapsed sidebar hides search/list (by design) with sr-only hint.

---

## Action inbox (do this later)

### Must fix

_None for this page alone_ (API Musts **S5-H1** resolved in #165; remaining API Medium **S5-M2** role allowlist in `BUG_AUDIT-s5-api.md`).

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AD-M1 | Medium | Main | Sign-in: loading/disabled while `signInWithPassword` in flight (prevent double submit; visible feedback) | `signIn` ~97–104 + button ~241–247 |
| S5-AD-M2 | Medium | Main | Wrap sign-in in `<form @submit.prevent="signIn">` so Enter submits | template ~236–249 |
| S5-AD-M3 | Medium | Main | DOCX/delete error banner: add **Retry** (or clear copy that user re-triggers from row) — Dismiss alone is weak vs `empty-error-states` | ~254–266 + `downloadCandidateDocx` / `deleteDraftCandidate` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-AD-L1 | Low | Main | Prefer fixed friendly DOCX copy over raw `error.message` | ~191–192 |
| S5-AD-L2 | Low | Main | Alert shows only one of `docxError \|\| intakeOpenError \|\| deleteError` — stack or queue if multiple | ~255–259 |
| S5-AD-L3 | Low | Main | Collapsed sidebar: optional selected-candidate indicator in rail | ~318–325 |
| S5-AD-L4 | Low | Main | Guard `loadCandidates` if `user` cleared mid-request | ~106–128 |

### Tests (Agent 1)

- [ ] (UI later) Prefer API tests from s5-api pass; page is orchestration  
- [ ] Optional: document expected query `?view=table` behavior for e2e  

### Human smoke

- [ ] Sign in fail → error; success → list loads  
- [ ] List error → Retry  
- [ ] Empty builder → New packet CTA  
- [ ] Download DOCX fail → banner + Dismiss  
- [ ] Delete draft confirm → removed; submitted cannot  
- [ ] Collapse sidebar → expand restores list  

### Docs / tour

Queue continues: AdminCandidateList → CandidatesTable → NewCandidatePacketModal → …

---

## Findings detail

### Medium

1. **S5-AD-M1** — No `signingIn` / button disabled during auth.  
2. **S5-AD-M2** — Not a form; keyboard submit unreliable.  
3. **S5-AD-M3** — Global action errors dismiss-only.

### Low

Raw DOCX messages; single-slot alert; collapsed rail; load race.

### Solid

| Area | Notes |
| --- | --- |
| List error | Message + Retry |
| Empty builder | Explains + New packet |
| Action alert | `role="alert"` |
| Delete | Confirm + draft-only client check |
| View tabs | `aria-selected` / tablist |
| Sidebar | `aria-label`, collapse control, `motion-reduce` |
| Intake missing URL | Explicit error copy |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminCandidateList.vue`** |
| Mark Slice 5 Done? | **No** |
| Ship | **no** |

## PHI

Scrubbed.
