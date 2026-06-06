# Resume Rocket Platform

Mobile-first healthcare resume enrichment MVP: invite-gated intake, Gemini parsing, hospital matching, and VMS-ready DOCX export.

## Stack

- **Nuxt 3** + Vue 3 + Tailwind CSS
- **Supabase** (Postgres, Auth, Storage)
- **Gemini** (structured resume parse; optional — heuristic fallback works without a key)
- **Docxtemplater** (contract template fill)
- **Resend** (submission confirmation email)

## Quick start

```bash
cd ~/resume-rocket
npm install
cp .env.example .env
# Fill in Supabase, Gemini, and Resend keys
npm run dev
```

Apply database migrations in the Supabase SQL editor (or CLI):

```bash
supabase db push
```

Files under `supabase/migrations/` in order.

## Flow

1. **Recruiter** signs in at `/admin`, creates an intake link, sends it to the candidate.
2. **Candidate** opens `/intake/{token}`, uploads PDF/DOCX, completes the wizard.
3. On submit: DOCX downloads + confirmation email with re-download link.

## Environment

See [`.env.example`](.env.example). Never commit `.env`.

## Deploy

Staging/production on Render: [`docs/DEPLOY.md`](docs/DEPLOY.md) and [`render.yaml`](render.yaml). Copy env var **values** from your local `.env` into the Render dashboard.

## Plan / scope

See [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md) for full architecture and test plan. For VMS template expansion (Phase B/C), see [`docs/VMS-FULL-COVERAGE-PLAN.md`](docs/VMS-FULL-COVERAGE-PLAN.md). Backlog: [`docs/TODO.md`](docs/TODO.md). Pre-release smoke: [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md).

## Admin setup

Create a recruiter user in Supabase Auth (email/password). RLS allows `authenticated` users to read `candidates` and `hospitals`.

## Development workflow

Use short-lived branches and PRs instead of committing directly to `main`:

```bash
git checkout -b feat/your-change
# make changes, then:
git add .
git commit -m "Describe why, not just what"
git push -u origin HEAD
gh pr create --title "..." --body "..."
gh pr merge --squash --delete-branch
git checkout main && git pull
```

Never commit `.env`.

## Template

Contract template: [`server/assets/template.docx`](server/assets/template.docx) (tracked in git — same file locally and on Render). Tag names must match `mapCandidateToTemplateData()` in `server/utils/docxBuilder.ts` — see [`docs/VMS-TEMPLATE-REGISTRY.md`](docs/VMS-TEMPLATE-REGISTRY.md).

After editing the Word template, run `node scripts/inventory-template-tags.mjs` and reconcile with [`docs/VMS-FIELD-MANIFEST.md`](docs/VMS-FIELD-MANIFEST.md).  
Inventory contract tags: `node scripts/inventory-template-tags.mjs`  
Normalize JSONB smoke test: `node scripts/test-normalize-candidate.mjs`  
Gemini parse map smoke test: `node scripts/test-gemini-parse-map.mjs`  
Smoke-test mapping: `node scripts/test-docx-mapping.mjs`  
Run all automated tests: `npm run test` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml))
