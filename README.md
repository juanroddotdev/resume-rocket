# Resume Rocket Platform

Mobile-first healthcare resume enrichment MVP: invite-gated intake, Gemini parsing, hospital matching, and VMS-ready DOCX export.

## Stack

- **Nuxt 3** + Vue 3 + Tailwind CSS
- **Supabase** (Postgres, Auth, Storage)
- **Gemini 1.5 Flash** (structured resume parse)
- **Docxtemplater** (contract template fill)
- **Resend** (submission confirmation email)

## Quick start

```bash
cd ~/resume-rocket
npm install
node scripts/generate-template.mjs
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

## Plan / scope

See [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md) for full architecture and test plan.

## Admin setup

Create a recruiter user in Supabase Auth (email/password). RLS allows `authenticated` users to read `candidates` and `hospitals`.

## Template

Replace `server/assets/template.docx` with your contract template. Tags: `{first_name}`, `{last_name}`, `{email}`, `{phone}`, `{emr_system}`, `{license_number}`, `{#employers}...{/employers}`, `{#certifications}{.}{/certifications}`.

Regenerate placeholder: `node scripts/generate-template.mjs`
# resume-rocket
