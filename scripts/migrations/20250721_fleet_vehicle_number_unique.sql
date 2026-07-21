-- One vehicle number per fleet owner (case-insensitive, ignores spaces).
create unique index if not exists uq_fleet_vehicles_owner_vehicle_number
  on public.fleet_vehicles (owner_profile_id, lower(replace(vehicle_number, ' ', '')));
