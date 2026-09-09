-- ---------------------------------------------------------------------------
-- 0005: profile_event insert policies split by role.
--
-- Why: Postgres checks EXECUTE on every function in a policy expression when
-- the expression is initialised, not when a CASE branch runs. The single
-- 0004 policy referenced staff_role(), which anon may not execute, so every
-- anonymous survey event was refused (RLS proof #9 on 2026-09-10). Also the
-- 0004 policy required user_id = auth.uid() for all rows, which stopped staff
-- from writing notes, enrollments, and countersigns about a learner.
--
-- anon:          pre-gate events only (no user_id, learner visibility, never
--                a staff-written type)
-- authenticated: own learner events under the same type rule, or anything at
--                all when the writer has a staff role
-- ---------------------------------------------------------------------------
drop policy if exists profile_event_insert on public.profile_event;

create policy profile_event_insert_anon
  on public.profile_event for insert
  to anon
  with check (
    user_id is null
    and visibility = 'learner'
    and type not in ('enrolled', 'baseline_countersigned', 'instructor_note')
  );

create policy profile_event_insert_authenticated
  on public.profile_event for insert
  to authenticated
  with check (
    (
      (user_id is null or user_id = auth.uid())
      and visibility = 'learner'
      and type not in ('enrolled', 'baseline_countersigned', 'instructor_note')
    )
    or public.staff_role() is not null
  );
