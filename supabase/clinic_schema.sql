-- Minimal schema for clinic-only features.
-- Run this in your Supabase SQL editor.

create table if not exists public.clinic_doctors (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  phone text,
  timezone text not null default 'Asia/Karachi',
  info_box jsonb not null default '{}'::jsonb,
  google jsonb,
  sheet_columns text[] not null default array['name','phone','date'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_doctor_tokens (
  doctor_id uuid primary key references public.clinic_doctors(id) on delete cascade,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date bigint,
  updated_at timestamptz not null default now()
);

-- Optional: let anon read the table if you want the dashboard to work without service role.
-- For production, enable RLS and write policies properly.
-- alter table public.clinic_doctors enable row level security;
-- alter table public.clinic_doctor_tokens enable row level security;

create table if not exists public.doctor_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  clinic_name text,
  consultation_fee text,
  slot_duration_mins integer,
  start_time time,
  end_time time,
  google_sheet_id text,
  google_refresh_token text,
  custom_rules text
);

