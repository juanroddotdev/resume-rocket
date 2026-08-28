# AGENTS.md

Resume Rocket is a Nuxt 3 + Vue 3 + Supabase app (invite-gated resume intake → parse →
wizard → VMS-ready DOCX export). Standard commands live in [`README.md`](README.md) and
`package.json` scripts (`npm run dev`, `npm run build`, `npm run test`). CI is
[`.github/workflows/ci.yml`](.github/workflows/ci.yml): Node 22 → `npm ci` → `npm run test` → `npm run build`.

Project rules and conventions live in `.cursor/rules/` — follow them (git/PR workflow,
Supabase RLS/migrations, env-var naming, PHI handling, graceful degradation, etc.).

## Cursor Cloud specific instructions

This VM runs the app fully locally against a **local Supabase stack** (Docker), so **no
external secrets are required** to develop or test. Docker, the Supabase CLI, and Node 22
are already present in the environment snapshot; the startup update script only runs `npm ci`.

### Services
- **Nuxt dev server** — `npm run dev` → http://localhost:3000 (SSR + Nitro API routes).
- **Local Supabase** — Postgres/Auth/Storage/Studio via Docker containers. API
  http://127.0.0.1:54321, Studio http://127.0.0.1:54323, Postgres on 54322.

### Bringing services up on a fresh VM (they do not auto-start)
From `/workspace`:
1. Start the Docker daemon (if `docker info` fails) and relax the socket for non-root use.
   Prefer a tmux session so it keeps running:
   - `sudo dockerd > /tmp/dockerd.log 2>&1 &`
   - `sudo chmod 666 /var/run/docker.sock`
2. `supabase start` — boots the stack, applies `supabase/migrations/*`, and runs
   `supabase/seed.sql`. It prints the local **API URL**, **anon key**, and **service_role key**.
3. Ensure `.env` (gitignored) points at local Supabase. The anon/service_role JWTs printed by
   `supabase start` are the stable local demo keys:
   - `NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service_role key>`
   - `NUXT_PUBLIC_SITE_URL=http://localhost:3000`
4. Create the recruiter/admin auth user (idempotent — ignore "already registered"):
   ```bash
   SRK=<service_role key from `supabase start`>
   curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
     -H "apikey: $SRK" -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
     -d '{"email":"recruiter@example.com","password":"Password123!","email_confirm":true}'
   ```
   Sign in at `/admin` with `recruiter@example.com` / `Password123!`.
5. `npm run dev`, then open http://localhost:3000.

### Non-obvious caveats
- **Tests need Node type-stripping.** `npm run test` runs `node --test` over files that import
  `.ts` modules. CI's Node (≥22.18) strips TS types by default, but this VM's default `node`
  (`/exec-daemon/node`, 22.14) needs a flag. `NODE_OPTIONS=--experimental-strip-types` is set in
  `~/.bashrc`, so fresh shells get it automatically. If you ever see
  `ERR_UNKNOWN_FILE_EXTENSION ".ts"`, run `NODE_OPTIONS=--experimental-strip-types npm run test`.
  (`/exec-daemon` is always first on `PATH`, so an nvm-installed newer node cannot shadow it.)
- **Harmless warning line.** That same flag makes `npm run dev` / `npm run build` print
  `ExperimentalWarning: Type Stripping`; Nuxt labels it `ERROR` but it is not an error.
- **Local Supabase table grants.** On this CLI version, public tables created by the `postgres`
  migration role do **not** receive DML grants for `anon`/`authenticated`/`service_role`, so
  PostgREST returns `permission denied` and the app cannot read/write. `supabase/seed.sql`
  restores the standard grants (RLS still governs access, matching hosted Supabase). If the DB
  is ever recreated without seed.sql running, re-apply it:
  `docker exec -i supabase_db_resume-rocket psql -U postgres -d postgres -f - < supabase/seed.sql`.
- **No dedicated linter.** There is no ESLint/lint script; type/compile checking happens through
  `npm run build` (and the `nuxt prepare` postinstall). Use `npm run test` + `npm run build` as
  the checks (this mirrors CI).
- **Optional integrations are unset by default.** No `GEMINI_API_KEY` → resume parsing uses
  heuristics only (image/Canva PDFs then need Gemini or manual entry); no `RESEND_API_KEY` →
  confirmation emails are skipped. This is intentional graceful degradation. To mirror the real
  app, add these (and/or hosted Supabase keys) via the Secrets panel.
- **Invite links are single-completion.** An intake link becomes invalid once its candidate is
  `submitted`/`confirmed` (or if revoked/expired). Create a fresh invite per test run (admin hub
  → New candidate packet → Send candidate link, or `POST /api/invites` with a recruiter Bearer JWT).
- **Docker-in-Docker** uses the `fuse-overlayfs` storage driver + iptables-legacy
  (see `/etc/docker/daemon.json`), required because the VM kernel lacks full overlay2/nftables support.
