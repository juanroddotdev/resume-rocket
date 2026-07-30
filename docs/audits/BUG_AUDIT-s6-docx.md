# BUG_AUDIT — Slice 6 · DOCX builder + generate

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 6 — DOCX + template |
| **Date** | 2026-07-30 |
| **Base** | `main` @ `b48ecf1` · branch `docs/bug-audit-s6-docx` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Locked** | `server/assets/template.docx` (not edited) |

## Summary

`professionalSnapshotToLines` correctly **skips empty / not-included** snapshot rows (no empty bullets). Template↔builder inventory reports **all template tags mapped**. `test-docx-mapping.mjs` passes on this tip. Gaps: **`candidate_state` prefers license state over home state** (wrong city/state block risk); **`generate-docx` does not catch Docxtemplater/`buildResumeDocx` failures** (opaque 500s); many builder keys are **not in the current template** (dead mappings / data only via snapshot). Client download/preview helpers surface `statusMessage` reasonably.

---

## Action inbox (do this later)

### Must fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S6-H1 | High | Main | Fix `candidate_state` (and related) to use **home** state/city, not license state. Today: `licenseState?.toUpperCase() \|\| homeState` | `docxBuilder.ts` `mapCandidateToTemplateData` ~257–266 |

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S6-M1 | Medium | Main | Wrap `buildResumeDocx` / `doc.render` in `generate-docx.post.ts` with try/catch → 500 + friendly `statusMessage` (no stack to client; no PHI in logs) | `generate-docx.post.ts` ~37–70 |
| S6-M2 | Medium | Main | Confirm intentional: 23+ builder scalars/loops **not** in template (years, compact, EMR summary, per-employer detail fields, etc.). Either restore tags, or document “snapshot-only / metrics_line-only” and trim dead keys | inventory output vs `docxBuilder.ts` |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S6-L1 | Low | Main | Guard zero-byte / non-docx blob before `triggerBlobDownload` | `downloadResumeDocxClient.ts` |
| S6-L2 | Low | Main | Access-token DOCX path is capability URL (entropy OK); rate-limit / audit if abused | `generate-docx.post.ts` ~23–31 |
| S6-L3 | Low | Main | `nullGetter` explicit on Docxtemplater as belt-and-suspenders with sanitize | `buildResumeDocx` ~302–307 |

### Tests (Agent 1)

- [ ] Unit: `mapCandidateToTemplateData` — home TX + license CA → `candidate_state` is TX (after S6-H1)
- [ ] Unit: included snapshot with empty value → not in `snapshot_lines`
- [ ] Unit: included + value → labeled line present
- [ ] Fixture: `node scripts/test-docx-mapping.mjs` in CI (`test:release`)
- [ ] `node scripts/inventory-template-tags.mjs` — zero unmapped template tags
- [ ] Optional: force bad template tag → generate-docx returns friendly 500 after S6-M1

Write `docs/audits/QA_REPORT-s6-docx.md` when done.

### Human smoke

- [ ] Intake complete → Download DOCX; open in Word — no empty snapshot bullets  
- [ ] Candidate home state ≠ license state → header location correct (after S6-H1)  
- [ ] Admin Download draft / preview  
- [ ] Email complete-page download via `access_token`  

### Docs / tour

- [ ] Agent 5: Slice 6 progress; RELEASE rows for mapping/inventory scripts  
- [ ] Do not edit `template.docx` without inventory + mapping rerun  

---

## Findings detail

### High

**S6-H1 — `candidate_state` sourced from license**

```ts
candidate_state: licenseState?.toUpperCase() || homeState,
```

**Cause:** License state overwrites home state for the address-style template field.  
**Fix:** Use `homeState` (and keep license in license loops only).

### Medium

1. **S6-M1** — Uncaught templater errors on generate.  
2. **S6-M2** — Large set of mapped fields unused by current Word template (verify product intent).

### Low

Blob sanity; access_token; explicit nullGetter.

### Solid

| Area | Notes |
| --- | --- |
| Empty snapshot bullets | `professionalSnapshotToLines` skips empties |
| Metrics orphans | `experience_metrics_rows` 0–1 loop |
| Sanitize | `sanitizeDocxTemplateData` avoids literal `undefined` |
| Inventory | All template tags have builder keys (ran OK) |
| Mapping smoke | `test-docx-mapping.mjs` OK |
| Clients | Preview/download parse JSON errors |

---

## Slice readiness

| Question | Answer |
| --- | --- |
| Slice 6 Agent 2 done? | **Yes** (this report) |
| Ready for Agent 1? | **Yes** — especially S6-H1 regression + snapshot line tests |
| Mark Slice 6 Done? | **No** until mapping/inventory stay green in CI + human Word smoke |
| Ship | **no** until user asks for PR |

## PHI

Scrubbed.
