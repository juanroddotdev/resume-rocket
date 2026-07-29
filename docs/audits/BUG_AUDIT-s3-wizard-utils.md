# BUG_AUDIT — Slice 3 · Wizard data utils (light pass)

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 3 — Wizard data utils |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Scope** | Allowed: `vmsGapReview`, `professionalSnapshot`, `adminCandidateForm`, `employerLink`, `schemas`, `normalizeCandidate` |

## Summary

No trim-on-every-keystroke bugs in these utils — `professionalSnapshot` explicitly **avoids** mid-keystroke trim (`ensureProfessionalSnapshotLines` / `formatExperienceFlagValue`). Normalize + Zod ingress are defensive on null/odd shapes. Main risk: **`computeMissingTemplateFields` under-enforces vs `VMS-FIELD-MANIFEST.md` Required rows**, so submit can pass with missing home city, facility location, role, employer name, or any certification.

---

## Action inbox (do this later)

### Must fix

_None that crash or corrupt PATCH payloads in these modules._ Align gap review before calling Slice 3 “hardened” against the manifest (see Should fix).

### Should fix (Side / Main — recommend one PR focused on gap review)

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S3-M1** | Medium | Main | Gap review vs manifest **Required Yes**: add (or document defer for) `home_city`; employer `name`, city/state (`experience_facility_location`), `role`/`unit`; at least one **active certification** if still Required | `utils/vmsGapReview.ts` ↔ `docs/VMS-FIELD-MANIFEST.md` |
| **S3-M2** | Medium | Main | Education year: use `normalizeGraduationYear` / `isCompleteEducationGraduation` (not bare `hasText`) so `"abcd"` does not clear gap | `vmsGapReview.ts` ~112–114 |
| **S3-M3** | Medium | Main | Employer with blank `name` still only fails per-field EMR/dates — treat empty name as missing facility | `employerMissing` / employers loop |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S3-L1 | Low | Main | Link advisory label uses empty `employer.name` → `": link facility…"` — fall back to `Employer N` | `computeEmployerLinkAdvisories` ~129 |
| S3-L2 | Low | Main | `licenses: z.array(z.record(z.unknown()))` is very loose (OK if `normalizeLicenses` always runs — add a comment or tighter ingress later) | `schemas.ts` ~86–89 |
| S3-L3 | Low | Main | `snapshot_magnet_facility_experience` always derived empty (`line('')`) — confirm still intentional until Gemini propose | `professionalSnapshot.ts` ~150 |
| S3-L4 | Low | Main | `candidateFormSnapshot` does not trim scalars (relies on server normalize) — fine; optional client trim-on-save only | `adminCandidateForm.ts` |

### Tests — Agent 1 priority order (this slice)

Agent 1 is already on `vmsGapReview` (`test/tour-s3-vmsGapReview`). Prioritize:

1. **`vmsGapReview`** — cases for S3-M1–M3 once product confirms which Required rows block submit; keep whitespace / EMR / license / education month cases green  
2. **`normalizeCandidate` / `normalizeEducation` / `normalizeEmployer`** — null, snake_case, long strings, empty name → drop employer  
3. **`professionalSnapshot`** — already tested; add edges for `parseExperienceFlagValue` trailing spaces + `normalizeProfessionalSnapshot` trim-on-persist  
4. **`employerLink`** — duplicate by `hospitalId` vs name\|city; `employersForPatch` strips suggestions  
5. **`adminCandidateForm`** — `applyParseResultToForm` truthy-only merge; snapshot rebuild after parse  
6. Defer remaining Slice 3 queue modules (`emrSystem`, `licenseRows`, …) to later Agent 1 runs per tour card  

### Human smoke (you)

- [ ] Gap review blocks submit when required identity/employment/education empty  
- [ ] After S3-M1: confirm home city / certs / facility location behavior matches product intent  
- [ ] Admin snapshot: Space in Yes-detail does not get eaten while typing  
- [ ] PATCH employers with snake_case legacy keys still round-trips  

### Docs / tour (Agent 5)

- [ ] If manifest Required ≠ gap, either update gap or mark manifest/defer in Agent 5 backlog — do not mark Slice 3 Done with silent mismatch  
- [ ] Update progress when each util has tests **or** explicit defer  

---

## Findings detail

### High

None in Allowed paths for runtime crash / unsafe `any` / trim-while-typing.

### Medium

1. **`utils/vmsGapReview.ts` vs `docs/VMS-FIELD-MANIFEST.md`**  
   **Cause:** Manifest marks Required Yes for `candidate_city` (`home_city`), certifications list, `experience_hospital_name`, `experience_facility_location`, `experience_unit_specialty`. Gap currently checks identity (no city), specialties, employers length + dates/scope/EMR, licenses, education degree/school/month/year text. Submit can succeed with blank home city, no certs, nameless employer, no city/state, no role.  
   **Fix:** Product decide Required-at-submit set; implement in `computeMissingTemplateFields` or annotate manifest “gap-deferred”.

2. **`vmsGapReview.ts` ~112–114** — `hasText(graduationYear)` accepts invalid years; `normalizeGraduationYear` would reject.  
   **Fix:** `if (!normalizeGraduationYear(entry.graduationYear))` (or `isCompleteEducationGraduation`).

3. **`vmsGapReview.ts` employer loop** — no `hasText(employer.name)` (or role / city|state).  
   **Fix:** Add missing ids aligned with manifest.

### Low

See Suggested table (S3-L1–L4).

### Solid (no action)

| Module | Notes |
| --- | --- |
| `professionalSnapshot.ts` | Explicit no mid-keystroke trim; DOCX `included` gating; normalize on persist |
| `employerLink.ts` | Strips client suggestions before PATCH; duplicate helpers null-safe |
| `normalizeCandidate.ts` | Null/odd shapes → `[]`/`{}`/drop; snake↔camel |
| `schemas.ts` | PATCH transforms through normalize; empty email allowed |
| `adminCandidateForm.ts` | Defaults + draft apply; parse merge is additive (intentional) |

### Trim / `any` scan

- No `as any` in Allowed files.  
- Trim used for **validation** (`hasText`) or **persist normalize** — not for live controlled-input formatters in these modules.  
- Snapshot editors correctly preserve trailing detail spaces until normalize.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| Ready for Agent 1? | **Yes** — continue `vmsGapReview` then normalize / employerLink / snapshot edges |
| Ready to mark Slice 3 Done? | **No** — remaining util queue + gap↔manifest decision |
| Next Agent 2? | Slice 4 file queue (`s4-agent2.md`) when you start UI pass |

## PHI

Report scrubbed: no resume text, emails, phones, license numbers, or invite tokens.
