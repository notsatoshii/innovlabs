-- ---------------------------------------------------------------------------
-- 0008: one-pager generation guard (review 2026-10-01: P0-4, P2-11, P0-2).
-- NOT APPLIED YET. Apply manually in the Supabase SQL editor once the project
-- is restored. Until it is applied, POST /api/one-pager still serves cached
-- current-version reports and answers 503 (generation_unavailable) for
-- everything else: it never calls the model without these columns.
--
-- What it adds
--   one_pager_attempts       how many generations this profile has started.
--                            The route refuses to start a fourth (MAX_ATTEMPTS
--                            in src/lib/onepager/claim.ts).
--   one_pager_generating_at  set while a generation is running, cleared when
--                            it ends. A value older than five minutes is
--                            treated as abandoned.
--
-- How the claim is atomic (src/lib/onepager/claim.ts): the route reads
-- one_pager_attempts = n, then runs a single
--   update user_profile
--      set one_pager_attempts = n + 1, one_pager_generating_at = now
--    where user_id = $1 and one_pager_attempts = n
-- Two concurrent requests both read n; the second UPDATE waits on the row
-- lock, re-checks the WHERE clause against the committed row, matches nothing,
-- and that request waits for the first one's report instead of generating.
--
-- Who can write these columns: the service role only. Migration 0004 revoked
-- table-level UPDATE and INSERT from `authenticated` and granted them back
-- column by column; these two columns are in neither list (0009 removes the
-- client INSERT path entirely). A learner can read their own counter through
-- the existing select policy, which is harmless.
-- ---------------------------------------------------------------------------

alter table public.user_profile
  add column if not exists one_pager_attempts integer not null default 0,
  add column if not exists one_pager_generating_at timestamptz;

alter table public.user_profile
  drop constraint if exists user_profile_one_pager_attempts_check;
alter table public.user_profile
  add constraint user_profile_one_pager_attempts_check
  check (one_pager_attempts >= 0);

-- ---------------------------------------------------------------------------
-- Clear reports generated from the placeholder four-week fact sheets (P0-2).
-- Current reports carry "v": 2 (src/lib/onepager/types.ts). The app already
-- ignores anything older, so this only removes the stale text from the table;
-- the report is regenerated on the learner's next visit. Attempts start at 0
-- for every profile, so each learner gets the full three.
-- ---------------------------------------------------------------------------
update public.user_profile
   set one_pager = null,
       one_pager_generated_at = null
 where one_pager is not null
   and coalesce(one_pager ->> 'v', '') <> '2';

-- ---------------------------------------------------------------------------
-- Staff operations (run by hand when a learner writes in after the limit):
--
--   -- give one learner three fresh attempts
--   update public.user_profile
--      set one_pager_attempts = 0, one_pager_generating_at = null
--    where user_id = '<uuid>';
--
--   -- force one learner's report to regenerate on their next visit
--   update public.user_profile
--      set one_pager = null, one_pager_generated_at = null,
--          one_pager_attempts = 0, one_pager_generating_at = null
--    where user_id = '<uuid>';
--
-- Verify after applying:
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'user_profile'
--      and column_name like 'one_pager%';
--   -- expect no row: `authenticated` must not be able to write the guard
--   select privilege_type, column_name
--     from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'user_profile'
--      and grantee = 'authenticated' and privilege_type in ('UPDATE', 'INSERT')
--      and column_name like 'one_pager%';
-- ---------------------------------------------------------------------------
