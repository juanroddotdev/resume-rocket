# BUG_AUDIT — Slice 5 · `AdminExtraDetailsDrawer.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 7 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminSupplementalBucket.vue` |

## Summary

Empty states distinguish no-resume vs nothing extra; apply success uses `role="status"` + **Go to Snapshot**; Escape/Close work; `disabled` passed through to the bucket. No async surface here (errors live in child/parent). Lows only: reduced-motion transition; apply notice not dismissible alone.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

_None for empty/error contracts on this shell._

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-ED-L1 | Low | Main | `motion-reduce:transition-none` / skip slide when reduced motion | style ~121–131 |
| S5-ED-L2 | Low | Main | Optional dismiss on apply notice without leaving drawer | ~79–92 |

### Human smoke

- [ ] Open with items → apply → notice + Go to Snapshot  
- [ ] Empty + no resume vs empty + resume copy  
- [ ] Escape / Close  
- [ ] Submitted (`disabled`) → apply controls inert in child  

### Docs / tour

Next: AdminSupplementalBucket → ParseQAPanel → EmployersJumpDrawer → remaining admin components  

---

## Findings detail

### High / Medium

None.

### Low

Motion; notice dismiss.

### Solid

| Area | Notes |
| --- | --- |
| Empty | Two contextual messages |
| Apply feedback | Status + recovery navigation |
| Close | Text + Escape; listener cleaned up |
| a11y | `complementary` + labeled by candidate name |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminSupplementalBucket.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed.
