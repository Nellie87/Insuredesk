-- Quick fix: create agent profile for Admin (innovatexcel993@gmail.com)
-- Run in Supabase → SQL Editor, then sign out and sign in again in the app.

-- Required if signup could not create agents row (safe to re-run):
DO $$ BEGIN
  CREATE POLICY "Agent can insert own record"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

insert into agents (id, name, phone, email, commission_rates)
values (
  'bc7ef987-eb3a-4851-9808-a6b139d31e07',
  'Admin',
  '0700000000',
  'innovatexcel993@gmail.com',
  '[{"insurer":"APA","rate":12.5},{"insurer":"Britam","rate":10}]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email;
