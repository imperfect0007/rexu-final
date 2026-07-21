-- Fix Supabase linter: fleet log views must use invoker rights (RLS on base tables).
alter view public.fleet_checkin_logs set (security_invoker = true);
alter view public.fleet_vehicle_logs_summary set (security_invoker = true);
alter view public.fleet_vehicle_logs set (security_invoker = true);
