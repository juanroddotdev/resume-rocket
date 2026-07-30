# BUG_AUDIT — Slice 5 · `AdminCandidateList.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 2 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/CandidatesTable.vue` |

## Summary

Loading skeletons and draft-only delete control look fine. **Empty copy is wrong when filters/search exclude everyone** — still says “No candidates yet. Create a packet…” even if the full list is non-empty. Parent owns list-load errors (Retry on `admin.vue`).

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-CL-M1 | Medium | Main | Empty state: if `candidates.length` but `filtered` empty → “No matches for this search/filter” (+ clear hint); reserve “No candidates yet…” for truly empty list | template ~80–82 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-CL-L1 | Low | Main | Delete `aria-label` include name: `Delete draft — Jane Doe` | ~71 |
| S5-CL-L2 | Low | Main | `aria-current="true"` on selected row button | ~57–61 |
| S5-CL-L3 | Low | Main | Optional search email / phone (today name, EMR, first employer only) | `filtered` ~31–36 |

### Human smoke

- [ ] Loading skeletons  
- [ ] Select highlights; draft trash → parent confirm  
- [ ] Filter Drafts with only submitted → empty **match** copy (after fix)  
- [ ] Search nonsense → no-match copy  

### Docs / tour

Next: CandidatesTable → NewCandidatePacketModal → AdminCandidateBuilder → …

---

## Findings detail

### Medium

**S5-CL-M1** — Single empty string ignores filter/search context (`empty-error-states`).

### Low

Delete label; aria-current; search fields.

### Solid

| Area | Notes |
| --- | --- |
| Loading | Pulse placeholders |
| Delete | Draft-only; `stopPropagation`; focus reveals control |
| Unnamed | “Unnamed candidate” |
| Submitted filter | Includes `confirmed` |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/CandidatesTable.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed.
