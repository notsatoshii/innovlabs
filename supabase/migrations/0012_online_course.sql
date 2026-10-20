-- 0012: the online course (docs/app/phases/phase-online.md, sub-phase O1).
--
-- Four tables. Mission content is product text that lives in a private repo;
-- it reaches this database only through scripts/course/seed-content.ts with
-- the service role, so the public repo never holds it. Learner state is
-- written only by the /api/course routes with the service role after a
-- requireLearner() check; learners read their own rows. XP and badges are
-- append-only: no update or delete path exists for anyone but the service
-- role, and the routes never update them.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- One row per mission, the latest published version. `data` is a
-- MissionContent (src/lib/course/types.ts), validated by the seed script.
create table if not exists public.course_content (
  mission_id text primary key check (mission_id ~ '^(M|B|S)[0-9]{1,2}\.?[0-9A-Z]*$'),
  course text not null,                 -- 'spine0' | 'spine2' | track code
  level smallint not null check (level between 1 and 12),
  ord smallint not null,                -- order inside the level
  version integer not null check (version >= 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Where a learner is in each mission. `screen` is the index of the furthest
-- screen reached; `done_at` is set once, when the reward screen is reached.
-- `result` carries small mission results that later screens need (for the
-- skip test: 'passed' | 'failed').
create table if not exists public.course_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  screen smallint not null default 0 check (screen >= 0),
  done_at timestamptz,
  result text check (result is null or char_length(result) <= 40),
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

-- Every XP award, one row per scored item attempt. The amount is computed
-- by the server from the mission content; the client never sends a number.
-- `item` is unique per mission so a replayed request cannot pay twice.
create table if not exists public.course_xp (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  part text not null check (char_length(part) between 1 and 20),  -- beat label: 예측, 알기, 해보기, …
  item text not null check (char_length(item) between 1 and 80),  -- e.g. 's4.sort.c3#1'
  amount smallint not null check (amount between 0 and 500),
  correct boolean,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, item)
);
create index if not exists course_xp_user_idx on public.course_xp (user_id, mission_id, created_at);

-- Badges and cards. Each row names the mission (and so the artifact) that
-- earned it; there is no badge for watching or for time.
create table if not exists public.course_badge (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null check (badge_id ~ '^[a-z0-9_]{2,40}$'),
  mission_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
alter table public.course_content enable row level security;
alter table public.course_progress enable row level security;
alter table public.course_xp enable row level security;
alter table public.course_badge enable row level security;

drop policy if exists course_content_read on public.course_content;
create policy course_content_read
  on public.course_content for select
  to authenticated
  using (true);

drop policy if exists course_progress_own on public.course_progress;
create policy course_progress_own
  on public.course_progress for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists course_progress_staff on public.course_progress;
create policy course_progress_staff
  on public.course_progress for select
  to authenticated
  using (public.staff_role() is not null);

drop policy if exists course_xp_own on public.course_xp;
create policy course_xp_own
  on public.course_xp for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists course_xp_staff on public.course_xp;
create policy course_xp_staff
  on public.course_xp for select
  to authenticated
  using (public.staff_role() is not null);

drop policy if exists course_badge_own on public.course_badge;
create policy course_badge_own
  on public.course_badge for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists course_badge_staff on public.course_badge;
create policy course_badge_staff
  on public.course_badge for select
  to authenticated
  using (public.staff_role() is not null);

-- ---------------------------------------------------------------------------
-- 3. Privileges (the 0010 rule: every new table ends with its own revokes).
--    anon gets nothing; authenticated gets SELECT only (RLS decides which
--    rows); all writes are the service role's.
-- ---------------------------------------------------------------------------
revoke all on public.course_content, public.course_progress, public.course_xp, public.course_badge from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.course_content, public.course_progress, public.course_xp, public.course_badge from authenticated;
grant select on public.course_content, public.course_progress, public.course_xp, public.course_badge to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Post-apply checks (run by hand; expected results in the comments)
-- ---------------------------------------------------------------------------
-- select table_name, privilege_type, grantee from information_schema.role_table_grants
--  where table_name like 'course\_%' and grantee in ('anon','authenticated') order by 1,3,2;
--   -> only SELECT for authenticated, nothing for anon
-- select tablename, policyname from pg_policies where tablename like 'course\_%' order by 1,2;
--   -> 7 policies
