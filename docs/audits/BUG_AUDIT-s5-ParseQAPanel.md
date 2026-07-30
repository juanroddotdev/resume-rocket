# BUG_AUDIT — Slice 5 · `ParseQAPanel.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 9 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/EmployersJumpDrawer.vue` (shared — cross-ref S4; then remaining admin components) |

## Summary

Loading skeletons, error + **Retry**, and “No parse audit yet” empty copy are solid. Dialog is teleported with backdrop close. Gaps: **no Escape**; **no focus trap / initial focus**; in-flight load not aborted on close/switch.

---

## Action inbox (do this later)

### Must fix

_None_ (feature-flagged API 404 still surfaces as error + Retry).

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-PQ-M1 | Medium | Main | Escape closes panel (when not loading, or always) | script + dialog |
| S5-PQ-M2 | Medium | Main | Focus into panel on open; trap Tab; restore on close | dialog ~76–97 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-PQ-L1 | Low | Main | Abort / ignore stale `loadAudit` if closed or `candidateId` changed | `loadAudit` ~31–49 |
| S5-PQ-L2 | Low | Main | If `open && !candidateId`, show “Select a candidate” instead of blank body | watch ~19–28 |

### Human smoke

- [ ] Open Parse QA → loading → outcome/tables  
- [ ] Force 401/404 → error + Retry  
- [ ] Candidate with no parse → empty guidance  
- [ ] Backdrop / Close; Escape after fix  

### Docs / tour

Next: EmployersJumpDrawer (S4 already has `BUG_AUDIT-s4-EmployersJumpDrawer.md` — brief S5 cross-check or defer) → remaining `components/admin/*`  

---

## Findings detail

### Medium

Escape; focus management.

### Low

Stale fetch; blank when no id.

### Solid

| Area | Notes |
| --- | --- |
| Loading | Pulse blocks |
| Error | Message + Retry |
| Empty audit | Centered guidance |
| a11y label | `aria-label` with candidate name |
| Evidence UI | Missing snippet / not-in-wizard callouts |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/intake/EmployersJumpDrawer.vue`** |
| Mark Slice 5 Done? | **No** |

## PHI

Scrubbed — panel shows resume snippets/licenses for recruiters; do not paste into tickets.
