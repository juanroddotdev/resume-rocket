# BUG_AUDIT — Slice 4 · `IntakeReviewPanel.vue`

| | |
| --- | --- |
| **Agent** | 2 Bug Hunter |
| **Slice** | 4 — Intake UI |
| **File** | `components/intake/IntakeReviewPanel.vue` (queue item 12) |
| **Date** | 2026-07-29 |
| **Base** | `main` @ `1281cb4` · branch `docs/bug-audit-s4-intake` |
| **Ship** | no — report only |
| **Production edits** | none |
| **Next file** | `components/intake/DocxPreviewViewer.vue` (then `DocxPreviewSlideOver.vue`) |

## Summary

Strong gap-review UX: missing-field links, complete banner, admin incomplete copy, preview saving status, no-`candidateId` recovery, submit disabled states. **Medium:** `previewSaveError` has no **Retry** (only explains last saved draft) while already on the preview step.

---

## Action inbox (do this later)

### Must fix

_None that leave a blank review step._

### Should fix

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| **S4-IR-M1** | Medium | Main | On `previewSaveError`, add **Retry** → `emit('preview')` | template ~137–143 |

### Suggested

| ID | Priority | Owner | What | Where |
| --- | --- | --- | --- | --- |
| S4-IR-L1 | Low | Main | Focus preview heading / `#docx-preview-viewer` when entering preview | after `onPreviewClick` |
| S4-IR-L2 | Low | Main | When `presentPreview === false`, parent owns slide-over | props ~15–16 |

### Tests / human smoke

- [ ] Missing → links; Preview gated (client)  
- [ ] Admin allowIncomplete → Preview on  
- [ ] Save fail → amber; Retry after S4-IR-M1  
- [ ] No candidateId → Make changes  

### Docs / tour

- [ ] Next: **DocxPreviewViewer.vue**  

---

## Findings detail

### Medium

1. **`previewSaveError` without Retry** — empty-error-states gap.

### Low

Focus management; external preview note.

### Solid

Missing/complete/advisories; loading; gates; admin vs client copy.

---

## Slice readiness

| Question | Answer |
| --- | --- |
| This file audited? | **Yes** |
| Next | **`DocxPreviewViewer.vue`** |
| Slice 4 Done? | **No** |

## PHI

Scrubbed.
