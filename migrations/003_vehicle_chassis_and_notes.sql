-- Chassis number + dedicated note fields on vehicles.
-- Run in Supabase SQL editor after deploying the app update.

alter table vehicles
  add column if not exists chassis text;

alter table vehicles
  add column if not exists vehicle_notes text;

alter table vehicles
  add column if not exists cover_notes text;

alter table vehicles
  add column if not exists payment_notes text;
