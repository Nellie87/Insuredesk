-- Heartbeat RPC for an external keep-alive cron.
-- Run in the Supabase SQL editor (skip on a fresh install that already used schema.sql).
-- pg_cron inside this database cannot prevent free-tier pause: when the project
-- sleeps, those jobs stop too. GitHub Actions (.github/workflows/keep-supabase-alive.yml)
-- calls this function so Postgres sees real API traffic.

create or replace function public.keep_alive()
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select now();
$$;

comment on function public.keep_alive() is
  'Heartbeat used by external cron so the free-tier project does not pause.';

grant execute on function public.keep_alive() to anon, authenticated;
