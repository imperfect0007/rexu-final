create table if not exists public.early_access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  mobile text,
  segment text not null default 'personal',
  created_at timestamptz not null default now(),
  unique (email, segment)
);

alter table public.early_access_requests enable row level security;
