-- ---------------------------------------------------------------------------
-- 0003: business inquiries from the marketing site's Companies form.
-- Anon insert only. No read policy: the team reads rows in the dashboard until
-- an admin view exists. Applied manually in the Supabase SQL editor.
-- ---------------------------------------------------------------------------
create table public.inquiry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  role text,
  email text not null,
  interest text not null check (interest in ('training', 'development', 'both')),
  team_size text,
  message text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  source text not null default 'site',
  user_agent text
);

alter table public.inquiry enable row level security;

create policy inquiry_insert
  on public.inquiry for insert
  to anon, authenticated
  with check (true);

create index inquiry_created_at_idx on public.inquiry (created_at desc);
