-- =========================================================
-- QRgency Supabase Schema
-- Save as: qrgency_supabase_schema.sql
-- Run in the Supabase SQL editor for this project
-- =========================================================

-- Enable required extensions (usually already enabled in Supabase)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =========================================================
-- PROFILES (User metadata, linked to auth.users)
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  mobile text,
  avatar_url text,
  date_of_birth date,
  account_type text not null default 'personal', -- 'personal' (B2C) or 'commercial' (B2B fleet)
  mobile_verified boolean not null default false,
  is_paid boolean not null default false,
  activation_completed boolean not null default false,
  activation_number bigint,
  is_free_customer boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_is_paid on public.profiles (is_paid);
create index if not exists idx_profiles_created_at on public.profiles (created_at);
create index if not exists idx_profiles_mobile on public.profiles (mobile);
create index if not exists idx_profiles_activation_number on public.profiles (activation_number);
create index if not exists idx_profiles_account_type on public.profiles (account_type);

-- Extend profiles with emergency / medical profile linkage and guardian details
alter table public.profiles
  add column if not exists guardian_phone text,
  add column if not exists secondary_contact_name text,
  add column if not exists secondary_contact_phone text,
  add column if not exists blood_group text,
  add column if not exists allergies text,
  add column if not exists medical_conditions text,
  add column if not exists medications text,
  add column if not exists emergency_note text,
  add column if not exists organ_donor boolean,
  add column if not exists language_note text,
  add column if not exists age integer;

-- =========================================================
-- MOBILE VERIFICATION (OTP)
-- =========================================================

create table if not exists public.mobile_verification (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_mobile_verification_mobile
  on public.mobile_verification (mobile);

-- Auto-create profile row when a new auth user is created.
-- Supports both email/password (full_name in metadata) and Google OAuth (name or full_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, mobile, account_type)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'User'
    ),
    new.raw_user_meta_data->>'mobile',
    coalesce(new.raw_user_meta_data->>'account_type', 'personal')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- EMERGENCY CONTACTS
-- =========================================================

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  relation text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_emergency_contacts_profile_id
  on public.emergency_contacts (profile_id);

-- Helper function: add a single emergency contact for the current user
create or replace function public.add_emergency_contact(
  p_name text,
  p_relation text,
  p_phone text
)
returns public.emergency_contacts
language sql
security invoker
as $$
  insert into public.emergency_contacts (profile_id, name, relation, phone)
  values (auth.uid(), p_name, p_relation, p_phone)
  returning *;
$$;

-- =========================================================
-- NORMALIZED EMERGENCY / MEDICAL TABLES
-- =========================================================

-- 1:1 emergency profile with core medical + context fields
create table if not exists public.emergency_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  blood_group text not null,
  guardian_phone text not null,
  emergency_instruction text not null,
  secondary_contact_name text,
  secondary_contact_phone text,
  medications text,
  organ_donor boolean,
  language_note text,
  age integer,
  dob date,
  is_profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists idx_emergency_profiles_profile_id
  on public.emergency_profiles (profile_id);

-- 1:1 detailed medical information
create table if not exists public.medical_info (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  allergies text not null,
  medical_conditions text not null,
  medications text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists idx_medical_info_profile_id
  on public.medical_info (profile_id);

-- 1:1 high-visibility emergency notes
create table if not exists public.emergency_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  note_type text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists idx_emergency_notes_profile_id
  on public.emergency_notes (profile_id);

-- Optional: limit to 3 contacts per profile at DB level
create or replace function public.enforce_max_three_contacts()
returns trigger
language plpgsql
as $$
declare
  contact_count int;
begin
  select count(*)
  into contact_count
  from public.emergency_contacts
  where profile_id = new.profile_id;

  if contact_count >= 3 then
    raise exception 'Maximum of 3 emergency contacts allowed per user';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_three_contacts on public.emergency_contacts;

create trigger trg_enforce_max_three_contacts
before insert on public.emergency_contacts
for each row execute procedure public.enforce_max_three_contacts();

-- =========================================================
-- FLEET VEHICLES (company fleet QR tracking)
-- =========================================================

create table if not exists public.fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  qr_token text unique,
  vehicle_number text not null,
  label text,
  make_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fleet_vehicles_owner_profile_id
  on public.fleet_vehicles (owner_profile_id);
create index if not exists idx_fleet_vehicles_qr_token
  on public.fleet_vehicles (qr_token);

-- =========================================================
-- FLEET DRIVERS (assigned to vehicles)
-- =========================================================

create table if not exists public.fleet_drivers (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_vehicle_id uuid references public.fleet_vehicles (id) on delete set null,
  name text not null,
  phone text not null,
  blood_group text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fleet_drivers_owner_profile_id
  on public.fleet_drivers (owner_profile_id);
create index if not exists idx_fleet_drivers_vehicle_id
  on public.fleet_drivers (assigned_vehicle_id);

-- =========================================================
-- QR CODES (Tokens referenced by public scan URL /e/{token})
-- =========================================================

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_codes_profile_id
  on public.qr_codes (profile_id);

create index if not exists idx_qr_codes_token
  on public.qr_codes (token);

-- enforce at most one QR per profile to prevent double activation
create unique index if not exists uq_qr_codes_profile_id
  on public.qr_codes (profile_id);

-- =========================================================
-- PAYMENTS (Optional: Stripe / audit history)
-- =========================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- legacy fields (kept for backwards-compat)
  amount_cents integer,
  currency text,
  stripe_payment_intent_id text,
  -- new, INR-focused activation payments
  amount_paise integer not null default 1000,
  currency_code text not null default 'INR',
  provider text not null default 'mock',
  provider_payment_id text,
  status text not null default 'created', -- e.g. created, pending, succeeded, failed, refunded
  is_activation boolean not null default true,
  idempotency_key text,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_payments_profile_id
  on public.payments (profile_id);

create index if not exists idx_payments_created_at
  on public.payments (created_at);

create unique index if not exists uq_payments_idempotency_key
  on public.payments (idempotency_key);

-- =========================================================
-- ADMINS (for future DB-backed admin auth)
-- NOTE: current code uses env-based admin; this table
-- lets you migrate to DB-backed admins later.
-- =========================================================

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null, -- store bcrypt/argon hash, never plain text
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists idx_admins_is_active
  on public.admins (is_active);

-- =========================================================
-- SCAN LOGS (for admin analytics)
-- Extended to support security / usage analytics
-- =========================================================

create table if not exists public.scan_logs (
  id bigserial primary key,
  token text not null,
  profile_id uuid references public.profiles (id) on delete set null,
  ip inet,
  user_agent text,
  -- Analytics extensions
  event_type text not null default 'scan', -- 'scan' | 'guardian_call' | 'helpline_click' | 'invalid_token'
  helpline_type text,                      -- '112_ambulance' | '112_police' | '112_fire'
  guardian_call boolean default false,
  device_fp text,                          -- hashed device fingerprint
  country_code text,
  city text,
  is_suspected_bot boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_logs_token on public.scan_logs (token);
create index if not exists idx_scan_logs_created_at on public.scan_logs (created_at);
create index if not exists idx_scan_logs_event_type on public.scan_logs (event_type);
create index if not exists idx_scan_logs_device_fp on public.scan_logs (device_fp);
create index if not exists idx_scan_logs_ip on public.scan_logs (ip);

-- =========================================================
-- USER LIFECYCLE EVENTS (for funnel / conversion analytics)
-- =========================================================

create table if not exists public.user_lifecycle_events (
  id bigserial primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null, -- 'register','mobile_verified','profile_complete','payment_succeeded','activated'
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_lifecycle_profile_type
  on public.user_lifecycle_events (profile_id, event_type);

create index if not exists idx_user_lifecycle_created_at
  on public.user_lifecycle_events (created_at);

-- =========================================================
-- DAILY STATS (pre-aggregated per-day metrics)
-- =========================================================

create table if not exists public.daily_stats (
  day date primary key,

  -- user metrics
  total_users integer not null,
  new_users integer not null,
  activated_users integer not null,
  free_users integer not null,
  paid_users integer not null,
  weekly_active_users integer not null,

  -- payment metrics
  total_revenue_paise bigint not null,
  payments_succeeded integer not null,
  payments_failed integer not null,

  -- qr metrics
  qr_total_generated integer not null,
  qr_active integer not null,
  qr_disabled integer not null,
  qr_regenerations integer not null,

  -- scan metrics
  scans_total bigint not null,
  scans_unique_devices bigint not null,
  scans_unique_ips bigint not null,
  scans_per_qr_avg numeric(10, 2) not null,
  peak_hour_utc smallint,
  repeat_scanners bigint not null,

  -- emergency usage
  guardian_calls bigint not null,
  helpline_clicks bigint not null,

  created_at timestamptz not null default now()
);

-- =========================================================
-- ANALYTICS SNAPSHOTS (multi-period aggregates)
-- =========================================================

create table if not exists public.analytics_snapshots (
  id bigserial primary key,
  period_type text not null, -- 'daily','weekly','monthly','realtime'
  period_start date not null,
  period_end date not null,
  metric_key text not null,  -- e.g. 'total_users','total_revenue'
  metric_value numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_snapshots_period
  on public.analytics_snapshots (period_type, period_start, period_end, metric_key);

-- =========================================================
-- ABUSE INCIDENTS (detected anomalies / abuse signals)
-- =========================================================

create table if not exists public.abuse_incidents (
  id bigserial primary key,
  incident_type text not null, -- 'excessive_scans_ip','token_bruteforce','geo_anomaly','bot_pattern'
  token text,
  profile_id uuid references public.profiles (id) on delete set null,
  ip inet,
  device_fp text,
  country_code text,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz
);

create index if not exists idx_abuse_incidents_type_time
  on public.abuse_incidents (incident_type, detected_at);

-- =========================================================
-- CUSTOMER COUNTER (global activation counter)
-- =========================================================

create table if not exists public.customer_counter (
  id integer primary key default 1,
  current_value bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.customer_counter (id, current_value)
values (1, 10158199)
on conflict (id) do nothing;

-- Function to atomically complete activation, generate QR and increment counter
create or replace function public.complete_activation(p_profile_id uuid, p_force_free boolean default false)
returns table(activation_number bigint, is_free boolean)
language plpgsql
security definer
as $$
declare
  v_profile public.profiles%rowtype;
  v_counter bigint;
  v_is_free boolean;
  v_token text;
begin
  -- Lock profile row
  select *
  into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Profile not found for activation';
  end if;

  -- Idempotency: if already completed, return existing values and exit
  if v_profile.activation_completed then
    return query
    select v_profile.activation_number, v_profile.is_free_customer;
    return;
  end if;

  -- Lock and increment global counter
  update public.customer_counter
  set current_value = current_value + 1,
      updated_at = now()
  where id = 1
  returning current_value into v_counter;

  -- Determine free/paid: first 1000 after seed or forced free
  v_is_free := p_force_free or ((v_counter - 10158200) < 1000);

  -- Update profile activation state
  update public.profiles
  set is_paid = true,
      activation_completed = true,
      activation_number = v_counter,
      is_free_customer = v_is_free
  where id = p_profile_id;

  -- Ensure an active QR token exists
  select token
  into v_token
  from public.qr_codes
  where profile_id = p_profile_id
    and is_active = true
  limit 1;

  if v_token is null then
    v_token := encode(gen_random_bytes(16), 'hex');
    insert into public.qr_codes (profile_id, token, is_active)
    values (p_profile_id, v_token, true);
  end if;

  return query
  select v_counter, v_is_free;
end;
$$;

-- =========================================================
-- ROW LEVEL SECURITY (basic; tighten as needed)
-- =========================================================

alter table public.profiles
  enable row level security;

alter table public.emergency_contacts
  enable row level security;

alter table public.emergency_profiles
  enable row level security;

alter table public.medical_info
  enable row level security;

alter table public.emergency_notes
  enable row level security;

alter table public.qr_codes
  enable row level security;

alter table public.payments
  enable row level security;

alter table public.scan_logs
  enable row level security;

-- Profiles: users can see/update only their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Emergency contacts: owner only
drop policy if exists "Users can manage own contacts" on public.emergency_contacts;
create policy "Users can manage own contacts"
on public.emergency_contacts
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Emergency profiles: owner only
drop policy if exists "Users can manage own emergency profile" on public.emergency_profiles;
create policy "Users can manage own emergency profile"
on public.emergency_profiles
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Medical info: owner only
drop policy if exists "Users can manage own medical info" on public.medical_info;
create policy "Users can manage own medical info"
on public.medical_info
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Emergency notes: owner only
drop policy if exists "Users can manage own emergency notes" on public.emergency_notes;
create policy "Users can manage own emergency notes"
on public.emergency_notes
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- QR codes: owner can read their own; writes via service role
drop policy if exists "Users can view own QR codes" on public.qr_codes;
create policy "Users can view own QR codes"
on public.qr_codes
for select
using (auth.uid() = profile_id);

-- Fleet vehicles: owner only
alter table public.fleet_vehicles enable row level security;
drop policy if exists "Users can manage own fleet vehicles" on public.fleet_vehicles;
create policy "Users can manage own fleet vehicles"
on public.fleet_vehicles for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- Fleet drivers: owner only
alter table public.fleet_drivers enable row level security;
drop policy if exists "Users can manage own fleet drivers" on public.fleet_drivers;
create policy "Users can manage own fleet drivers"
on public.fleet_drivers for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- Mobile verification: service role only (no anon user policies)
alter table public.mobile_verification enable row level security;

-- Customer counter: service role only
alter table public.customer_counter enable row level security;

-- Admins: service role only
alter table public.admins enable row level security;

-- User lifecycle events: service role only
alter table public.user_lifecycle_events enable row level security;

-- Daily stats: service role only
alter table public.daily_stats enable row level security;

-- Analytics snapshots: service role only
alter table public.analytics_snapshots enable row level security;

-- Abuse incidents: service role only
alter table public.abuse_incidents enable row level security;

-- Scan logs and payments: service role / admin only (no anon user)

-- =========================================================
-- FLEET DOCUMENTS (insurance, RC, license, permits, etc.)
-- =========================================================

create table if not exists public.fleet_documents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.fleet_vehicles (id) on delete set null,
  driver_id uuid references public.fleet_drivers (id) on delete set null,
  document_type text not null, -- 'insurance','registration','license','permit','fitness','pollution','other'
  document_name text not null,
  file_path text not null,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fleet_documents_owner on public.fleet_documents (owner_profile_id);
create index if not exists idx_fleet_documents_expiry on public.fleet_documents (expiry_date);
create index if not exists idx_fleet_documents_vehicle on public.fleet_documents (vehicle_id);
create index if not exists idx_fleet_documents_driver on public.fleet_documents (driver_id);

alter table public.fleet_documents enable row level security;
drop policy if exists "Users can manage own fleet documents" on public.fleet_documents;
create policy "Users can manage own fleet documents"
on public.fleet_documents for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- FLEET CHECK-INS / CHECK-OUTS (driver shift tracking)
-- =========================================================

create table if not exists public.fleet_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  driver_id uuid references public.fleet_drivers (id) on delete set null,
  check_type text not null check (check_type in ('check_in', 'check_out')),
  odometer_reading numeric,
  fuel_level text,
  condition_notes text,
  photo_paths text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_checkins_owner on public.fleet_checkins (owner_profile_id);
create index if not exists idx_fleet_checkins_vehicle on public.fleet_checkins (vehicle_id);
create index if not exists idx_fleet_checkins_created on public.fleet_checkins (created_at desc);

alter table public.fleet_checkins enable row level security;
drop policy if exists "Users can manage own fleet checkins" on public.fleet_checkins;
create policy "Users can manage own fleet checkins"
on public.fleet_checkins for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- FLEET ACTIVITY LOGS (B2B audit trail)
-- =========================================================

create table if not exists public.fleet_activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  entity_type text,       -- 'vehicle','driver','document','checkin'
  entity_id text,
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_activity_logs_owner on public.fleet_activity_logs (owner_profile_id);
create index if not exists idx_fleet_activity_logs_created on public.fleet_activity_logs (created_at desc);
create index if not exists idx_fleet_activity_logs_entity on public.fleet_activity_logs (entity_type);

alter table public.fleet_activity_logs enable row level security;
drop policy if exists "Users can manage own fleet activity logs" on public.fleet_activity_logs;
create policy "Users can manage own fleet activity logs"
on public.fleet_activity_logs for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- FLEET VEHICLES: check-in QR token
-- =========================================================

alter table public.fleet_vehicles
  add column if not exists checkin_token text unique;

create index if not exists idx_fleet_vehicles_checkin_token
  on public.fleet_vehicles (checkin_token);

-- IMPORTANT:
-- - Emergency QR (public.qr_codes.token) is for emergency profile flows.
-- - Check-in QR (public.fleet_vehicles.checkin_token) is for vehicle/fleet flows (documents/logs/attendance).

-- Resolve a check-in token to the vehicle (used by your "scan checkin QR -> open vehicle" screen)
create or replace function public.resolve_vehicle_by_checkin_token(p_checkin_token text)
returns table(
  vehicle_id uuid,
  owner_profile_id uuid,
  vehicle_number text,
  label text,
  make_model text
)
language sql
security definer
set search_path = public
as $$
  select
    v.id,
    v.owner_profile_id,
    v.vehicle_number,
    v.label,
    v.make_model
  from public.fleet_vehicles v
  where v.checkin_token = p_checkin_token
  limit 1;
$$;

grant execute on function public.resolve_vehicle_by_checkin_token(text) to anon, authenticated;

-- Fetch vehicle documents ONLY via check-in token (prevents emergency QR from exposing fleet docs)
create or replace function public.get_vehicle_documents_by_checkin_token(p_checkin_token text)
returns table(
  document_id uuid,
  vehicle_id uuid,
  document_type text,
  document_name text,
  file_path text,
  expiry_date date,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    d.id,
    d.vehicle_id,
    d.document_type,
    d.document_name,
    d.file_path,
    d.expiry_date,
    d.notes,
    d.created_at,
    d.updated_at
  from public.fleet_documents d
  join public.fleet_vehicles v
    on v.id = d.vehicle_id
   and v.owner_profile_id = d.owner_profile_id
  where v.checkin_token = p_checkin_token
  order by d.created_at desc;
$$;

grant execute on function public.get_vehicle_documents_by_checkin_token(text) to anon, authenticated;

-- Optional: track check-in QR scans separately from emergency scan_logs
create table if not exists public.fleet_checkin_scan_logs (
  id bigserial primary key,
  checkin_token text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  vehicle_id uuid references public.fleet_vehicles (id) on delete set null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_checkin_scan_logs_token on public.fleet_checkin_scan_logs (checkin_token);
create index if not exists idx_fleet_checkin_scan_logs_vehicle on public.fleet_checkin_scan_logs (vehicle_id);
create index if not exists idx_fleet_checkin_scan_logs_created on public.fleet_checkin_scan_logs (created_at desc);

alter table public.fleet_checkin_scan_logs enable row level security;
drop policy if exists "Users can view own fleet checkin scan logs" on public.fleet_checkin_scan_logs;
create policy "Users can view own fleet checkin scan logs"
on public.fleet_checkin_scan_logs for select
using (auth.uid() = owner_profile_id);

-- =========================================================
-- FLEET CHECKINS: trip purpose extension
-- =========================================================

alter table public.fleet_checkins
  add column if not exists trip_purpose text,
  add column if not exists trip_note text;

-- =========================================================
-- FLEET MAINTENANCE REMINDERS
-- =========================================================

create table if not exists public.fleet_maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  title text not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_maint_owner on public.fleet_maintenance_reminders (owner_profile_id);
create index if not exists idx_fleet_maint_vehicle on public.fleet_maintenance_reminders (vehicle_id);
create index if not exists idx_fleet_maint_due on public.fleet_maintenance_reminders (due_date);

alter table public.fleet_maintenance_reminders enable row level security;
drop policy if exists "Users can manage own fleet reminders" on public.fleet_maintenance_reminders;
create policy "Users can manage own fleet reminders"
on public.fleet_maintenance_reminders for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- FLEET INCIDENTS (unauthorized use, damage, etc.)
-- =========================================================

create table if not exists public.fleet_incidents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  incident_type text not null,
  description text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_incidents_owner on public.fleet_incidents (owner_profile_id);
create index if not exists idx_fleet_incidents_vehicle on public.fleet_incidents (vehicle_id);
create index if not exists idx_fleet_incidents_created on public.fleet_incidents (created_at desc);

alter table public.fleet_incidents enable row level security;
drop policy if exists "Users can manage own fleet incidents" on public.fleet_incidents;
create policy "Users can manage own fleet incidents"
on public.fleet_incidents for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- SUPABASE STORAGE BUCKETS (run in Supabase SQL editor)
-- =========================================================
-- This section is meant to be run in the Supabase SQL editor.
-- It creates buckets and Storage RLS policies so users can upload/read their own files.

insert into storage.buckets (id, name, public)
values ('fleet-documents', 'fleet-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('fleet-photos', 'fleet-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('checkin-documents', 'checkin-documents', false)
on conflict (id) do nothing;

-- Storage RLS policies (idempotent via drop/create)
drop policy if exists "Fleet owners upload documents" on storage.objects;
create policy "Fleet owners upload documents"
on storage.objects for insert
with check (bucket_id = 'fleet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners read own documents" on storage.objects;
create policy "Fleet owners read own documents"
on storage.objects for select
using (bucket_id = 'fleet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners delete own documents" on storage.objects;
create policy "Fleet owners delete own documents"
on storage.objects for delete
using (bucket_id = 'fleet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners upload photos" on storage.objects;
create policy "Fleet owners upload photos"
on storage.objects for insert
with check (bucket_id = 'fleet-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners read own photos" on storage.objects;
create policy "Fleet owners read own photos"
on storage.objects for select
using (bucket_id = 'fleet-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners delete own photos" on storage.objects;
create policy "Fleet owners delete own photos"
on storage.objects for delete
using (bucket_id = 'fleet-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users upload own profile photo" on storage.objects;
create policy "Users upload own profile photo"
on storage.objects for insert
with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users read own profile photo" on storage.objects;
create policy "Users read own profile photo"
on storage.objects for select
using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users delete own profile photo" on storage.objects;
create policy "Users delete own profile photo"
on storage.objects for delete
using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners upload checkin docs" on storage.objects;
create policy "Fleet owners upload checkin docs"
on storage.objects for insert
with check (bucket_id = 'checkin-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners read own checkin docs" on storage.objects;
create policy "Fleet owners read own checkin docs"
on storage.objects for select
using (bucket_id = 'checkin-documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fleet owners delete own checkin docs" on storage.objects;
create policy "Fleet owners delete own checkin docs"
on storage.objects for delete
using (bucket_id = 'checkin-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================
-- ATTENDANCE (check-in + check-out -> single attendance row)
-- =========================================================

create table if not exists public.fleet_attendance (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  driver_id uuid references public.fleet_drivers (id) on delete set null,
  work_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_checkin_id uuid references public.fleet_checkins (id) on delete set null,
  check_out_checkin_id uuid references public.fleet_checkins (id) on delete set null,
  status text not null default 'open' check (status in ('open','closed','missing_checkout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_profile_id, vehicle_id, driver_id, work_date)
);

create index if not exists idx_fleet_attendance_owner on public.fleet_attendance (owner_profile_id);
create index if not exists idx_fleet_attendance_vehicle on public.fleet_attendance (vehicle_id);
create index if not exists idx_fleet_attendance_driver on public.fleet_attendance (driver_id);
create index if not exists idx_fleet_attendance_date on public.fleet_attendance (work_date desc);
create index if not exists idx_fleet_attendance_status on public.fleet_attendance (status);

alter table public.fleet_attendance enable row level security;
drop policy if exists "Users can manage own fleet attendance" on public.fleet_attendance;
create policy "Users can manage own fleet attendance"
on public.fleet_attendance for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

create or replace function public.fleet_sync_attendance_from_checkin()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_work_date date;
begin
  v_work_date := (new.created_at at time zone 'utc')::date;

  if new.check_type = 'check_in' then
    insert into public.fleet_attendance (
      owner_profile_id, vehicle_id, driver_id, work_date,
      check_in_at, check_in_checkin_id, status
    )
    values (
      new.owner_profile_id, new.vehicle_id, new.driver_id, v_work_date,
      new.created_at, new.id, 'open'
    )
    on conflict (owner_profile_id, vehicle_id, driver_id, work_date)
    do update set
      check_in_at = coalesce(public.fleet_attendance.check_in_at, excluded.check_in_at),
      check_in_checkin_id = coalesce(public.fleet_attendance.check_in_checkin_id, excluded.check_in_checkin_id),
      updated_at = now();

  elsif new.check_type = 'check_out' then
    insert into public.fleet_attendance (
      owner_profile_id, vehicle_id, driver_id, work_date,
      check_out_at, check_out_checkin_id, status
    )
    values (
      new.owner_profile_id, new.vehicle_id, new.driver_id, v_work_date,
      new.created_at, new.id, 'closed'
    )
    on conflict (owner_profile_id, vehicle_id, driver_id, work_date)
    do update set
      check_out_at = excluded.check_out_at,
      check_out_checkin_id = excluded.check_out_checkin_id,
      status = 'closed',
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fleet_sync_attendance_from_checkin on public.fleet_checkins;
create trigger trg_fleet_sync_attendance_from_checkin
after insert on public.fleet_checkins
for each row execute procedure public.fleet_sync_attendance_from_checkin();

-- =========================================================
-- CHECK-IN ASSIGNMENTS (who can/should check in where)
-- =========================================================

create table if not exists public.fleet_checkin_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  driver_id uuid references public.fleet_drivers (id) on delete set null,
  checkin_token text, -- optional: assignment tied to a specific QR/checkin token
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_checkin_assign_owner on public.fleet_checkin_assignments (owner_profile_id);
create index if not exists idx_fleet_checkin_assign_vehicle on public.fleet_checkin_assignments (vehicle_id);
create index if not exists idx_fleet_checkin_assign_driver on public.fleet_checkin_assignments (driver_id);
create index if not exists idx_fleet_checkin_assign_token on public.fleet_checkin_assignments (checkin_token);
create index if not exists idx_fleet_checkin_assign_active on public.fleet_checkin_assignments (is_active);

alter table public.fleet_checkin_assignments enable row level security;
drop policy if exists "Users can manage own fleet checkin assignments" on public.fleet_checkin_assignments;
create policy "Users can manage own fleet checkin assignments"
on public.fleet_checkin_assignments for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- CHECK-IN DOCUMENTS (attach documents to a check-in; includes VEC)
-- =========================================================

create table if not exists public.fleet_checkin_documents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid not null references public.fleet_checkins (id) on delete cascade,
  vehicle_id uuid references public.fleet_vehicles (id) on delete set null,
  driver_id uuid references public.fleet_drivers (id) on delete set null,
  document_type text not null, -- 'vec' | 'invoice' | 'permit' | 'photo' | 'other'
  document_name text,
  file_path text not null,
  doc_link text, -- optional: cached signed/public URL
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_fleet_checkin_docs_owner on public.fleet_checkin_documents (owner_profile_id);
create index if not exists idx_fleet_checkin_docs_checkin on public.fleet_checkin_documents (checkin_id);
create index if not exists idx_fleet_checkin_docs_vehicle on public.fleet_checkin_documents (vehicle_id);
create index if not exists idx_fleet_checkin_docs_driver on public.fleet_checkin_documents (driver_id);
create index if not exists idx_fleet_checkin_docs_type on public.fleet_checkin_documents (document_type);

alter table public.fleet_checkin_documents enable row level security;
drop policy if exists "Users can manage own fleet checkin documents" on public.fleet_checkin_documents;
create policy "Users can manage own fleet checkin documents"
on public.fleet_checkin_documents for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- Convenience view for logs UI (filter + show VEC checkbox easily)
create or replace view public.fleet_checkin_logs as
select
  c.id as checkin_id,
  c.owner_profile_id,
  c.vehicle_id,
  c.driver_id,
  c.check_type,
  c.created_at,
  c.trip_purpose,
  c.trip_note,
  exists (
    select 1
    from public.fleet_checkin_documents d
    where d.checkin_id = c.id
      and d.document_type = 'vec'
  ) as has_vec,
  (
    select d.doc_link
    from public.fleet_checkin_documents d
    where d.checkin_id = c.id
      and d.document_type = 'vec'
    order by d.created_at desc
    limit 1
  ) as vec_doc_link
from public.fleet_checkins c;

-- Vehicle-first logs UX:
-- 1) show vehicles list with last log + counts
create or replace view public.fleet_vehicle_logs_summary as
select
  v.id as vehicle_id,
  v.owner_profile_id,
  v.vehicle_number,
  v.label,
  v.make_model,
  max(l.created_at) as last_log_at,
  count(l.checkin_id) as logs_total,
  count(l.checkin_id) filter (where l.check_type = 'check_in') as checkins_total,
  count(l.checkin_id) filter (where l.check_type = 'check_out') as checkouts_total,
  count(l.checkin_id) filter (where l.has_vec) as logs_with_vec
from public.fleet_vehicles v
left join public.fleet_checkin_logs l
  on l.vehicle_id = v.id
 and l.owner_profile_id = v.owner_profile_id
group by
  v.id, v.owner_profile_id, v.vehicle_number, v.label, v.make_model;

-- 2) easy drilldown view; filter by vehicle_id in your app query
create or replace view public.fleet_vehicle_logs as
select
  l.*
from public.fleet_checkin_logs l;

-- =========================================================
-- EXTRA LOGS (DIFF / AUDIT TRAIL)
-- =========================================================

create table if not exists public.change_logs (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles (id) on delete set null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null, -- 'insert' | 'update' | 'delete'
  entity_type text not null,
  entity_id text not null,
  old_data jsonb,
  new_data jsonb,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_change_logs_owner on public.change_logs (owner_profile_id);
create index if not exists idx_change_logs_actor on public.change_logs (actor_profile_id);
create index if not exists idx_change_logs_entity on public.change_logs (entity_type, entity_id);
create index if not exists idx_change_logs_created on public.change_logs (created_at desc);

alter table public.change_logs enable row level security;
drop policy if exists "Users can view own change logs" on public.change_logs;
create policy "Users can view own change logs"
on public.change_logs for select
using (auth.uid() = owner_profile_id);

create or replace function public.jsonb_diff(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_object_agg(k, jsonb_build_object('from', a->k, 'to', b->k))
    filter (where (a->k) is distinct from (b->k)),
    '{}'::jsonb
  )
  from (
    select jsonb_object_keys(coalesce(a, '{}'::jsonb)) as k
    union
    select jsonb_object_keys(coalesce(b, '{}'::jsonb)) as k
  ) keys;
$$;

create or replace function public.log_change_row()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_action text;
  v_entity_id text;
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_old := null;
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_new := null;
  end if;

  -- Determine entity id (best-effort)
  v_entity_id := coalesce((v_new->>'id'), (v_old->>'id'), '');

  -- Determine owner_profile_id (best-effort)
  v_owner := nullif(coalesce((v_new->>'owner_profile_id'), (v_old->>'owner_profile_id')), '')::uuid;

  insert into public.change_logs (
    owner_profile_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    diff
  )
  values (
    v_owner,
    auth.uid(),
    v_action,
    tg_table_name,
    v_entity_id,
    v_old,
    v_new,
    public.jsonb_diff(v_old, v_new)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_fleet_vehicles on public.fleet_vehicles;
create trigger trg_audit_fleet_vehicles
after insert or update or delete on public.fleet_vehicles
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_drivers on public.fleet_drivers;
create trigger trg_audit_fleet_drivers
after insert or update or delete on public.fleet_drivers
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_documents on public.fleet_documents;
create trigger trg_audit_fleet_documents
after insert or update or delete on public.fleet_documents
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_checkins on public.fleet_checkins;
create trigger trg_audit_fleet_checkins
after insert or update or delete on public.fleet_checkins
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_attendance on public.fleet_attendance;
create trigger trg_audit_fleet_attendance
after insert or update or delete on public.fleet_attendance
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_checkin_assignments on public.fleet_checkin_assignments;
create trigger trg_audit_fleet_checkin_assignments
after insert or update or delete on public.fleet_checkin_assignments
for each row execute procedure public.log_change_row();

drop trigger if exists trg_audit_fleet_checkin_documents on public.fleet_checkin_documents;
create trigger trg_audit_fleet_checkin_documents
after insert or update or delete on public.fleet_checkin_documents
for each row execute procedure public.log_change_row();

-- =========================================================
-- EXCEL -> DATA FEED (bulk import tracking; actual parsing happens in app/edge)
-- =========================================================

create table if not exists public.data_feeds (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  feed_type text not null, -- e.g. 'drivers','vehicles','assignments','documents'
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_data_feeds_owner on public.data_feeds (owner_profile_id);
create index if not exists idx_data_feeds_type on public.data_feeds (feed_type);

alter table public.data_feeds enable row level security;
drop policy if exists "Users can manage own data feeds" on public.data_feeds;
create policy "Users can manage own data feeds"
on public.data_feeds for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

create table if not exists public.data_feed_imports (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  feed_id uuid not null references public.data_feeds (id) on delete cascade,
  source_file_path text not null, -- store uploaded excel in storage, then reference the path here
  status text not null default 'uploaded' check (status in ('uploaded','processing','completed','failed')),
  total_rows integer,
  inserted_rows integer default 0,
  updated_rows integer default 0,
  failed_rows integer default 0,
  column_mapping jsonb default '{}'::jsonb, -- user-defined mapping from Excel columns to DB fields
  error_report jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_data_feed_imports_owner on public.data_feed_imports (owner_profile_id);
create index if not exists idx_data_feed_imports_feed on public.data_feed_imports (feed_id);
create index if not exists idx_data_feed_imports_status on public.data_feed_imports (status);
create index if not exists idx_data_feed_imports_created on public.data_feed_imports (created_at desc);

alter table public.data_feed_imports enable row level security;
drop policy if exists "Users can manage own data feed imports" on public.data_feed_imports;
create policy "Users can manage own data feed imports"
on public.data_feed_imports for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- =========================================================
-- DONE
-- =========================================================

