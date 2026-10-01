-- ---------------------------------------------------------------------------
-- 0009: hardening (docs/app/reviews/2026-10-01-app-review.md, P1-1 to P1-5).
--
-- APPLY ORDER: deploy the code FIRST (or in the same sitting), then apply
-- this file. After it runs, the browser can no longer insert user_profile
-- rows, inquiry rows, or any event type outside the allowlist below. The code
-- that goes with it:
--   POST /api/register          writes user_profile + registered/consent events
--   POST /api/inquiry           writes inquiry with the service role
--   POST /api/inquiry/consult   writes inquiry + consult_requested
-- A build from before those routes keeps working against the OLD policies and
-- breaks against these, so never apply this file ahead of the deploy.
-- SUPABASE_SECRET_KEY must be set on the server, or those routes answer 503.
--
-- Run with scripts/db.ts --file (one transaction), or paste into the SQL
-- editor. Every CHECK is added NOT VALID: it binds all new rows immediately
-- and never fails on rows that already exist (survey_response rows cannot be
-- corrected anyway, rule 2). Section 7 lists the optional VALIDATE commands.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. user_profile: the server writes the row (P1-3).
--    POST /api/register reads the immutable survey_response row with the
--    service role and builds the profile from it. The learner keeps SELECT on
--    their own row and UPDATE on the four identity columns (0004).
-- ---------------------------------------------------------------------------
drop policy if exists user_profile_insert_own on public.user_profile;

-- Revoking the table privilege also removes the column-level INSERT grants
-- that 0004 handed to `authenticated`. `anon` never had a policy, but
-- Supabase's default grants left it the table privilege.
revoke insert on public.user_profile from authenticated, anon;

-- A track is one of the six in src/lib/survey/types.ts (TrackId), or null on
-- the 학원 path.
alter table public.user_profile
  add constraint user_profile_track_check
  check (track is null or track in (
    'docs_admin', 'research_planning', 'data_numbers',
    'sales_customer', 'content_marketing', 'management_coordination'
  )) not valid;

-- One survey response seeds at most one profile, so a response id cannot be
-- registered by several accounts (it would count several times in an org
-- aggregate). The route checks this too; the index is the backstop. If QA
-- rows already share a response the index is skipped with a warning instead
-- of failing the whole migration: clean the rows up and run the CREATE again.
do $$
begin
  if exists (
    select 1 from public.user_profile
    where survey_response_id is not null
    group by survey_response_id
    having count(*) > 1
  ) then
    raise warning '0009: user_profile has duplicate survey_response_id values; unique index NOT created';
  else
    create unique index if not exists user_profile_survey_response_uidx
      on public.user_profile (survey_response_id)
      where survey_response_id is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. profile_event: allowlist of client-written event types (P1-4, P1-1).
--    0005 blocked three types and allowed every other one, including the
--    artifact events Phase 2 snapshots are built from. Now the browser may
--    write only the types listed here; everything else needs the service
--    role (server routes after requireLearner / requireStaff).
--
--    Mirror in src/lib/profile/events.ts (keep the two lists equal):
--
--      export const CLIENT_WRITTEN_EVENTS: ReadonlySet<EventType> = new Set<EventType>([
--        EVENT_TYPES.fork_selected,          // anon + authenticated
--        EVENT_TYPES.survey_completed,       // anon + authenticated
--        EVENT_TYPES.track_assigned,         // anon + authenticated
--        EVENT_TYPES.stub_completed,         // anon + authenticated
--        EVENT_TYPES.track_overridden,       // authenticated only
--        EVENT_TYPES.profile_updated,        // authenticated only
--        EVENT_TYPES.course_waitlist_joined, // authenticated only
--      ]);
--
--    Server-written from now on (service role): registered, consent_given
--    (POST /api/register), consult_requested (POST /api/inquiry/consult),
--    plus every Phase 2 and staff type as before.
--
--    one_pager_generated is written by /api/one-pager with the service role,
--    so it is not client-writable.
--
--    The staff branch of the 0005 policy is gone: every staff write already
--    goes through /api/staff/* with the service role.
--    Client payloads are capped at 4,000 bytes; the largest real one is a
--    few hundred. Service-role payloads (Work Map snapshots) are not capped.
-- ---------------------------------------------------------------------------
drop policy if exists profile_event_insert on public.profile_event;
drop policy if exists profile_event_insert_anon on public.profile_event;
drop policy if exists profile_event_insert_authenticated on public.profile_event;

create policy profile_event_insert_anon
  on public.profile_event for insert
  to anon
  with check (
    user_id is null
    and visibility = 'learner'
    and type in ('fork_selected', 'survey_completed', 'track_assigned', 'stub_completed')
    and octet_length(data::text) <= 4000
  );

create policy profile_event_insert_authenticated
  on public.profile_event for insert
  to authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and visibility = 'learner'
    and type in (
      'fork_selected', 'survey_completed', 'track_assigned', 'stub_completed',
      'track_overridden', 'profile_updated', 'course_waitlist_joined'
    )
    and octet_length(data::text) <= 4000
  );

-- ---------------------------------------------------------------------------
-- 3. staff_role(): a confirmed address, read from auth.users (P1-5).
--    Before: whoever's JWT carried a matching email string was staff, even if
--    the address had never been confirmed. Now the function looks the caller
--    up in auth.users by id and requires email_confirmed_at. Once a staff row
--    is bound to a user id (staff.user_id), only that account matches it: a
--    different account that later acquires the same address gets nothing.
-- ---------------------------------------------------------------------------
alter table public.staff
  add column if not exists user_id uuid unique references auth.users (id) on delete cascade;

create or replace function public.staff_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select s.role
  from public.staff s
  join auth.users u on u.id = auth.uid()
  where u.email_confirmed_at is not null
    and (
      s.user_id = u.id
      or (s.user_id is null and s.email = lower(u.email))
    )
  -- a row bound to this account wins over an unbound email match
  order by (s.user_id is not null) desc
  limit 1
$$;

-- CREATE OR REPLACE keeps the 0004 grants; repeated so the file stands alone.
revoke execute on function public.staff_role() from public, anon;
grant execute on function public.staff_role() to authenticated;

-- Bind every staff row whose confirmed account already exists. Run this one
-- statement again after a new staff member's first sign-in.
update public.staff s
set user_id = u.id
from auth.users u
where s.user_id is null
  and s.email = lower(u.email)
  and u.email_confirmed_at is not null;

-- ---------------------------------------------------------------------------
-- 4. inquiry: service role only (P1-2). The public key could insert here
--    directly, so the route's origin check and rate limit could be skipped.
-- ---------------------------------------------------------------------------
drop policy if exists inquiry_insert on public.inquiry;
revoke insert on public.inquiry from anon, authenticated;

alter table public.inquiry
  add constraint inquiry_size_check
  check (
    char_length(name) <= 120
    and char_length(company) <= 160
    and (role is null or char_length(role) <= 120)
    and char_length(email) <= 200
    and (team_size is null or char_length(team_size) <= 40)
    and (message is null or char_length(message) <= 4000)
    and char_length(source) <= 40
    and (user_agent is null or char_length(user_agent) <= 300)
  ) not valid;

-- ---------------------------------------------------------------------------
-- 5. survey_response: still an anonymous insert (rule 3: the gate comes after
--    the survey), now with a ceiling per row (P1-1). A real employee response
--    is 2 to 4 KB; 32 KB leaves room for long free-text answers. Insert-only
--    as before: no update or delete path is added.
-- ---------------------------------------------------------------------------
alter table public.survey_response
  add constraint survey_response_size_check
  check (
    jsonb_typeof(answers) = 'object'
    and octet_length(answers::text) <= 32768
    and (scoring is null or (
      jsonb_typeof(scoring) = 'object' and octet_length(scoring::text) <= 16384
    ))
    and char_length(schema_version) <= 20
    and (org_code is null or char_length(org_code) <= 64)
  ) not valid;

-- ---------------------------------------------------------------------------
-- 6. waitlist: same idea for the stub paths (P1-1).
-- ---------------------------------------------------------------------------
alter table public.waitlist
  add constraint waitlist_size_check
  check (
    char_length(email) <= 254
    and jsonb_typeof(answers) = 'object'
    and octet_length(answers::text) <= 4096
    and (consent_version is null or char_length(consent_version) <= 40)
  ) not valid;

-- ---------------------------------------------------------------------------
-- 7. Optional, after looking at the existing rows (each fails if an old row
--    breaks the rule; that is information, not damage):
--
--   alter table public.user_profile    validate constraint user_profile_track_check;
--   alter table public.inquiry         validate constraint inquiry_size_check;
--   alter table public.survey_response validate constraint survey_response_size_check;
--   alter table public.waitlist        validate constraint waitlist_size_check;
--
--    Checks to run once the database is reachable again:
--
--   select public.staff_role();  -- as Eric's session: 'admin'; as a learner: null
--   select polname, polcmd, polroles::regrole[] from pg_policy
--     where polrelid in ('public.profile_event'::regclass, 'public.inquiry'::regclass,
--                        'public.user_profile'::regclass);
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name in ('user_profile', 'inquiry')
--       and grantee in ('anon', 'authenticated');
-- ---------------------------------------------------------------------------
