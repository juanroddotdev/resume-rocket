# Hospital seed data (CMS + ArcGIS hybrid)

Resume Rocket’s `hospitals` table powers facility search and DOCX fields `experience_hospital_total_beds`, `experience_trauma_level`, and `experience_is_teaching_facility`. **Gemini must not invent these values.**

## Where data lives

| Layer | Location | Purpose |
|-------|----------|---------|
| **Runtime (app)** | Supabase `hospitals` | Intake autocomplete, employer linking, DOCX export |
| **ETL (refresh)** | [`scripts/seed_hospitals.py`](../scripts/seed_hospitals.py) | Fetch CMS + ArcGIS metrics, merge, upsert |
| **Inspection (optional)** | `data/master_hospitals.csv` (gitignored) | Human review; not read by the app |

Do **not** commit full national CSVs or point the Nuxt app at static files in the repo for production search.

---

## Sources

| Source | What it provides | API / file |
|--------|------------------|------------|
| **CMS Hospital Compare** | Name, city, state, ZIP, `Facility ID`, hospital type, ownership | Paginated [datastore JSON API](https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0) (`--fetch`) or local `Hospital_General_Information.csv` (~5.4k rows). The `?download=true` CSV is capped at **1500** rows — do not use it alone. |
| **Hospital metrics (ArcGIS)** | Beds, trauma | Default: `Hospitals_Trauma` FeatureServer in the script. Legacy HIFLD Open URL returns `Invalid URL` (discontinued). |

---

## Merge strategy (CMS-first)

1. Filter CMS to **Acute Care Hospitals** and **Critical Access Hospitals** (~4.5k rows).
2. Index ArcGIS rows by **name + city + state**; fallback **name + ZIP**.
3. Upsert one row per CMS facility with `source_id = cms:{Facility ID}`.
4. HIFLD-only facilities (psychiatric, etc.) are **not** imported unless you change filters.

Re-running the seed script is **safe**: upsert on `source_id` updates existing rows.

---

## Schema mapping

| Supabase column | From |
|-----------------|------|
| `source_id` | `cms:{Facility ID}` |
| `name` | CMS `Facility Name` |
| `city` | CMS `City/Town` |
| `state` | CMS `State` |
| `beds` | ArcGIS `BEDS` |
| `trauma_level` | ArcGIS `TRAUMA` (normalized) |
| `hospital_type` | CMS `Hospital Type` |
| `teaching_status` | Heuristic (`UNIVERSITY` in name, etc.) |

Requires migrations (run `supabase db push`):

- [`20260531000000_hospitals_source_id.sql`](../supabase/migrations/20260531000000_hospitals_source_id.sql) — columns
- [`20260531000001_hospitals_source_id_unique.sql`](../supabase/migrations/20260531000001_hospitals_source_id_unique.sql) — `UNIQUE (source_id)` for upsert

---

## Local vs production Supabase

The seed script always writes to whatever project is in **the current `.env`**:

- `NUXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never commit)

### Rules

| Rule | Why |
|------|-----|
| **Always `--dry-run` first** on a new machine or after changing `.env` | Confirms merge stats; zero DB writes |
| **Local dev → local Supabase** | `supabase start`, use URLs from `supabase status`, seed local, test intake there |
| **Production → remote URL in `.env` only when intentional** | Same script upserts ~4.5k rows; wrong URL = wrong project |
| **Never commit `.env` or `data/*.csv`** | Secrets + large PHI-adjacent facility lists |
| **Apply migrations before seed** | `source_id` unique index required for upsert |
| **Re-seed prod only when refreshing CMS/ArcGIS** | Idempotent, but still mutates `hospitals` |

### Local workflow

```bash
supabase start
# Point .env at 127.0.0.1 URLs + keys from `supabase status`

supabase db push

pip3 install -r scripts/requirements-seed.txt
python3 scripts/seed_hospitals.py --fetch --dry-run
python3 scripts/seed_hospitals.py --fetch
```

Optional: use your downloaded CMS file to avoid API pagination:

```bash
python3 scripts/seed_hospitals.py --fetch \
  --cms ~/Downloads/hospitals_current_data/Hospital_General_Information.csv
```

### Production workflow

1. Confirm `.env` `NUXT_PUBLIC_SUPABASE_URL` host is your **production** project (not local).
2. `supabase db push` (or apply `20260531000000_hospitals_source_id.sql` in dashboard if already applied).
3. `python3 scripts/seed_hospitals.py --fetch --dry-run` — review match stats.
4. `python3 scripts/seed_hospitals.py --fetch` — upsert.
5. Smoke: intake Step 2 facility search (e.g. “Mayo”, “Mass General”); link facility; DOCX shows beds when matched.

### Switching environments

Use **one `.env` at a time**. After seeding prod, switch back to local URLs before `npm run dev` if you normally develop against local Supabase.

Consider a **second env file** (not committed), e.g. `.env.prod`, and:

```bash
cp .env.prod .env   # only when seeding prod
```

---

## Commands reference

```bash
pip3 install -r scripts/requirements-seed.txt

# Inspect merge (no DB)
python3 scripts/seed_hospitals.py --fetch --dry-run
python3 scripts/seed_hospitals.py --fetch --dry-run --write-csv data/master_hospitals.csv

# Upsert to DB configured in .env
python3 scripts/seed_hospitals.py --fetch
```

Optional env:

- `SEED_SSL_VERIFY=false` — TLS issues against government endpoints on macOS LibreSSL.
- `HIFLD_QUERY_URL` — override ArcGIS query URL if the default layer changes.

---

## Expected match rates (typical dry-run)

- CMS after filter: ~4,493 rows
- ArcGIS metrics index: ~7,581 features
- With beds: ~2,479 | With trauma: ~1,089
- Unmatched beds/trauma: ~2,014 (facility still searchable by name)

---

## Legacy seed rows

The MVP migration inserted ~15 demo hospitals **without** `source_id`. They remain until you delete them manually. New seed rows use `cms:…` ids. Duplicate names in search are possible until old rows are removed.

```sql
-- Optional cleanup after first prod seed (review in dashboard first)
DELETE FROM hospitals WHERE source_id IS NULL;
```

---

## Related

- [HOSPITAL-PARSE-UX-PLAN.md](./HOSPITAL-PARSE-UX-PLAN.md) — employer linking + parse suggestions (next code work)
- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) — post-seed smoke items
