# Kickoff — Slice 6 · Agent 2 (Bug Hunter)

Paste into a **new Agent chat**.

---

Follow @.cursor/agents/bug-hunter-audit.md and @docs/APP-COVERAGE-TOUR.md (Slice 6).

```text
Slice: 6
Lane: Backfill
Agent: 2 Bug Hunter
Ticket: Coverage tour slice 6 — DOCX builder audit
Allowed paths: server/utils/docxBuilder.ts ; server/api/generate-docx.post.ts ; utils/downloadResumeDocxClient.ts ; utils/fetchPreviewDocx.ts ; scripts/inventory-template-tags.mjs ; scripts/test-docx-mapping.mjs ; scripts/smoke-docx-template.mjs
Locked paths: server/assets/template.docx
Ship: no
Write report file: no
```

**Git:** Chat-only. Do **not** edit `template.docx`. Branch only if writing an audit doc from **`main`**. No merge unless ship.

**Do:** Empty included snapshot lines, missing tags, error handling on generate-docx, filename helpers. Suggest Agent 1 XML/mapping assertions.
