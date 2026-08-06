# Resume Rocket — Client handover guide

**Audience:** Recruiting / operations (non-technical)  
**Purpose:** How we move billing and ownership of the three cloud accounts that run the app, while Juan keeps access to support you.  
**Status:** Local handoff doc (not published in the public repo)

---

## What this app uses (in plain English)

| Service | What it is | What it does for Resume Rocket |
|--------|------------|--------------------------------|
| **Supabase** | The “database + login + file cabinet” | Stores candidate profiles, invite links, hospital list; recruiter sign-in; uploaded resumes |
| **Render** | The “web host” | Runs the live website candidates and recruiters open in the browser |
| **Google Gemini** | The “AI reader” | Reads resumes (including image/Canva PDFs) and fills in the intake form |

**Not in this handover**

- **GitHub** (code) — stays with Juan for now  
- **Resend** (email) — not wired up yet; ignore for now  
- **GoDaddy** — your domain registrar; needed later for a custom website address (see Part 4)

---

## Best way to hand over (recommended)

### Short answer

**Yes — you can transfer billing/ownership and Juan can still keep access.**

Do **not** rebuild everything on brand-new empty accounts unless we have to. Rebuilding means new keys, downtime, and copying all candidate data by hand.

### Recommended method: “Their wallet, shared keys”

1. Client creates (or owns) the **billing** account for each service.  
2. Client invites Juan as a **teammate with admin access**.  
3. We **move** the existing project/service under the client’s org (or attach the client’s credit card).  
4. Juan stays on the team so he can fix issues, deploy updates, and help with the custom domain.

| Service | What “ownership” looks like | How Juan keeps access |
|--------|-----------------------------|------------------------|
| **Supabase** | Project lives in **your** organization; **your** card is charged | Invite Juan as **Owner** or **Administrator** on that org |
| **Render** | Workspace billing uses **your** card | Invite Juan as **Admin** (needs a plan that allows team members — usually Pro+, not free Hobby) |
| **Gemini** | Google Cloud / AI Studio project billed to **your** Google account | Add Juan as **Owner** or **Editor** on that Google Cloud project |

### Why not “create everything new from scratch”?

| Approach | Pros | Cons |
|----------|------|------|
| **Share + move billing (recommended)** | Same website URL / same database; little or no downtime; resumes and candidates stay put | You must invite Juan; Render may need a paid plan for team seats |
| **Brand-new accounts + rebuild** | Clean break | New Supabase keys; data migration; Render re-deploy; Auth login URLs reconfigured; higher risk of mistakes |

**Decision for this handover:** use **share + move billing**.

---

## Part 1 — Supabase (database, login, resume files)

### What you need to do

1. Go to [supabase.com](https://supabase.com) and sign up with a **company email** (or use an existing company account).  
2. Create an **Organization** for your company (name it something clear, e.g. your staffing firm name).  
3. Add a **payment method** if Supabase asks (Free plan may work at first; Pro is safer for production).  
4. Invite Juan:
   - Organization → **Team**
   - Invite his email
   - Role: **Owner** (preferred) or **Administrator**
5. Reply to Juan: *“Supabase org is ready; invitation sent.”*

### What Juan will do after that (you don’t need to do this)

- Accept the invite  
- Transfer the existing Resume Rocket project into **your** organization ([Supabase project transfer](https://supabase.com/docs/guides/platform/project-transfer))  
- Confirm recruiter login still works  
- Confirm resume uploads still work  

### Important notes

- Transfer can briefly pause the project (~1–2 minutes in some plan changes). Prefer a quiet hour.  
- After transfer, **your** org pays for usage going forward.  
- If Juan’s role in your org is only “Read-only,” he will **lose** the ability to help — keep him Owner or Admin.

### Checklist (Supabase)

- [ ] Company Supabase account / org created  
- [ ] Payment method on file (if required)  
- [ ] Juan invited as Owner or Administrator  
- [ ] Juan confirmed transfer complete  
- [ ] You can open the Supabase dashboard and see the project  

---

## Part 2 — Render (the live website)

### What you need to do

1. Go to [render.com](https://render.com) and create an account with a **company email** (or use the account that will pay the bill).  
2. **Billing:** Either  
   - **Option A (preferred if Juan already hosts the app):** Juan invites you into the **existing** workspace as **Admin**, then you add **your** credit card under Billing; **or**  
   - **Option B:** You create the workspace and invite Juan as **Admin**, then Juan reconnects the app (more work — only if Option A isn’t possible).  
3. Confirm with Juan which option you’re using.  
4. Once you’re an Admin, open **Billing** and put the **company card** on file.

### Team access note (important)

Render’s free/Hobby-style workspaces often **cannot add teammates**. Sharing usually requires upgrading the workspace to a **team-capable plan** (commonly **Pro** or higher). Juan will tell you if an upgrade is needed so both of you can see the same service.

### What “success” looks like

- You can log into Render and see the **resume-rocket** web service  
- Billing shows **your** payment method  
- Juan can still open the same service and update settings  

### Checklist (Render)

- [ ] Company Render login exists  
- [ ] You are **Admin** on the workspace that runs the app  
- [ ] Company credit card is on Billing  
- [ ] Juan still has Admin (or Developer) access  
- [ ] Opening the current site URL still loads the app  

Current temporary address (until custom domain): ask Juan for the exact `*.onrender.com` URL (example shape: `https://something.onrender.com`).

---

## Part 3 — Google Gemini (AI resume reading)

### What this is

When a candidate uploads a resume, Gemini helps fill the form. Without a working key, text PDFs may still partly work; image-heavy/Canva PDFs usually need Gemini.

### Recommended path (keep Juan’s help)

**Option A — Share the existing Google project (best if already working)**

1. Juan adds your Google account as **Owner** (or Editor) on the Google Cloud project that owns the Gemini API key.  
2. You attach **your** billing account in Google Cloud (or upgrade the project for paid Gemini usage in [Google AI Studio](https://aistudio.google.com/)).  
3. Juan stays as Owner/Editor so he can rotate keys and debug parse failures.

**Option B — You create a new API key (cleanest billing split)**

1. Sign in to [Google AI Studio](https://aistudio.google.com/) with a **company Google account**.  
2. Create an **API key**.  
3. Turn on **billing** for that project if you need higher limits / paid tier ([Gemini billing docs](https://ai.google.dev/gemini-api/docs/billing)).  
4. Send the new key to Juan **privately** (password manager share, not email in plain text if you can avoid it).  
5. Juan pastes it into Render’s environment settings and redeploys.  
6. Optional: invite Juan’s Google account as Editor/Owner on that project so he can support you later.

### Checklist (Gemini)

- [ ] Company Google account ready  
- [ ] Either: access to existing project **or** new API key created  
- [ ] Billing enabled if you expect regular production volume  
- [ ] Juan confirmed parsing works on a test PDF (text + one image/Canva PDF if you use those)

---

## Part 4 — Custom domain (GoDaddy → Render)

You already have a domain at **GoDaddy**. Render will host the app; GoDaddy only needs a small DNS change so `yourdomain.com` points at Render.

### What you (or Juan with your help) will decide

- Exact public address, e.g. `app.yourcompany.com` or `www.yourcompany.com` or bare `yourcompany.com`  
- Whether both `www` and the root domain should work  

### What Juan needs from GoDaddy (you can send screenshots)

You do **not** need to understand DNS. Juan mainly needs:

1. **Confirmation you can log into GoDaddy** for that domain.  
2. A screenshot of the **DNS management** page (list of records).  
3. The **exact domain name** you’ll use for Resume Rocket.  
4. Permission for Juan to tell you *exactly* which rows to add/edit (or a short screenshare).

### How to find the DNS screen in GoDaddy (click path)

1. Sign in at [godaddy.com](https://www.godaddy.com).  
2. Open **My Products** (or **Portfolio** / **Domain Portfolio** — wording varies).  
3. Find the domain → click **DNS** or **Manage DNS**.  
4. You should see a table of records (types like **A**, **CNAME**, **TXT**, sometimes **AAAA**).  
5. Screenshot that whole table and send it to Juan.

### What Juan will do in Render

1. Open the web service → **Settings** → **Custom Domains**.  
2. Add your domain (and `www` if needed).  
3. Render shows the exact DNS values to use.  
4. He’ll give you 1–3 simple lines to add in GoDaddy (copy/paste).

### Typical GoDaddy changes (Juan will confirm the exact values)

These are the usual pattern for Render + GoDaddy. **Do not change anything until Juan sends the final values for your service.**

| Goal | Record type in GoDaddy | Host / Name | Points to / Value (typical) |
|------|------------------------|-------------|-----------------------------|
| `www.yourdomain.com` | **CNAME** | `www` | Your Render address, e.g. `your-service.onrender.com` |
| Bare `yourdomain.com` | **A** | `@` | Render’s IP (commonly `216.24.57.1` — confirm in Render’s docs/UI at cutover) |
| Cleanup | Delete **AAAA** rows for this domain if present | — | Render uses IPv4; leftover AAAA records can break things |

Also after the domain works, Juan must update:

- Render env: `NUXT_PUBLIC_SITE_URL` → `https://your-final-domain`  
- Supabase Auth → Site URL + Redirect URLs → include the new domain  

Those last two are **developer steps** — not GoDaddy.

### Checklist (custom domain)

- [ ] Decide final URL (www vs app vs root)  
- [ ] GoDaddy login works; DNS page screenshot sent to Juan  
- [ ] Juan adds domain in Render and sends exact DNS rows  
- [ ] Those rows saved in GoDaddy  
- [ ] Wait for DNS (often minutes, sometimes up to 24–48 hours)  
- [ ] Site loads on the custom domain with HTTPS (Render issues the certificate)  
- [ ] Juan updates site URL + Supabase login redirects  
- [ ] Smoke test: admin login, create invite, open intake link on a phone  

---

## Part 5 — What to send Juan (one email / message)

Copy/paste and fill in:

```
Company legal / display name:
Primary contact name + email:
Billing contact (if different):

Supabase: org ready?  Y/N   Juan invited as Owner/Admin?  Y/N
Render: workspace access ready?  Y/N   Company card on file?  Y/N
Gemini: Option A (share project) or Option B (new API key)?

Desired public website address (custom domain):
GoDaddy DNS screenshot attached?  Y/N

Preferred maintenance window for any short pauses:
```

---

## Part 6 — After handover: who does what

| Task | Client | Juan |
|------|--------|------|
| Pay Supabase / Render / Gemini bills | ✅ | |
| Create recruiter users in Supabase Auth (or ask Juan) | ✅ / ask | ✅ if invited |
| Day-to-day recruiting in the app | ✅ | |
| Deploy code updates | | ✅ (while he keeps GitHub + Render access) |
| Rotate API keys if something leaks | ask | ✅ |
| Custom domain DNS | approve + GoDaddy clicks | specify exact records + Render/Supabase config |
| Hospital list refresh / data fixes | ask | ✅ |

---

## Appendix — Developer notes (Juan)

Keep this section for implementation; not required reading for the client.

### Supabase transfer

- Docs: https://supabase.com/docs/guides/platform/project-transfer  
- Requirements: you Owner of **source** org; at least member of **target** org; no blocking GitHub integration / log drains / project-scoped roles.  
- After transfer: verify Auth URL config, Storage `resumes` bucket policies, service role still in Render env (keys usually stay the same when transferring org — still smoke-test).  
- Roles: https://supabase.com/docs/guides/platform/access-control  

### Render sharing

- Team members: https://render.com/docs/team-members  
- Hobby workspaces cannot add members — upgrade if needed.  
- Prefer inviting client as Admin and switching payment method vs rebuilding the service.  
- Custom domains: https://render.com/docs/custom-domains  
- Generic DNS (GoDaddy-like): https://render.com/docs/configure-other-dns  
- After domain: set `NUXT_PUBLIC_SITE_URL`; update Supabase Auth Site URL + Redirect URLs (`https://domain/**`).

### Gemini

- Keys live on a Google Cloud project; billing follows that project.  
- AI Studio: https://aistudio.google.com/  
- Billing: https://ai.google.dev/gemini-api/docs/billing  
- Env on Render: `GEMINI_API_KEY`  
- Models referenced in app: see `server/utils/geminiShared.ts` (`GEMINI_MODELS`).  
- Prefer adding client as GCP Owner + their billing; if new key, update Render secret and redeploy; revoke old key after smoke test.

### Smoke test after any ownership/domain change

1. `/admin` login  
2. Create invite — link uses correct host  
3. Intake upload → wizard → DOCX  
4. Image/Canva PDF parse if Gemini configured  
5. Facility search returns hospitals  

---

## Document control

| | |
|--|--|
| Prepared for | Client operations / recruiting lead |
| Prepared by | Juan (developer) |
| Scope | Supabase, Render, Gemini, GoDaddy DNS handoff inputs |
| Out of scope | GitHub ownership, Resend email, legal/MSA language |
