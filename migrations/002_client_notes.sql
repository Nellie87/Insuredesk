-- Run in Supabase SQL editor to add agent Comment / notes on clients.

alter table clients
  add column if not exists notes text;
