-- Web Push subscriptions and send log.
-- Run in the Supabase SQL editor after deploying this app update.

create table if not exists push_subscriptions (
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

create index if not exists idx_push_subscriptions_agent_id
  on push_subscriptions(agent_id);

alter table push_subscriptions enable row level security;

drop policy if exists "Agent manages own push subscriptions" on push_subscriptions;
create policy "Agent manages own push subscriptions"
  on push_subscriptions
  for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop trigger if exists push_subscriptions_updated_at on push_subscriptions;
create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute procedure update_updated_at();

-- One row per reminder item per agent so a daily/hourly cron does not re-send.
create table if not exists push_sends (
  agent_id   uuid not null references agents(id) on delete cascade,
  event_key  text not null,
  sent_at    timestamptz default now(),
  primary key (agent_id, event_key)
);

create index if not exists idx_push_sends_sent_at on push_sends(sent_at);

alter table push_sends enable row level security;
-- No authenticated policies: only the service role (Edge Function) writes this.
