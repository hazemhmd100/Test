create table if not exists public.sales_app_data (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sales_app_data enable row level security;
