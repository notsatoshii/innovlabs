-- ---------------------------------------------------------------------------
-- 0004: app Phase 1 (docs/app/phases/phase-1.md §5).
-- Profile identity + derived columns, staff table, event visibility,
-- resource library tables. Applied manually in the Supabase SQL editor.
--
-- Access model (Eric, 2026-09-09): staff (admin, instructor) read every
-- learner's profile and every event. Learners never read each other. The only
-- thing hidden from a learner is an instructor's note about them.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- user_profile: identity fields (learner-editable) and derived snapshots
-- (service-role only; Phase 2 server functions rebuild them from events).
-- ---------------------------------------------------------------------------
alter table public.user_profile
  add column display_name text,
  add column company_name text,
  add column job_title text,
  add column work_map jsonb,
  add column learning jsonb,
  add column baseline jsonb;

-- Column-level grants: learners may update only their identity fields and
-- the marketing toggle. Everything else (track, core, derived snapshots,
-- consent record) is untouchable from the client, regardless of RLS.
revoke update on public.user_profile from authenticated;
grant update (display_name, company_name, job_title, marketing_consent, updated_at)
  on public.user_profile to authenticated;

-- Same idea at INSERT time: the seed row a learner writes at registration
-- may carry the survey snapshot and identity fields, never the derived
-- columns or the one-pager cache (service role only, see supabaseAdmin()).
revoke insert on public.user_profile from authenticated;
grant insert (user_id, survey_response_id, path, track, track_via, depth_flag,
              core, org_code, consented_at, consent_version, marketing_consent,
              display_name, company_name, job_title)
  on public.user_profile to authenticated;

-- Keep updated_at honest without trusting the client.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger user_profile_set_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- staff: who may read learner data. Keyed by email so a row can exist before
-- the person has ever signed in. RLS on, no policies: only the service role
-- and the SQL editor touch it. Placeholder row per Eric (2026-09-09); Ted's
-- row is added when the emails are confirmed.
-- ---------------------------------------------------------------------------
create table public.staff (
  email text primary key,
  role text not null check (role in ('admin', 'instructor')),
  added_at timestamptz not null default now()
);

alter table public.staff enable row level security;

insert into public.staff (email, role) values ('eric@diiant.com', 'admin');

-- Role of the signed-in user, or null. Security definer so it can read
-- `staff` from inside policies; stable so the planner evaluates it once.
create or replace function public.staff_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.staff
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Supabase grants EXECUTE to anon/authenticated/service_role by default;
-- revoke the anonymous path explicitly (the insert policy below never calls
-- it for anon rows, so nothing anonymous breaks).
revoke execute on function public.staff_role() from public, anon;
grant execute on function public.staff_role() to authenticated;

create policy user_profile_select_staff
  on public.user_profile for select
  to authenticated
  using (public.staff_role() is not null);

-- ---------------------------------------------------------------------------
-- profile_event: visibility. 'learner' rows are the learner's own artifacts
-- and progress (staff read them too); 'staff' rows are instructor notes and
-- other staff-only entries the learner must not see. Still append-only.
-- ---------------------------------------------------------------------------
alter table public.profile_event
  add column visibility text not null default 'learner'
  check (visibility in ('learner', 'staff'));

drop policy profile_event_select_own on public.profile_event;
create policy profile_event_select_own
  on public.profile_event for select
  to authenticated
  using (user_id = auth.uid() and visibility = 'learner');

create policy profile_event_select_staff
  on public.profile_event for select
  to authenticated
  using (public.staff_role() is not null);

-- Learners may still append their own learner-visibility events (and anon
-- rows before the gate). Only staff may write staff-visibility rows or the
-- event types that record a staff action (mirrored in
-- src/lib/profile/events.ts STAFF_WRITTEN_EVENTS), so a learner cannot forge
-- a countersign or an enrollment that Phase 2 snapshots would trust.
-- CASE keeps staff_role() out of the anonymous path (no short-circuit
-- guarantee in SQL), so anon survey events never touch the function.
drop policy profile_event_insert on public.profile_event;
create policy profile_event_insert
  on public.profile_event for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and case
      when visibility = 'learner'
        and type not in ('enrolled', 'baseline_countersigned', 'instructor_note')
      then true
      else public.staff_role() is not null
    end
  );

-- ---------------------------------------------------------------------------
-- Resource library (docs/curriculum/innovlabs-resource-library-v0.1.md §0.2,
-- v0.3 Part 8). Read-only for signed-in users; writes come from the seed
-- script with the service role. Text columns hold Korean copy.
-- ---------------------------------------------------------------------------
create table public.tools (
  id text primary key,
  name text not null,
  url text,
  category text not null,
  tags text[] not null default '{}',
  difficulty smallint not null check (difficulty between 1 and 4),
  status text not null check (status in ('taught', 'mentioned', 'reference', 'draft')),
  paths text[] not null default '{}',   -- 'browser', 'agent'
  tracks text[] not null default '{}',  -- DOC RES DAT SAL CON MGT SMB; empty = all
  license text,
  cost text,
  what_it_is text not null,
  use_it_to text,
  why_it_matters text,
  watch_out text,
  korean_notes text,
  stars integer,
  stars_dated date,
  last_verified date,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint tools_published_have_url check (status = 'draft' or url is not null)
);

alter table public.tools enable row level security;

create policy tools_select_published
  on public.tools for select
  to authenticated
  using (status <> 'draft');

create index tools_category_idx on public.tools (category);
create index tools_difficulty_idx on public.tools (difficulty);

create table public.glossary (
  id text primary key,
  term text not null,
  loanword text,
  analogy text not null,
  meaning text not null,
  sort_order integer not null default 0
);

alter table public.glossary enable row level security;

create policy glossary_select
  on public.glossary for select
  to authenticated
  using (true);
