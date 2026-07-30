# BUG_AUDIT — Slice 5 · `CandidatesTable.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 3 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/NewCandidatePacketModal.vue` |

## Summary

Loading rows, contextual empty messages (true empty vs search vs filter), row menu (Escape / outside click / cleanup), and draft-only delete look solid — better empty UX than `AdminCandidateList`. **Clipboard copy failure is silent** (menu closes, no error). DOCX/open-intake errors surface on parent (`admin.vue`).

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-CT-M1 | Medium | Main | On clipboard failure, show recoverable message (toast/inline “Couldn’t copy — try again” or emit error to parent banner) | `copyIntakeLink` catch ~36–38 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-CT-L1 | Low | Main | `aria-label` “More actions for {name}” | ~257 |
| S5-CT-L2 | Low | Main | Move focus into menu on open / restore on close | menu ~264–307 |
| S5-CT-L3 | Low | Main | Align sidebar list empty copy with this `emptyMessage` pattern (**S5-CL-M1**) | shared helper later |
| S5-CT-L4 | Low | Main | Draft without `intake_url`: optional menu hint “No intake link” | `intakeLinkActive` |

### Human smoke

- [ ] Loading skeletons  
- [ ] Empty / search / filter messages  
- [ ] Copy link → Copied!; deny clipboard → expect error after fix  
- [ ] Open / Download / Delete via ···  
- [ ] Escape closes menu  

### Docs / tour

Next: NewCandidatePacketModal → AdminCandidateBuilder → …

---

## Findings detail

### Medium

**S5-CT-M1** — `catch { closeMenu() }` swallows clipboard errors with no user guidance.

### Low

Menu a11y/focus; share empty helper with list; missing-link hint.

### Solid

| Area | Notes |
| --- | --- |
| Empty | Distinguishes empty list, search, draft/submitted filters |
| Loading | Skeleton rows |
| Menu | `aria-expanded` / `role="menu"`; listeners cleaned up |
| Intake actions | Only when draft + URL |
| Parse chips | Vision / Partial / OK / Failed |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/NewCandidatePacketModal.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed.
