-- Deduplicate fleet vehicle numbers per company, then add unique index.
-- No helper/temp tables (Supabase SQL Editor-safe).
-- Paste and run the entire script.

-- Documents
update public.fleet_documents d
set vehicle_id = m.keeper_id, updated_at = now()
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where d.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Drivers
update public.fleet_drivers d
set assigned_vehicle_id = m.keeper_id, updated_at = now()
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where d.assigned_vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Check-ins
update public.fleet_checkins c
set vehicle_id = m.keeper_id
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where c.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Attendance: remove conflicts, then remapping
delete from public.fleet_attendance a
using (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where a.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id
  and exists (
    select 1
    from public.fleet_attendance k
    where k.owner_profile_id = a.owner_profile_id
      and k.vehicle_id = m.keeper_id
      and k.driver_id is not distinct from a.driver_id
      and k.work_date = a.work_date
  );

update public.fleet_attendance a
set vehicle_id = m.keeper_id, updated_at = now()
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where a.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Reminders
update public.fleet_maintenance_reminders r
set vehicle_id = m.keeper_id
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where r.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Incidents
update public.fleet_incidents i
set vehicle_id = m.keeper_id
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where i.vehicle_id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

-- Drop orphan QR tokens belonging only to duplicate rows
delete from public.qr_codes q
using (
  select
    d.qr_token as dupe_token,
    k.qr_token as keeper_token
  from (
    select
      id as dupe_id,
      first_value(id) over (
        partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
        order by (qr_token is not null) desc, created_at asc, id asc
      ) as keeper_id
    from public.fleet_vehicles
  ) m
  join public.fleet_vehicles d on d.id = m.dupe_id
  join public.fleet_vehicles k on k.id = m.keeper_id
  where m.dupe_id <> m.keeper_id
) x
where q.token = x.dupe_token
  and x.dupe_token is not null
  and x.keeper_token is not null
  and x.dupe_token <> x.keeper_token;

-- Copy missing fields onto keeper, then delete duplicates
update public.fleet_vehicles k
set
  label = coalesce(k.label, d.label),
  make_model = coalesce(k.make_model, d.make_model),
  vehicle_kind = coalesce(k.vehicle_kind, d.vehicle_kind),
  checkin_token = coalesce(k.checkin_token, d.checkin_token),
  qr_token = coalesce(k.qr_token, d.qr_token),
  updated_at = now()
from (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
join public.fleet_vehicles d on d.id = m.dupe_id
where k.id = m.keeper_id
  and m.dupe_id <> m.keeper_id;

delete from public.fleet_vehicles v
using (
  select
    id as dupe_id,
    first_value(id) over (
      partition by owner_profile_id, lower(replace(vehicle_number, ' ', ''))
      order by (qr_token is not null) desc, created_at asc, id asc
    ) as keeper_id
  from public.fleet_vehicles
) m
where v.id = m.dupe_id
  and m.dupe_id <> m.keeper_id;

update public.fleet_vehicles
set
  vehicle_number = upper(replace(vehicle_number, ' ', '')),
  updated_at = now()
where vehicle_number <> upper(replace(vehicle_number, ' ', ''));

create unique index if not exists uq_fleet_vehicles_owner_vehicle_number
  on public.fleet_vehicles (owner_profile_id, lower(replace(vehicle_number, ' ', '')));
