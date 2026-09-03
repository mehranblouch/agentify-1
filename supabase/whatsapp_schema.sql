-- WhatsApp integration storage

create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clinic_doctors(id) on delete cascade,
  phone_number text not null unique,
  connected boolean default false,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_verified_at timestamptz,
  user_jid text,
  device_name text,
  device_version text,
  status text default 'idle', -- idle, connecting, connected, disconnected, error
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_user on public.whatsapp_connections(user_id);
create index if not exists idx_whatsapp_phone on public.whatsapp_connections(phone_number);
create index if not exists idx_whatsapp_connected on public.whatsapp_connections(connected);
