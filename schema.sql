-- ─── Enable UUID generation ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Agents ────────────────────────────────────────────────────────────────────
create table agents (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  phone           text not null,
  email           text not null,
  commission_rates jsonb default '[]',
  created_at      timestamptz default now()
);

alter table agents enable row level security;
create policy "Agent can read own record"   on agents for select using (auth.uid() = id);
create policy "Agent can insert own record" on agents for insert with check (auth.uid() = id);
create policy "Agent can update own record" on agents for update using (auth.uid() = id);

-- ─── Clients ───────────────────────────────────────────────────────────────────
create table clients (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  name        text not null,
  phone       text not null,
  id_number   text,
  email       text,
  address     text,
  notes       text, -- agent Comment / free-text remarks
  status      text not null default 'active'
                check (status in ('active','overdue','expiring_soon','fully_paid','lapsed')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index idx_clients_agent_id on clients(agent_id);
create index idx_clients_status   on clients(status);

alter table clients enable row level security;
create policy "Agent sees own clients" on clients for all using (agent_id = auth.uid());

-- ─── Vehicles ──────────────────────────────────────────────────────────────────
create table vehicles (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references clients(id) on delete cascade,
  agent_id         uuid not null references agents(id) on delete cascade,
  registration     text not null,
  chassis          text,
  make             text not null,
  model            text not null,
  year             int,
  engine_capacity  text,
  vehicle_value    numeric(12,2) default 0,
  vehicle_notes    text,
  cover_notes      text,
  payment_notes    text,
  use_type         text not null default 'private'
                     check (use_type in ('private','commercial','psv')),
  insurer          text not null,
  policy_number    text,
  policy_type      text not null
                     check (policy_type in ('comprehensive','third_party','third_party_fire_theft')),
  start_date       date not null,
  expiry_date      date not null,
  sum_insured      numeric(12,2) default 0,
  premium          numeric(12,2) not null,
  created_at       timestamptz default now()
);

create index idx_vehicles_client_id  on vehicles(client_id);
create index idx_vehicles_agent_id   on vehicles(agent_id);
create index idx_vehicles_expiry     on vehicles(expiry_date);

alter table vehicles enable row level security;
create policy "Agent sees own vehicles" on vehicles for all using (agent_id = auth.uid());

-- ─── Payment Schedules ─────────────────────────────────────────────────────────
create table payment_schedules (
  id                    uuid primary key default uuid_generate_v4(),
  vehicle_id            uuid not null references vehicles(id) on delete cascade,
  agent_id              uuid not null references agents(id),
  total_premium         numeric(12,2) not null,
  down_payment          numeric(12,2) not null,
  down_payment_paid     boolean default false,
  down_payment_paid_at  timestamptz,
  installment_count     int not null,
  installments          jsonb not null default '[]',
  created_at            timestamptz default now()
);

create index idx_schedules_vehicle_id on payment_schedules(vehicle_id);
create index idx_schedules_agent_id   on payment_schedules(agent_id);

alter table payment_schedules enable row level security;
create policy "Agent sees own schedules" on payment_schedules for all using (agent_id = auth.uid());

-- ─── Payments ──────────────────────────────────────────────────────────────────
create table payments (
  id          uuid primary key default uuid_generate_v4(),
  schedule_id uuid references payment_schedules(id) on delete set null,
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  agent_id    uuid not null references agents(id),
  amount      numeric(12,2) not null,
  date        date not null,
  method      text not null check (method in ('mpesa','bank_transfer','cash','cheque')),
  reference   text,
  notes       text,
  logged_by   uuid references agents(id),
  synced      boolean default true,
  created_at  timestamptz default now()
);

create index idx_payments_vehicle_id on payments(vehicle_id);
create index idx_payments_client_id  on payments(client_id);
create index idx_payments_agent_id   on payments(agent_id);

alter table payments enable row level security;
create policy "Agent sees own payments" on payments for all using (agent_id = auth.uid());

-- ─── Commissions ───────────────────────────────────────────────────────────────
create table commissions (
  id           uuid primary key default uuid_generate_v4(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  agent_id     uuid not null references agents(id),
  rate         numeric(5,2) not null,
  amount       numeric(12,2) not null,
  status       text not null default 'pending'
                 check (status in ('pending','confirmed','paid_out')),
  period_month text not null, -- e.g. '2025-07'
  created_at   timestamptz default now()
);

create index idx_commissions_agent_id     on commissions(agent_id);
create index idx_commissions_period_month on commissions(period_month);

alter table commissions enable row level security;
create policy "Agent sees own commissions" on commissions for all using (agent_id = auth.uid());

-- ─── Reminders ─────────────────────────────────────────────────────────────────
create table reminders (
  id           uuid primary key default uuid_generate_v4(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  client_id    uuid not null references clients(id) on delete cascade,
  agent_id     uuid not null references agents(id),
  trigger_type text not null,
  channel      text not null check (channel in ('whatsapp','sms','push')),
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  status       text not null default 'scheduled'
                 check (status in ('scheduled','sent','delivered','failed')),
  message      text not null,
  created_at   timestamptz default now()
);

create index idx_reminders_agent_id      on reminders(agent_id);
create index idx_reminders_scheduled_at  on reminders(scheduled_at);
create index idx_reminders_status        on reminders(status);

alter table reminders enable row level security;
create policy "Agent sees own reminders" on reminders for all using (agent_id = auth.uid());

-- ─── Auto-update updated_at on clients ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on clients
  for each row execute procedure update_updated_at();

-- ─── Prospects ─────────────────────────────────────────────────────────────────
create table prospects (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,

  full_name text not null,
  phone text not null,
  email text,

  vehicle_details text,
  product_interest text,
  estimated_premium numeric(12,2) default 0,
  preferred_insurer text,

  stage text not null default 'lead'
    check (
      stage in (
        'lead',
        'contacted',
        'quoted',
        'negotiating',
        'awaiting_payment',
        'converted',
        'lost',
        'follow_up_later'
      )
    ),

  follow_up_date date,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_prospects_agent_id on prospects(agent_id);
create index idx_prospects_stage on prospects(stage);
create index idx_prospects_follow_up_date on prospects(follow_up_date);

alter table prospects enable row level security;

create policy "Agent sees own prospects"
on prospects
for all
using (agent_id = auth.uid());

create trigger prospects_updated_at
  before update on prospects
  for each row execute procedure update_updated_at();

-- ─── Push notifications ───────────────────────────────────────────────────────
create table push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  enabled     boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index idx_push_subscriptions_agent_id on push_subscriptions(agent_id);

alter table push_subscriptions enable row level security;
create policy "Agent manages own push subscriptions"
  on push_subscriptions
  for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute procedure update_updated_at();

create table push_sends (
  agent_id   uuid not null references agents(id) on delete cascade,
  event_key  text not null,
  sent_at    timestamptz default now(),
  primary key (agent_id, event_key)
);

create index idx_push_sends_sent_at on push_sends(sent_at);

alter table push_sends enable row level security;
