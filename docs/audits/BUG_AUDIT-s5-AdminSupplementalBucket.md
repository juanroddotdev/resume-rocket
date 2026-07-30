# BUG_AUDIT — Slice 5 · `AdminSupplementalBucket.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 8 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/ParseQAPanel.vue` |

## Summary

Presentational list: Copy / Apply with `disabled` support and “Copied” feedback. Empty states live in `AdminExtraDetailsDrawer`. **Clipboard failure emits `copy` but the drawer does not listen** — same silent-fail pattern as **S5-CT-M1**.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-SB-M1 | Medium | Main | On clipboard failure: show inline error / select text, or have parent handle `@copy` (drawer currently ignores it) | `onCopy` catch ~25–27 + `AdminExtraDetailsDrawer` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-SB-L1 | Low | Main | Clear copy timeout on unmount | ~22–24 |
| S5-SB-L2 | Low | Main | `aria-live` when label flips to “Copied” | Copy button ~41–48 |

### Human smoke

- [ ] Copy → Copied  
- [ ] Deny clipboard → expect feedback after fix  
- [ ] Apply → parent notice  
- [ ] `disabled` → buttons inert  

### Docs / tour

Next: ParseQAPanel → EmployersJumpDrawer (shared; may cross-ref S4) → remaining admin components  

---

## Findings detail

### Medium

**S5-SB-M1** — Failed copy is silent for recruiters.

### Low

Timer cleanup; live region.

### Solid

| Area | Notes |
| --- | --- |
| Disabled | Copy + Apply |
| Apply labels | Uses snapshot label map |
| Empty | Deferred to parent drawer |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/ParseQAPanel.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed — item values may be resume-derived; don’t paste into tickets.
