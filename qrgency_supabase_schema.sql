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
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Emergency contacts: owner only
create policy "Users can manage own contacts"
on public.emergency_contacts
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Emergency profiles: owner only
create policy "Users can manage own emergency profile"
on public.emergency_profiles
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Medical info: owner only
create policy "Users can manage own medical info"
on public.medical_info
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Emergency notes: owner only
create policy "Users can manage own emergency notes"
on public.emergency_notes
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- QR codes: owner can read their own; writes via service role
create policy "Users can view own QR codes"
on public.qr_codes
for select
using (auth.uid() = profile_id);

-- Fleet vehicles: owner only
alter table public.fleet_vehicles enable row level security;
create policy "Users can manage own fleet vehicles"
on public.fleet_vehicles for all
using (auth.uid() = owner_profile_id)
with check (auth.uid() = owner_profile_id);

-- Fleet drivers: owner only
alter table public.fleet_drivers enable row level security;
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
-- DONE
-- =========================================================

