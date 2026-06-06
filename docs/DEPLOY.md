# Deploy to Render

Host the Nuxt app on [Render](https://render.com). **Supabase stays in the cloud** — use your existing project; do not create a new one for staging unless you want isolation.

Related: [`.env.example`](../.env.example) · [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) · [`HOSPITAL-DATA.md`](HOSPITAL-DATA.md)

---

## Architecture

```
Testers → Render (Nuxt + Nitro) → Supabase (DB, Auth, Storage)
                ↓
         Gemini + Resend (env vars)
```

The contract template ships in the repo at `server/assets/template.docx` (same file locally and in production).

---

## Why Render (not serverless)

- `/api/parse` accepts uploads up to **10MB**
- Gemini vision can take **10–30+ seconds**
- DOCX generation is CPU/memory work

A Node web service avoids serverless body-size and timeout limits.

---

## One-time: Supabase (existing project)

You likely already have this if local dev works against remote Supabase.

1. **Migrations** — from your machine:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF   # if not linked
   supabase db push
   ```

2. **Admin user** — Supabase Dashboard → Authentication → Users → create recruiter (email/password).

3. **Hospital seed** — if facility search is empty:

   ```bash
   python3 scripts/seed_hospitals.py --fetch --dry-run
   python3 scripts/seed_hospitals.py --fetch
   ```

   Uses whatever Supabase URL is in your local `.env`. See [`HOSPITAL-DATA.md`](HOSPITAL-DATA.md).

4. **Auth URLs** — do this **after** first deploy when you know the Render URL:

   - Dashboard → Authentication → URL Configuration
   - **Site URL:** `https://YOUR-SERVICE.onrender.com`
   - **Redirect URLs:** `https://YOUR-SERVICE.onrender.com/**`

---

## Create the Render service

### Option A — Blueprint (`render.yaml`)

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → connect repo.
3. Render reads [`render.yaml`](../render.yaml) and creates the web service.
4. In the service **Environment** tab, set secret values (Render prompts for vars marked `sync: false`).

### Option B — Manual web service

| Setting | Value |
|---------|--------|
| **Runtime** | Node |
| **Node version** | 22 |
| **Build command** | `npm ci && npm run build` |
| **Start command** | `node .output/server/index.mjs` |
| **Health check path** | `/` |

---

## Environment variables

Copy values from your local **`.env`** into Render (not from `.env.example` placeholders).

| Variable | Notes |
|----------|--------|
| `NUXT_PUBLIC_SUPABASE_URL` | Same as local |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret — never expose as `NUXT_PUBLIC_*` |
| `GEMINI_API_KEY` | Recommended for image/Canva PDFs |
| `RESEND_API_KEY` | Optional |
| `RESEND_FROM_EMAIL` | Use a verified domain for real recipients |
| `NODE_ENV` | `production` (secure intake cookies) |
| `NUXT_PUBLIC_SITE_URL` | **`https://YOUR-SERVICE.onrender.com`** — no trailing slash |

`NUXT_PUBLIC_SITE_URL` drives invite links (`/api/invites`) and confirmation email download URLs. If it stays `http://localhost:3000`, external testers get broken links.

Optional rate limits (defaults in `nuxt.config.ts`):

- `PARSE_RATE_LIMIT_MAX` (default `8`)
- `PARSE_RATE_LIMIT_WINDOW_MS` (default `900000`)

---

## Deploy order

1. Create Render service; set env vars **except** leave `NUXT_PUBLIC_SITE_URL` blank or temporary on first deploy if needed.
2. Wait for first successful deploy; note the public URL.
3. Set `NUXT_PUBLIC_SITE_URL` to that URL → **Manual Deploy** or push a commit.
4. Update Supabase Auth Site URL + Redirect URLs (above).
5. Run [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) against the live URL.

---

## Post-deploy smoke test (minimum)

- [ ] `/admin` — recruiter sign-in works
- [ ] Create invite — copied URL uses Render host, not `localhost`
- [ ] `/intake/{token}` on phone — upload → wizard → DOCX download
- [ ] Facility search returns hospitals (seed data present)
- [ ] Invalid token shows error + recruiter guidance

---

## Resend notes

- `onboarding@resend.dev` only sends to your Resend account email.
- For real candidates, verify a domain in Resend and set `RESEND_FROM_EMAIL`.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Invite links point to localhost | `NUXT_PUBLIC_SITE_URL` on Render |
| Admin login fails after redirect | Supabase Auth redirect URLs include Render URL |
| DOCX download fails | Build logs — `server/assets/template.docx` must exist in deploy (tracked in git) |
| Parse timeout | Render plan limits; large vision PDFs may need a paid tier with longer timeouts |
| Empty facility search | Run hospital seed against the same Supabase project |

---

## Local dev vs production

| | Local | Render |
|---|--------|--------|
| App | `npm run dev` | `node .output/server/index.mjs` |
| Supabase | Same remote project (typical) | Same |
| Template | `server/assets/template.docx` in repo | Same file from git |
| Site URL | `http://localhost:3000` in `.env` | Render URL in env |

Keep `.env` local only — never commit it.
