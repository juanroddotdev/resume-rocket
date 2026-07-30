# BUG_AUDIT — Slice 5 · `NewCandidatePacketModal.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 4 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminCandidateBuilder.vue` |

## Summary

Identity validation, loading labels per path, MIME/size checks, link-ready success UI (URL + clipboard fallback + Copy again), Escape/backdrop close while idle, and `role="alert"` errors look solid. Gaps: **upload can create invite/candidate then fail on parse** (orphan draft + error only); **no focus trap / initial focus** on the dialog; upload/scratch success closes even when clipboard copy failed (link-ready path handles this better).

---

## Action inbox (do this later)

### Must fix

_None security-critical in this SFC alone._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-NP-M1 | Medium | Main | If invite+candidate succeed but `/parse` fails: keep modal open with intake URL + “Packet created — parse failed; open in builder or retry upload”, or emit `ready` then surface parse error in builder | `createFromFile` ~141–154 |
| S5-NP-M2 | Medium | Main | Focus: move focus into dialog on open; trap Tab; restore focus on close | template dialog ~244–249 |
| S5-NP-M3 | Medium | Main | Upload/scratch: if `copied === false`, don’t silent-close without showing URL (mirror link-ready panel or toast) | `createFromFile` / `onScratchPath` success |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-NP-L1 | Low | Main | Explicit **Retry** under error (actions already re-runnable) | ~402 |
| S5-NP-L2 | Low | Main | `dragleave` flicker on drop zone children | ~372 |
| S5-NP-L3 | Low | Main | Prefer not to put invite URL in DOM longer than needed after Done (session hygiene) | linkResult panel |

### Human smoke

- [ ] Names required; bad email blocked  
- [ ] Create & copy link → ready panel; clipboard blocked → manual copy copy  
- [ ] Upload happy path → builder  
- [ ] Force parse fail after create → expect guidance (S5-NP-M1)  
- [ ] Scratch → builder  
- [ ] Escape/Cancel while idle; blocked while Creating…  

### Docs / tour

Next: AdminCandidateBuilder → AdminProfessionalSnapshot → …

---

## Findings detail

### Medium

1. **S5-NP-M1** — Partial success on upload path.  
2. **S5-NP-M2** — Dialog a11y focus.  
3. **S5-NP-M3** — Silent close when clipboard fails on non-link paths.

### Low

Retry label; dragleave; URL dwell time.

### Solid

| Area | Notes |
| --- | --- |
| Loading | Per-path “Creating…” / “Creating & parsing…” |
| Errors | `role="alert"` + actionable re-click |
| Link success | Readonly URL, status, Copy again error copy |
| Validation | Names + optional email format |
| File gate | Ext/MIME + 10MB before upload |
| Close while busy | Backdrop/Escape gated on `!loading` |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminCandidateBuilder.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed — do not paste real intake URLs into tickets.
