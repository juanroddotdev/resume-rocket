# BUG_AUDIT — Slice 5 · `AdminNavMenu.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 5 — Admin UI (file 11 / queue) |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `12590cb` · branch `docs/bug-audit-s5-admin` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/admin/AdminSectionTabs.vue` |

## Summary

Admin dropdown: Parse QA gated on selection, Sign out, dev fixtures behind `import.meta.dev`. Outside click closes; listeners cleaned up. No loading/error surface (orchestration only). Gaps: **no Escape**; disabled Parse QA has no title explaining why; sign-out failure silent.

---

## Action inbox (do this later)

### Must fix

_None._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-NM-M1 | Medium | Main | Escape closes menu (and nested dev submenu) | script |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S5-NM-L1 | Low | Main | `title` on disabled Parse QA: “Select a candidate first” | ~78–88 |
| S5-NM-L2 | Low | Main | Surface sign-out failure (`authError` toast) | `signOut` ~11–15 |
| S5-NM-L3 | Low | Main | Focus first menuitem on open | menu ~73–145 |

### Human smoke

- [ ] No selection → Parse QA disabled  
- [ ] With selection → opens Parse QA panel  
- [ ] Sign out → login screen  
- [ ] Dev: fixtures submenu  
- [ ] Click outside closes  

### Docs / tour

Next: AdminSectionTabs → AdminCandidateBuilderSkeleton → Slice 5 UI queue complete  

---

## Findings detail

### Medium

**S5-NM-M1** — Escape not handled (unlike other admin panels).

### Low

Disabled hint; sign-out errors; focus.

### Solid

| Area | Notes |
| --- | --- |
| Gating | Parse QA / fixtures need selection |
| Dev | Production omits fixtures |
| Outside click | Document listener + cleanup |
| a11y | `aria-expanded` / `aria-haspopup` / `role="menu"` |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file done? | **Yes** |
| Next queue file | **`components/admin/AdminSectionTabs.vue`** |
| Mark Slice 5 Done? | **No** — tabs + skeleton left |

## PHI

Scrubbed.
