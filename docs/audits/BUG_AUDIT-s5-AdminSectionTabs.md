# BUG_AUDIT — Slice 5 · `AdminSectionTabs.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 12 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminCandidateBuilderSkeleton.vue` (**last** queue item) |

## Summary

Presentational section tablist with `aria-selected` and amber missing-count badges. Supports optional `disabled`, but **builder does not pass it**. No loading/error/empty surface needed. Lows only.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

_None blocking._

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-ST-L1 | Low | Main | Pass `:disabled="!isEditable \|\| devPrefilling"` from builder (prop already exists) | `AdminCandidateBuilder` + tabs |
| S5-ST-L2 | Low | Main | Badge `aria-label` e.g. “3 gaps” (number alone is vague for AT) | ~43–48 |
| S5-ST-L3 | Low | Main | Optional arrow-key tablist keyboard pattern | nav |

### Human smoke

- [ ] Tabs switch sections / scroll  
- [ ] Missing badges appear when gaps exist  
- [ ] Horizontal scroll on narrow screens  

### Docs / tour

**Last:** `AdminCandidateBuilderSkeleton.vue` → then mark Slice 5 Agent 2 UI queue done (API pass already on `docs/bug-audit-s5-api`).

---

## Findings detail

### High / Medium

None.

### Low

Unused disabled wiring; badge semantics; keyboard.

### Solid

| Area | Notes |
| --- | --- |
| a11y | `role="tablist"` / `tab` / `aria-selected` |
| Overflow | `overflow-x-auto` |
| Visual | Active ring + gap pills |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminCandidateBuilderSkeleton.vue`** |
| Mark Slice 5 Done? | **No** — one file left |

## PHI

Scrubbed.
