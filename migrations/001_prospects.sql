-- Run this migration in Supabase SQL editor if prospects table does not exist yet.

create table if not exists prospects (
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

create index if not exists idx_prospects_agent_id on prospects(agent_id);
create index if not exists idx_prospects_stage on prospects(stage);
create index if not exists idx_prospects_follow_up_date on prospects(follow_up_date);

alter table prospects enable row level security;

do $$ begin
  create policy "Agent sees own prospects"
  on prospects
  for all
  using (agent_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create trigger prospects_updated_at
    before update on prospects
    for each row execute procedure update_updated_at();
exception
  when duplicate_object then null;
end $$;
