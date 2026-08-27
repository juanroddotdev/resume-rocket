# Documentation index

Start here to find the right doc. **Active backlog:** [TODO.md](./TODO.md).

---

## Day-to-day

| Doc | Use when |
| --- | --- |
| [TODO.md](./TODO.md) | Open engineering work, test automation plan, issue #10–#15 status |
| [AGENT-LANES.md](./AGENT-LANES.md) | Parallel side agents (1 QA / 2 Bug Hunter / 5 Docs); branching + deferred 3–4 |
| [APP-COVERAGE-TOUR.md](./APP-COVERAGE-TOUR.md) | Start→end slices 0–7 for whole-app backfill with Agents 1/2/5 |
| [Agent kickoffs](../.cursor/agents/kickoffs/README.md) | Paste-ready prompts per slice×agent (own branches off main) |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | Pre-deploy / pre-tag smoke (automated + manual) |
| [MANUAL-TEST-CHECKLIST.md](./MANUAL-TEST-CHECKLIST.md) | Deeper UX QA after CI is green |
| [DEPLOY.md](./DEPLOY.md) | Render deploy, env vars, Supabase migrations |

---

## VMS / contract template

| Doc | Use when |
| --- | --- |
| [VMS-FIELD-MANIFEST.md](./VMS-FIELD-MANIFEST.md) | **Authoritative** tag → DB → parse → wizard → required |
| [VMS-TEMPLATE-REGISTRY.md](./VMS-TEMPLATE-REGISTRY.md) | Human-readable mapping summary |
| [VMS-FULL-COVERAGE-PLAN.md](./VMS-FULL-COVERAGE-PLAN.md) | **Status only** — expansion complete; hardening remainder |

After editing `server/assets/template.docx`: `node scripts/inventory-template-tags.mjs`

---

## Product flows

| Doc | Use when |
| --- | --- |
| [INTAKE-DRAFT-RESUME-FLOW.md](./INTAKE-DRAFT-RESUME-FLOW.md) | Draft restore, autosave, invite expiry |
| [INTAKE-DOWNLOAD-EMAIL-FLOW.md](./INTAKE-DOWNLOAD-EMAIL-FLOW.md) | Submit, DOCX download, Resend confirmation |
| [ADMIN-SETTINGS-PLAN.md](./ADMIN-SETTINGS-PLAN.md) | Planned self-serve admin settings for integrations, packet defaults, branding, diagnostics |
| [HOSPITAL-DATA.md](./HOSPITAL-DATA.md) | CMS/ArcGIS seed, local vs prod Supabase |
| [HOSPITAL-NAME-COMBOBOX-PLAN.md](./HOSPITAL-NAME-COMBOBOX-PLAN.md) | Planned: name field = DB autocomplete; drop duplicate link search |

---

## Reference

| Doc | Use when |
| --- | --- |
| [MVP-PLAN.md](./MVP-PLAN.md) | Historical MVP architecture spec (shipped) |
| [PROJECT-REVIEW.md](./PROJECT-REVIEW.md) | Architecture notes, risks, current priorities |
| [DOC-VERIFICATION-ENGINE-DECISION.md](./DOC-VERIFICATION-ENGINE-DECISION.md) | Stub → canonical docs in [document-verification-engine](https://github.com/juanroddotdev/document-verification-engine) |

---

## Archive

Completed implementation plans — history and PR context, not day-to-day navigation.

| Doc | Shipped |
| --- | --- |
| [archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md](./archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md) | VMS Steps 0–5 build plan |
| [archive/HOSPITAL-PARSE-UX-PLAN.md](./archive/HOSPITAL-PARSE-UX-PLAN.md) | Hospital match + linking (PRs #37–#38) |
| [archive/EMPLOYER-CARD-DECK-PLAN.md](./archive/EMPLOYER-CARD-DECK-PLAN.md) | Step 2 accordion deck (#47) |
| [archive/RELEASE-CHECKLIST-2026-06-07-09.md](./archive/RELEASE-CHECKLIST-2026-06-07-09.md) | June 7–9 batch (22 PRs) |
