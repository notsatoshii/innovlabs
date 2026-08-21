-- Phase 2 schema — survey funnel v1.1
-- Data-model rules (survey_schema_v1_1.md + CLAUDE.md):
--   * survey_response is IMMUTABLE: insert-only, no update path anywhere.
--     It is never linked back to a user by mutation; user_profile points at it.
--   * profile_event is append-only.
--   * RLS on everything; the anon key can only insert, never read.

-- ---------------------------------------------------------------------------
-- survey_response — THE baseline. Inserted anonymously before the
-- registration gate (spec rule 3: gate comes after survey + teaser).
-- ---------------------------------------------------------------------------
create table public.survey_response (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  schema_version text not null,
  path text not null check (path in ('employee', 'solo', 'student')),
  q5_variant text check (q5_variant in ('grid', 'seq')),
  org_code text,
  answers jsonb not null,
  scoring jsonb
);

alter table public.survey_response enable row level security;

-- Insert-only for API roles. No select/update/delete policies exist:
-- clients can never read or touch rows; server-side jobs use the secret key.
create policy survey_response_insert
  on public.survey_response for insert
  to anon, authenticated
  with check (true);

create index survey_response_org_code_idx on public.survey_response (org_code)
  where org_code is not null;

-- ---------------------------------------------------------------------------
-- user_profile — living object seeded from core fields at registration.
-- All personalization reads here (spec data model #2).
-- ---------------------------------------------------------------------------
create table public.user_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  survey_response_id uuid references public.survey_response (id),
  path text not null check (path in ('employee', 'solo', 'student')),
  track text,
  track_via text check (track_via in ('auto', 'user_choice', 'skip_default')),
  depth_flag text check (depth_flag in ('full_agent', 'browser_only')),
  -- Common-core contract snapshot (+ path-variant fields), keyed by core
  -- field names: task_hours, top_time_sink, ..., industry, company_size, ...
  core jsonb not null default '{}'::jsonb,
  org_code text,
  consented_at timestamptz not null,
  consent_version text not null,
  marketing_consent boolean not null default false
);

alter table public.user_profile enable row level security;

create policy user_profile_select_own
  on public.user_profile for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_profile_insert_own
  on public.user_profile for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_profile_update_own
  on public.user_profile for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index user_profile_org_code_idx on public.user_profile (org_code)
  where org_code is not null;

-- ---------------------------------------------------------------------------
-- profile_event — append-only log (spec data model #3).
-- ---------------------------------------------------------------------------
create table public.profile_event (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  survey_response_id uuid references public.survey_response (id),
  type text not null,
  data jsonb not null default '{}'::jsonb
);

alter table public.profile_event enable row level security;

-- Append-only: anonymous events carry no user_id; signed-in events may only
-- be written as oneself. No update/delete policies.
create policy profile_event_insert
  on public.profile_event for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy profile_event_select_own
  on public.profile_event for select
  to authenticated
  using (user_id = auth.uid());

create index profile_event_user_idx on public.profile_event (user_id, created_at);

-- ---------------------------------------------------------------------------
-- waitlist — solopreneur / student stub email capture (bundled consent:
-- launch notification + newsletter, per product decision on open question #5).
-- ---------------------------------------------------------------------------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null check (path in ('solo', 'student')),
  email text not null,
  answers jsonb not null default '{}'::jsonb,
  newsletter_consent boolean not null default false,
  consent_version text
);

alter table public.waitlist enable row level security;

create policy waitlist_insert
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

create unique index waitlist_path_email_idx
  on public.waitlist (path, lower(email));
