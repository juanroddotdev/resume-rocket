# BUG_AUDIT — Slice 4 · `pages/intake/[token].vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `pages/intake/[token].vue` (queue item 1) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Also read** | `composables/useIntakeInvite.ts`, `useCandidateForm.ts` (`ensureDraft` / hydrate), `useIntakeWizardNav.ts` |
| **Next file** | `components/intake/HospitalAutocomplete.vue` |

## Summary

Invite gate, loading label, submit/redownload/preview errors with Retry, save-status retry, and step empty hints are in place. Identity inputs do not trim mid-keystroke. Mediums on this SFC: step-1 **Next** ignores format validation already computed by `identityFieldValid`; `onParsed` / `onManual` lack try/catch around `ensureDraft`; invite `unavailable` has no Retry; bootstrap can leave **Loading…** stuck if `goToStep` throws (no `try/finally`).

---

## Action inbox (do this later)

### Must fix

_None that blank the wizard with zero messaging on the happy path._ Invite invalid states and submit failure UI exist.

### Should fix (Side / Main — recommend small PR(s))

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-T-M1** | Medium | Main | Gate step-1 Next with `identityFieldValid` (email format / phone digits) — today truthy-only | `canAdvanceStep1` ~309–312 |
| **S4-T-M2** | Medium | Main | try/catch on `onParsed` / `onManual` / `onDevPrefill`; surface error on step 0 if `ensureDraft` / apply fails | ~265–307 |
| **S4-T-M3** | Medium | Main | Invite `unavailable`: add **Retry** → `bootstrapInvite(token)` (aligns Slice 1 **S1-M3**) | ~431–438 |
| **S4-T-M4** | Medium | Main | `onMounted` / token `watch`: `try/finally` so `loading` clears on bootstrap failure | ~233–244 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-T-L1 | Low | Main | Submit overlay: `role="alertdialog"` + focus management while generating | ~416–426 |
| S4-T-L2 | Low | Main | Success `✓` → `aria-hidden="true"` | ~770 |
| S4-T-L3 | Low | Main | Document admin bypass of `canAdvanceStep*` in recruiter preview copy | `isAdminView` gates |
| S4-T-L4 | Low | Main | Specialty required at gap review but not on step-2 Next — optional amber hint like employers | `canAdvanceStep2` ~314–317 |

### Tests (Agent 1 — when fixing)

- [ ] Invalid email / short phone → Next disabled (after S4-T-M1)
- [ ] Force `ensureDraft` failure → stay on upload + error (S4-T-M2)
- [ ] Unavailable invite → Retry re-runs validate
- [ ] Simulate `goToStep` throw during bootstrap → not stuck on Loading…

### Human smoke

- [ ] Loading → upload → steps 1–4 → gap review → submit error Retry
- [ ] Draft restored banner dismiss
- [ ] Deep-link `?step=2` without draft → forced to upload
- [ ] Expired / completed / generic invalid invite copy

### Docs / tour

- [ ] Continue queue **file-by-file** (do not treat bulk prior reports as Slice 4 End)
- [ ] Re-paste kickoff with `Next file: HospitalAutocomplete.vue` or say “continue with HospitalAutocomplete.vue”
- [ ] Do not fake-check RELEASE from this report alone

---

## Findings detail

### High

None on this page alone for silent total failure of the primary happy path.

### Medium

1. **`canAdvanceStep1` ~309–312**  
   **Cause:** Truthy checks only. `identityFieldValid` + `FieldValidityIcon` can show invalid while Next stays enabled (`a@b`, `123`).  
   **Fix suggestion:**
   ```ts
   function canAdvanceStep1() {
     if (isAdminView.value) return true
     return (['first_name', 'last_name', 'email', 'phone'] as const)
       .every(f => identityFieldValid(f))
   }
   ```

2. **`onParsed` / `onManual` ~265–287**  
   **Cause:** `ensureDraft` → `reconcileCandidateId` → `$fetch` can throw; page has no catch → unhandled rejection, no recovery UI (`empty-error-states`).  
   **Fix suggestion:** try/catch → set a step-0 error ref; keep `currentStep === 0`.

3. **Invite unavailable ~431–438**  
   **Cause:** Copy says “try again” with no control.  
   **Fix suggestion:** Retry button calling `bootstrapInvite(token.value)` with loading flag.

4. **Bootstrap loading ~233–244**  
   **Cause:** `loading = false` only after successful `await bootstrapInvite`. `goToStep` (router) can throw → perpetual “Loading…”.  
   **Fix suggestion:**
   ```ts
   loading.value = true
   try {
     await bootstrapInvite(token.value)
   } finally {
     loading.value = false
   }
   ```

### Low

See Suggested (overlay a11y, success icon, specialty gate deferral).

### Solid on this file

| Area | Notes |
| --- | --- |
| Loading | Visible `Loading…` during bootstrap |
| Invite invalid | Distinct expired / completed / unavailable / generic |
| Save status | Wizard steps + `@retry` → autosave |
| Submit / redownload | Error + **Retry** |
| Preview save | Error into `IntakeReviewPanel` |
| Step empty hints | Employers / EMR / licenses |
| Replace resume | Text control, not icon-only (`aria-hidden` on glyph) |
| Identity inputs | No trim-on-input |
| Deep-link guard | `hasPassedStep0` forces step 0 |
| Prefill names/email | Only fill when field empty |

### Deferred (later queue / child SFCs)

Wiring only: `HospitalAutocomplete`, `EmployerCard`, `FileDropZone` parse UX, `IntakeReviewPanel` gap UI — not audited as this file’s primary scope.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next queue file | **`components/intake/HospitalAutocomplete.vue`** |
| Mark Slice 4 Done? | **No** — continue one file per run |

## PHI

Scrubbed: no resume text, real emails, phones, tokens, or license numbers.
