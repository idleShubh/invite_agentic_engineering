create table if not exists public.guests (
  id uuid primary key,
  name text not null,
  email text default '',
  role text not null,
  company text not null,
  linkedin_url text default '',
  notes text default '',
  status text not null default 'Reach Out',
  photo_url text not null,
  pdf_name text default '',
  pdf_text text default '',
  slug text not null unique,
  proposal jsonb not null,
  published boolean not null default true,
  viewed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guests_slug_idx on public.guests (slug);
create index if not exists guests_created_at_idx on public.guests (created_at desc);

alter table public.guests enable row level security;

drop policy if exists "Service role can manage guests" on public.guests;
create policy "Service role can manage guests"
  on public.guests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
