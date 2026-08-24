-- Client → vehicle → insurance package reporting.
-- One client may own many vehicles. Each vehicle has its own policy package.
-- Run in the Supabase SQL editor after deploying this app update
-- (skip on a fresh install that already used the updated schema.sql).

create index if not exists idx_vehicles_policy_type
  on vehicles(policy_type);

create index if not exists idx_vehicles_insurer
  on vehicles(insurer);

create index if not exists idx_vehicles_client_policy
  on vehicles(client_id, policy_type);

comment on table vehicles is
  'Insured vehicles. Many vehicles belong to one client; each row is a distinct insurance package.';

comment on column vehicles.client_id is
  'Owner client. A client can have many vehicles.';

comment on column vehicles.policy_type is
  'Insurance package for this vehicle: comprehensive, third_party, or third_party_fire_theft.';

create or replace view vehicle_insurance_report as
select
  v.id as vehicle_id,
  v.agent_id,
  v.client_id,
  c.name as client_name,
  c.phone as client_phone,
  c.status as client_status,
  v.registration,
  v.chassis,
  v.make,
  v.model,
  v.year,
  v.use_type,
  v.insurer,
  v.policy_type as package_type,
  v.policy_number,
  v.premium,
  v.sum_insured,
  v.vehicle_value,
  v.start_date,
  v.expiry_date,
  v.cover_months,
  ps.id as schedule_id,
  ps.total_premium,
  ps.installment_count,
  case
    when v.expiry_date < current_date then 'expired'
    when v.expiry_date <= (current_date + 30) then 'expiring_soon'
    else 'in_force'
  end as cover_status
from vehicles v
join clients c on c.id = v.client_id
left join lateral (
  select s.id, s.total_premium, s.installment_count
  from payment_schedules s
  where s.vehicle_id = v.id
  order by s.created_at desc
  limit 1
) ps on true;

comment on view vehicle_insurance_report is
  'Flattened client–vehicle–insurance package rows for analytics and filtered reports.';

alter view vehicle_insurance_report set (security_invoker = true);

grant select on vehicle_insurance_report to authenticated;
