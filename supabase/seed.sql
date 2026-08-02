-- Local development seed (runs via `supabase db reset` / first `supabase start`;
-- wired through config.toml `db.seed.sql_paths = ["./seed.sql"]`).
--
-- This file is LOCAL DEV ONLY. It never runs against hosted/production Supabase
-- (Render deploys the built Nuxt app pointing at your hosted project).
--
-- 1) Align API-role table privileges with hosted Supabase.
--    On this CLI version, public tables created by the `postgres` migration role
--    only receive REFERENCES/TRIGGER/TRUNCATE (no SELECT/INSERT/UPDATE/DELETE)
--    for anon/authenticated/service_role, so PostgREST returns "permission denied".
--    Row-level security still governs anon/authenticated access (they do not have
--    BYPASSRLS), exactly like hosted Supabase — these grants only restore the
--    baseline table privileges the RLS policies assume.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;

-- 2) Reference data: a handful of hospitals so intake hospital search/matching
--    returns results in local dev. Idempotent.
insert into public.hospitals (name, city, state)
select v.name, v.city, v.state
from (values
  ('Cedars-Sinai Medical Center', 'Los Angeles', 'CA'),
  ('Johns Hopkins Hospital', 'Baltimore', 'MD'),
  ('Massachusetts General Hospital', 'Boston', 'MA'),
  ('Cleveland Clinic', 'Cleveland', 'OH'),
  ('Mayo Clinic Hospital', 'Rochester', 'MN')
) as v(name, city, state)
where not exists (
  select 1 from public.hospitals h where h.name = v.name
);
