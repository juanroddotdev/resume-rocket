# Kickoff — Slice 6 · Agent 2 (Bug Hunter)

Paste into a **new Agent chat**.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 6).

```text
Slice: 6
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 6 — DOCX builder audit
Allowed paths: server/utils/docxBuilder.ts ; server/api/generate-docx.post.ts ; utils/downloadResumeDocxClient.ts ; utils/fetchPreviewDocx.ts ; scripts/inventory-template-tags.mjs ; scripts/test-docx-mapping.mjs ; scripts/smoke-docx-template.mjs ; docs/audits/
Locked paths: server/assets/template.docx
Ship: no
Write report file: yes
```

**Git:** Branch `docs/bug-audit-s6-docx` from latest **`main`**. Do **not** edit `template.docx`. No merge unless ship.

**Do:** Empty included snapshot lines, missing tags, error handling on generate-docx, filename helpers. Write `docs/audits/BUG_AUDIT-s6-docx.md` with Action inbox. Suggest Agent 1 XML/mapping assertions.
