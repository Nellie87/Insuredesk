-- Cover duration + archived periods for policy renewal.
-- Run in Supabase SQL editor after deploying the app update.

alter table vehicles
  add column if not exists cover_months int not null default 12;

alter table vehicles
  add column if not exists cover_history jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vehicles_cover_months_check'
  ) then
    alter table vehicles
      add constraint vehicles_cover_months_check
      check (cover_months >= 1 and cover_months <= 12);
  end if;
end $$;
