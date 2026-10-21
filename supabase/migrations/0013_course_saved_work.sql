-- 0013: the online course keeps the learner's pasted work and Level 2 sign-ups
-- (docs/app/phases/phase-online.md, "O1 follow-up 2026-10-21").
--
-- 1. course_local: what a mission screen holds between screens that used to
--    live only in the browser tab (sessionStorage), so closing the tab or
--    switching devices loses nothing: the assistant outputs pasted in B1's
--    two rounds, the branch picks that decide which screens show (the account
--    and material choice), and one flag (a checklist ticked out of order).
--    Nothing else. One row per learner and mission. Readable only by its
--    owner: there is no staff policy on purpose, because the rounds are the
--    learner's raw material. Written only by POST /api/course/local with the
--    service role after requireLearner(); the route validates every key
--    against the mission content. Removed with the account (on delete
--    cascade).
-- 2. course_interest: "tell me when Level N opens". One row per learner,
--    course and level; no XP. Learners read their own row; staff read all
--    rows (they send the notice). Written only by POST /api/course/interest.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.course_local (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null check (char_length(mission_id) between 1 and 12),
  -- {"1": "...", "2": "..."}: pasted assistant outputs by I11 round. The route
  -- caps each at 20,000 characters (60 KB in UTF-8 Korean).
  rounds jsonb not null default '{}'::jsonb
    check (jsonb_typeof(rounds) = 'object' and octet_length(rounds::text) <= 140000),
  -- {"s1b.account": "company", ...}: I7 picks without a right answer.
  choices jsonb not null default '{}'::jsonb
    check (jsonb_typeof(choices) = 'object' and octet_length(choices::text) <= 4000),
  slip boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create table if not exists public.course_interest (
  user_id uuid not null references auth.users (id) on delete cascade,
  course text not null check (char_length(course) between 1 and 12),
  level smallint not null check (level between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (user_id, course, level)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
alter table public.course_local enable row level security;
alter table public.course_interest enable row level security;

drop policy if exists course_local_own on public.course_local;
create policy course_local_own
  on public.course_local for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists course_interest_own on public.course_interest;
create policy course_interest_own
  on public.course_interest for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists course_interest_staff on public.course_interest;
create policy course_interest_staff
  on public.course_interest for select
  to authenticated
  using (public.staff_role() is not null);

-- ---------------------------------------------------------------------------
-- 3. Privileges (the 0010 rule): anon nothing; authenticated SELECT only (RLS
--    decides which rows); all writes are the service role's.
-- ---------------------------------------------------------------------------
revoke all on public.course_local, public.course_interest from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.course_local, public.course_interest from authenticated;
grant select on public.course_local, public.course_interest to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Post-apply checks (run by hand; expected results in the comments)
-- ---------------------------------------------------------------------------
-- select table_name, privilege_type, grantee from information_schema.role_table_grants
--  where table_name in ('course_local','course_interest') and grantee in ('anon','authenticated') order by 1,3,2;
--   -> only SELECT for authenticated, nothing for anon
-- select tablename, policyname from pg_policies where tablename in ('course_local','course_interest') order by 1,2;
--   -> 3 policies (course_local_own, course_interest_own, course_interest_staff)
