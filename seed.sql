-- ─── InsureAgent mock / seed data ─────────────────────────────────────────────
--
-- HOW TO USE
-- 1. Run schema.sql first (if you have not already).
-- 2. Sign up in the app OR create a user under Supabase → Authentication → Users.
-- 3. Default agent is Admin (bc7ef987-...). Change agent_text in the DO block for other users.
-- 4. Supabase → SQL Editor → paste this file → Run.
--
-- The SQL Editor runs with elevated privileges, so RLS is bypassed for seeding.
-- After seeding, sign in as that user in the app to see the data.
--
-- To re-run: uncomment the cleanup block at the bottom first, then run again.

DO $$
DECLARE
  -- Admin account (innovatexcel993@gmail.com)
  agent_text text := 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
  agent uuid;

  -- Fixed ids so foreign keys line up (safe to re-run after cleanup)
  c1 uuid := 'a1000001-0001-4000-8000-000000000001';
  c2 uuid := 'a1000001-0001-4000-8000-000000000002';
  c3 uuid := 'a1000001-0001-4000-8000-000000000003';
  c4 uuid := 'a1000001-0001-4000-8000-000000000004';

  v1 uuid := 'b2000001-0001-4000-8000-000000000001';
  v2 uuid := 'b2000001-0001-4000-8000-000000000002';
  v3 uuid := 'b2000001-0001-4000-8000-000000000003';
  v4 uuid := 'b2000001-0001-4000-8000-000000000004';

  sch1 uuid := 'c3000001-0001-4000-8000-000000000001';

  pay1 uuid := 'd4000001-0001-4000-8000-000000000001';
  pay2 uuid := 'd4000001-0001-4000-8000-000000000002';
  pay3 uuid := 'd4000001-0001-4000-8000-000000000003';
  pay4 uuid := 'd4000001-0001-4000-8000-000000000004';

  com1 uuid := 'e5000001-0001-4000-8000-000000000001';
  com2 uuid := 'e5000001-0001-4000-8000-000000000002';

  rem1 uuid := 'f6000001-0001-4000-8000-000000000001';
  rem2 uuid := 'f6000001-0001-4000-8000-000000000002';

  pr1 uuid := 'a7000001-0001-4000-8000-000000000001';
  pr2 uuid := 'a7000001-0001-4000-8000-000000000002';
  pr3 uuid := 'a7000001-0001-4000-8000-000000000003';

BEGIN
  agent := agent_text::uuid;

  -- Agent profile
  INSERT INTO agents (id, name, phone, email, commission_rates)
  VALUES (
    agent,
    'Admin',
    '0700000000',
    'innovatexcel993@gmail.com',
    '[{"insurer":"APA","rate":12.5},{"insurer":"Britam","rate":10}]'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

  -- ─── Clients (mixed statuses for portfolio filters) ───────────────────────
  INSERT INTO clients (id, agent_id, name, phone, id_number, email, address, notes, status, created_at, updated_at)
  VALUES
    (c1, agent, 'James Mwangi',   '0722111222', '28456123', 'james.m@email.com',  'Westlands, Nairobi',     'APA - KDA 123A Toyota Axio', 'active',         '2025-09-01', '2026-03-01'),
    (c2, agent, 'Grace Wanjiku',  '0733444555', '30129876', 'grace.w@email.com',  'Kilimani, Nairobi',      NULL,                        'overdue',        '2025-06-15', '2026-02-20'),
    (c3, agent, 'Peter Ochieng',  '0711666777', '24567890', NULL,                 'Kisumu CBD',             NULL,                        'expiring_soon',  '2024-11-10', '2026-01-15'),
    (c4, agent, 'Mary Akinyi',    '0700888999', '27890123', 'mary.a@email.com',   'Mombasa Road, Nairobi',  NULL,                        'fully_paid',     '2025-01-20', '2025-12-01')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Vehicles ─────────────────────────────────────────────────────────────
  INSERT INTO vehicles (
    id, client_id, agent_id, registration, make, model, year,
    engine_capacity, vehicle_value, use_type, insurer, policy_number,
    policy_type, start_date, expiry_date, sum_insured, premium, created_at
  )
  VALUES
    (v1, c1, agent, 'KDA 123A', 'Toyota',  'Axio',    2016, '1500cc', 850000,  'private',    'APA',    'APA-2025-88421', 'comprehensive',           '2025-09-01', '2026-09-01', 850000,  48500, '2025-09-01'),
    (v2, c2, agent, 'KCB 456B', 'Subaru',  'Impreza', 2014, '2000cc', 1200000, 'private',    'Britam', 'BR-2025-11203',  'comprehensive',           '2025-06-15', '2026-06-15', 1200000, 62000, '2025-06-15'),
    (v3, c3, agent, 'KDG 789C', 'Nissan',  'Note',    2018, '1200cc', 720000,  'private',    'CIC',    'CIC-2024-55091', 'third_party_fire_theft',  '2025-04-10', '2026-04-10', 720000,  28000, '2025-04-10'),
    (v4, c4, agent, 'KDJ 321D', 'Mazda',   'Demio',   2015, '1300cc', 680000,  'commercial', 'Jubilee','JUB-2025-00987', 'third_party',             '2025-01-20', '2026-01-20', 680000,  18500, '2025-01-20')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Payment schedule (James - instalment plan) ───────────────────────────
  INSERT INTO payment_schedules (
    id, vehicle_id, agent_id, total_premium, down_payment,
    down_payment_paid, down_payment_paid_at, installment_count, installments, created_at
  )
  VALUES (
    sch1, v1, agent, 48500, 15000,
    true, '2025-09-05 10:30:00+03', 4,
    '[
      {"number":1,"amount":8375,"due_date":"2025-10-01","paid":true,"paid_at":"2025-10-02"},
      {"number":2,"amount":8375,"due_date":"2025-11-01","paid":true,"paid_at":"2025-11-01"},
      {"number":3,"amount":8375,"due_date":"2025-12-01","paid":false,"paid_at":null},
      {"number":4,"amount":8375,"due_date":"2026-01-01","paid":false,"paid_at":null}
    ]'::jsonb,
    '2025-09-01'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ─── Payments ─────────────────────────────────────────────────────────────
  INSERT INTO payments (id, schedule_id, vehicle_id, client_id, agent_id, amount, date, method, reference, notes, logged_by, synced, created_at)
  VALUES
    (pay1, sch1, v1, c1, agent, 15000, '2025-09-05', 'mpesa',         'QHK7X2ABCD', 'Down payment', agent, true, '2025-09-05'),
    (pay2, sch1, v1, c1, agent,  8375, '2025-10-02', 'mpesa',         'QHL9Y3EFGH', 'Instalment 1', agent, true, '2025-10-02'),
    (pay3, NULL, v2, c2, agent, 20000, '2025-07-01', 'bank_transfer', 'BNK-88421',  'Partial premium', agent, true, '2025-07-01'),
    (pay4, NULL, v4, c4, agent, 18500, '2025-01-22', 'cash',          NULL,         'Paid in full',    agent, true, '2025-01-22')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Commission ───────────────────────────────────────────────────────────
  INSERT INTO commissions (id, vehicle_id, agent_id, rate, amount, status, period_month, created_at)
  VALUES
    (com1, v1, agent, 12.50, 6062.50, 'confirmed', '2025-09', '2025-09-10'),
    (com2, v2, agent, 10.00, 6200.00, 'pending', '2025-06', '2025-06-20')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Reminders ───────────────────────────────────────────────────────────
  INSERT INTO reminders (id, vehicle_id, client_id, agent_id, trigger_type, channel, scheduled_at, sent_at, status, message, created_at)
  VALUES
    (
      rem1, v2, c2, agent, 'payment_overdue_1d', 'whatsapp',
      '2026-02-21 09:00:00+03', NULL, 'scheduled',
      'Hello Grace, your insurance instalment for KCB 456B is overdue. Please contact Admin on 0700000000.',
      '2026-02-20'
    ),
    (
      rem2, v3, c3, agent, 'policy_expiry_30d', 'sms',
      '2026-03-11 08:00:00+03', '2026-03-11 08:05:00+03', 'sent',
      'Hello Peter, your policy for KDG 789C expires on 2026-04-10. Reply or call to renew.',
      '2026-03-01'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ─── Prospects (pipeline stages) ───────────────────────────────────────────
  INSERT INTO prospects (
    id, agent_id, full_name, phone, email, vehicle_details, product_interest,
    estimated_premium, preferred_insurer, stage, follow_up_date, notes, created_at, updated_at
  )
  VALUES
    (pr1, agent, 'David Kimani',  '0799111222', NULL,                  'KCA 111E Toyota Fielder',  'Comprehensive', 52000, 'APA',     'quoted',            '2026-04-05', 'Sent quote via WhatsApp', '2026-03-10', '2026-03-15'),
    (pr2, agent, 'Lucy Njeri',    '0788333444', 'lucy.n@email.com',    'KBB 222F Honda Fit',       'Third Party',   15000, 'Britam',  'contacted',         '2026-04-02', 'Wants to compare 3 insurers', '2026-03-18', '2026-03-20'),
    (pr3, agent, 'Samuel Otieno', '0777555666', 'samuel.o@email.com',  'KCC 333G Isuzu NPR truck', 'Commercial',    95000, 'Jubilee', 'awaiting_payment',  '2026-03-28', 'Fleet quote - 3 vehicles', '2026-02-25', '2026-03-22')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Seed data inserted for agent %', agent;
END $$;

-- ─── Optional cleanup (uncomment, set your agent id, run, then re-run seed) ───
/*
DELETE FROM reminders         WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM commissions       WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM payments          WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM payment_schedules WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM vehicles          WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM clients           WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
DELETE FROM prospects         WHERE agent_id = 'bc7ef987-eb3a-4851-9808-a6b139d31e07';
-- Do not delete agents row if you still use that login.
*/
