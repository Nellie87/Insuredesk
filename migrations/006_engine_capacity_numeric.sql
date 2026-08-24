-- Store engine capacity as cc (integer), not text like '1500cc'.
-- Safe to re-run if the column is already numeric.
-- Run in Supabase SQL editor after deploying the app update.

alter table vehicles
  alter column engine_capacity type int
  using nullif(regexp_replace(engine_capacity::text, '[^0-9]', '', 'g'), '')::int;
