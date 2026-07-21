-- Vehicle kind: two_wheeler = 1 safety QR; four_wheeler = 2 safety + 1 check-in
alter table public.fleet_vehicles
  add column if not exists vehicle_kind text;

alter table public.fleet_vehicles
  drop constraint if exists fleet_vehicles_vehicle_kind_check;

alter table public.fleet_vehicles
  add constraint fleet_vehicles_vehicle_kind_check
  check (vehicle_kind is null or vehicle_kind in ('two_wheeler', 'four_wheeler'));
