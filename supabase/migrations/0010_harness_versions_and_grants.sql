-- ---------------------------------------------------------------------------
-- 0010: harness version numbers that cannot repeat, and table privileges cut
-- down to what a policy actually uses.
--
-- APPLY ORDER: either order works with the Phase 2b build. The route retries
-- on the unique violation this index raises, and an older build that never
-- wrote harness events is not affected at all. The revokes in section 2 only
-- remove privileges that row-level security already refuses, so no working
-- request changes.
--
-- Run with scripts/db.ts --file (one transaction).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. profile_event: one row per (learner, harness, version).
--    POST /api/artifacts/harness numbers a save as "versions so far + 1".
--    Found in the 2b database test (2026-10-01): five saves sent at once came
--    back as versions 4, 4, 6, 6, 8, because count-then-insert is not atomic.
--    A double tap on the save button is enough to do it. With this index the
--    second insert fails with 23505 and the route counts again and retries.
--    The index also serves the route's two JSON-path counts (prior versions
--    of one harness; version 1 rows for the library cap).
--    Orphaned events (user deleted, user_id set null) are left out.
-- ---------------------------------------------------------------------------
create unique index if not exists profile_event_harness_version_uidx
  on public.profile_event (user_id, (data->>'harness_id'), (data->>'harness_version'))
  where type = 'harness_saved' and user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Privileges. Supabase grants ALL on every public table to `anon` and
--    `authenticated`; row-level security is what has been keeping them out.
--    That leaves TRUNCATE (which RLS does not cover) and a set of UPDATE and
--    DELETE privileges that no policy backs. PostgREST exposes no TRUNCATE, so
--    nothing here was reachable through the API; this removes the privilege
--    anyway so the tables do not depend on that.
--
--    Rule used: a role keeps a privilege on a table only if a policy for that
--    role and command exists (pg_policy, checked 2026-10-01):
--
--      survey_response  INSERT  anon, authenticated   (rule 2: insert-only)
--      profile_event    INSERT  anon, authenticated   (allowlist, 0009)
--                       SELECT  authenticated         (own; staff)
--      waitlist         INSERT  anon, authenticated
--      user_profile     SELECT  authenticated         (own; staff)
--                       UPDATE  authenticated         (own row, the identity
--                               columns granted column-by-column in 0004)
--      artifact_draft   ALL     authenticated         (own row)
--      cohort, enrollment, glossary, tools   SELECT   authenticated
--      inquiry, staff   no policy: service role only
--
--    The service role is not touched: every server route keeps working.
--    SELECT grants are left as they are (no policy means no rows).
--    A new table in a later migration gets the same defaults from Supabase,
--    so each migration that creates one should end with its own revokes.
-- ---------------------------------------------------------------------------

-- Nothing in the app truncates, adds foreign keys to, or puts triggers on
-- these tables as an API role.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Rule 2: survey responses are insert-only; the event log is append-only.
revoke update, delete on public.survey_response from anon, authenticated;
revoke update, delete on public.profile_event   from anon, authenticated;
revoke update, delete on public.waitlist        from anon, authenticated;

-- user_profile: the server writes and deletes rows. `authenticated` keeps its
-- column-level UPDATE on the identity columns (0004); `anon` had a table-level
-- UPDATE with no policy behind it. Revoking the table privilege also removes
-- anon's column-level grants. INSERT was revoked in 0009.
revoke delete on public.user_profile from anon, authenticated;
revoke update on public.user_profile from anon;

-- Read-only for learners; written by /api/staff/* and seed scripts with the
-- service role.
revoke insert, update, delete on public.cohort     from anon, authenticated;
revoke insert, update, delete on public.enrollment from anon, authenticated;
revoke insert, update, delete on public.glossary   from anon, authenticated;
revoke insert, update, delete on public.tools      from anon, authenticated;

-- Service role only.
revoke insert, update, delete on public.staff   from anon, authenticated;
revoke update, delete         on public.inquiry from anon, authenticated;

-- artifact_draft: a signed-in learner owns one row per kind (policy FOR ALL).
-- Signed-out visitors have no policy.
revoke insert, update, delete on public.artifact_draft from anon;

-- ---------------------------------------------------------------------------
-- 3. Checks to run after applying:
--
--   select indexdef from pg_indexes where indexname = 'profile_event_harness_version_uidx';
--   select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
--     from information_schema.role_table_grants
--     where table_schema = 'public' and grantee in ('anon', 'authenticated')
--     group by 1, 2 order by 1, 2;
--   -- expected: no TRUNCATE, REFERENCES or TRIGGER anywhere; survey_response,
--   -- profile_event and waitlist show INSERT,SELECT; artifact_draft shows
--   -- DELETE,INSERT,SELECT,UPDATE for authenticated and SELECT for anon;
--   -- everything else SELECT only (user_profile keeps authenticated's
--   -- column-level UPDATE, visible in information_schema.column_privileges).
-- ---------------------------------------------------------------------------
