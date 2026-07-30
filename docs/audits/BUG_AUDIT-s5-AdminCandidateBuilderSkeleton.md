# BUG_AUDIT — Slice 5 · `AdminCandidateBuilderSkeleton.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (**last queue file**) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |

## Summary

Pure loading placeholder with `aria-busy` + `aria-label`. No error/empty (parent swaps to `loadError` Retry). Lows: reduced-motion pulse; optional `role="status"`.

---

## Action inbox (do this later)

### Must / Should

_None._

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-SK-L1 | Low | Main | `motion-reduce:animate-none` on pulse blocks | template |
| S5-SK-L2 | Low | Main | Optional `role="status"` | root |

### Human smoke

- [ ] Select candidate → brief skeleton → form  

---

## Findings detail

### Solid

Loading semantics present; layout mirrors builder chrome.

---

## Slice 5 Agent 2 — UI queue complete

| Pass | Status |
| --- | --- |
| API (`BUG_AUDIT-s5-api.md`) | Separate branch `docs/bug-audit-s5-api` |
| UI (this branch) | **Done** — admin.vue through skeleton |

**Highest-signal UI findings:** **S5-AB-H1** (submitted Download disabled), list empty copy (**S5-CL-M1**), clipboard silence (**S5-CT-M1** / **S5-SB-M1**), packet modal partial parse (**S5-NP-M1**), save Retry (**S5-AB-M1**), read-only mutate via jump drawer (**S5-JD-M1**).

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Mark Slice 5 Agent 2 UI Done? | **Yes** (fixes/tests/tour still Main / Agent 1 / 5) |
| Ship | **no** until user asks for PR |

## PHI

Scrubbed.
