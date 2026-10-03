-- ---------------------------------------------------------------------------
-- 0011: App Phase 2c (docs/app/phases/phase-2c.md, C8).
--   1. harness_template: the SP-HL-01 to 03 templates (D1). Text lives in the
--      database, seeded from the private drafts by
--      scripts/seed-harness-templates.ts; it is never in this repo.
--   2. One countersign per baseline (unique index).
--   3. lock_baseline() and countersign_baseline(): the baseline lock and the
--      countersign as one transaction each (plan review 2, the lock/countersign
--      race). Service role only.
--   4. cohort_week_signals(): one aggregate row per learner for the staff
--      roster's Week 2 and Week 3 columns (security invoker, staff RLS).
--
-- No user_profile column is added: the confirmed track (D2) is the newest
-- track_confirmed event, read as an event (plan review 2).
--
-- APPLY ORDER: apply BEFORE deploying the 2c build. The baseline and
-- countersign routes call the functions in section 3 and answer 503 without
-- them; nothing in the 2b build uses anything here.
--
-- Run with scripts/db.ts --file (one transaction). Then seed the templates:
--   HARNESS_TEMPLATE_DIR=<private drafts folder> npx tsx scripts/seed-harness-templates.ts
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. harness_template (D1).
--    Readers: staff, and learners with an active enrollment. A free sign-up
--    who never joined a cohort reads nothing, so the template text is not
--    public just because sign-up is. Writers: the seed script (service role).
--    `parts` has the HarnessSavedPayload parts shape:
--      { role, context, format, rules: text[], example, fallbacks }
-- ---------------------------------------------------------------------------
create table if not exists public.harness_template (
  id text primary key check (id ~ '^SP-HL-[0-9]{2}$'),
  name text not null check (char_length(name) between 1 and 60),
  doc_type text not null check (char_length(doc_type) between 1 and 60),
  parts jsonb not null check (jsonb_typeof(parts) = 'object'),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.harness_template enable row level security;

drop policy if exists harness_template_select on public.harness_template;
create policy harness_template_select
  on public.harness_template for select
  to authenticated
  using (
    public.staff_role() is not null
    or exists (
      select 1 from public.enrollment e
      where e.user_id = (select auth.uid()) and e.status = 'active'
    )
  );

-- Supabase's default privileges grant ALL on a new table to anon and
-- authenticated (0010 note). Keep only what the policy above uses.
revoke all on public.harness_template from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.harness_template from authenticated;

-- ---------------------------------------------------------------------------
-- 2. One countersign per baseline. Keyed on the baseline_locked event the
--    countersign names, not on the learner, so a later backoffice reopen
--    (D3, out of scope) can countersign a new baseline without a migration.
--    countersign_baseline() below already serialises on the profile row; this
--    is the backstop for any other writer.
-- ---------------------------------------------------------------------------
create unique index if not exists profile_event_countersign_uidx
  on public.profile_event (user_id, (data->>'baseline_event_id'))
  where type = 'baseline_countersigned' and user_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Baseline lock and countersign.
--    Both take a row lock on the learner's user_profile row first, so a lock
--    and a countersign for the same learner never interleave:
--      - a lock after a countersign is refused ('frozen'), never written;
--      - a countersign names the baseline_locked event the instructor saw and
--        is refused ('stale') when the learner has locked again since;
--      - a second countersign of the same baseline returns the first one
--        ('already') and writes nothing.
--    The countersigned baseline is the baseline_locked event that
--    baseline_countersigned.data.baseline_event_id names, never "the latest
--    baseline_locked".
--    Callers: POST /api/artifacts/baseline and
--    POST /api/staff/learner/[userId]/countersign, with the service role,
--    after requireLearner / requireStaff and the payload checks in
--    src/components/lab/rules-week3.ts. The functions trust their arguments,
--    so nobody but the service role may execute them.
-- ---------------------------------------------------------------------------
create or replace function public.lock_baseline(p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_at timestamptz;
begin
  if p_user is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'lock_baseline: bad arguments';
  end if;

  perform 1 from public.user_profile where user_id = p_user for update;
  if not found then
    return jsonb_build_object('status', 'no_profile');
  end if;

  if exists (
    select 1 from public.profile_event
    where user_id = p_user and type = 'baseline_countersigned'
  ) then
    return jsonb_build_object('status', 'frozen');
  end if;

  insert into public.profile_event (user_id, type, visibility, data)
  values (p_user, 'baseline_locked', 'learner', p_payload)
  returning id, created_at into v_id, v_at;

  update public.user_profile
    set baseline = p_payload || jsonb_build_object('locked_event_id', v_id)
    where user_id = p_user;

  return jsonb_build_object('status', 'ok', 'event_id', v_id, 'locked_at', v_at);
end;
$$;

revoke execute on function public.lock_baseline(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.lock_baseline(uuid, jsonb) to service_role;

create or replace function public.countersign_baseline(
  p_user uuid,
  p_baseline_event_id bigint,
  p_by_user uuid,
  p_by_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest bigint;
  v_id bigint;
  v_at timestamptz;
begin
  if p_user is null or p_baseline_event_id is null or p_by_user is null
     or p_by_role is null or p_by_role not in ('admin', 'instructor') then
    raise exception 'countersign_baseline: bad arguments';
  end if;
  if p_by_user = p_user then
    return jsonb_build_object('status', 'self');
  end if;

  perform 1 from public.user_profile where user_id = p_user for update;
  if not found then
    return jsonb_build_object('status', 'no_profile');
  end if;

  select id into v_latest
    from public.profile_event
    where user_id = p_user and type = 'baseline_locked'
    order by id desc
    limit 1;
  if v_latest is null then
    return jsonb_build_object('status', 'no_baseline');
  end if;

  select id, created_at into v_id, v_at
    from public.profile_event
    where user_id = p_user
      and type = 'baseline_countersigned'
      and data->>'baseline_event_id' = v_latest::text
    limit 1;
  if v_id is not null then
    return jsonb_build_object('status', 'already', 'event_id', v_id,
      'countersigned_at', v_at, 'baseline_event_id', v_latest);
  end if;

  if v_latest <> p_baseline_event_id then
    return jsonb_build_object('status', 'stale', 'latest_event_id', v_latest);
  end if;

  begin
    insert into public.profile_event (user_id, type, visibility, data)
    values (
      p_user, 'baseline_countersigned', 'learner',
      jsonb_build_object('version', 1, 'baseline_event_id', v_latest,
        'by_user_id', p_by_user, 'by_role', p_by_role)
    )
    returning id, created_at into v_id, v_at;
  exception when unique_violation then
    select id, created_at into v_id, v_at
      from public.profile_event
      where user_id = p_user
        and type = 'baseline_countersigned'
        and data->>'baseline_event_id' = v_latest::text
      limit 1;
    return jsonb_build_object('status', 'already', 'event_id', v_id,
      'countersigned_at', v_at, 'baseline_event_id', v_latest);
  end;

  update public.user_profile
    set baseline = baseline || jsonb_build_object(
      'countersigned_at', v_at,
      'countersigned_by', jsonb_build_object('user_id', p_by_user, 'role', p_by_role),
      'countersign_event_id', v_id)
    where user_id = p_user
      and baseline->>'locked_event_id' = v_latest::text;

  return jsonb_build_object('status', 'ok', 'event_id', v_id,
    'countersigned_at', v_at, 'baseline_event_id', v_latest);
end;
$$;

revoke execute on function public.countersign_baseline(uuid, bigint, uuid, text) from public, anon, authenticated;
grant execute on function public.countersign_baseline(uuid, bigint, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. cohort_week_signals(cohort): the "signals to record" of Weeks 2 and 3,
--    one row per active learner, so the roster never pulls event rows to
--    count them (PostgREST caps a response at max_rows without an error).
--    SECURITY INVOKER: profile_event and enrollment RLS apply to the caller,
--    and the staff_role() filter returns nothing to anyone else.
--    Week 2: harnesses saved and their document types, corrections logged.
--    Week 3: newest workspace check, blueprint count, newest dry run, newest
--    baseline and whether it is countersigned, newest confirmed track.
-- ---------------------------------------------------------------------------
create or replace function public.cohort_week_signals(p_cohort uuid)
returns table (
  user_id uuid,
  harness_count int,
  harness_doc_types text[],
  correction_count int,
  workspace_at timestamptz,
  assistant text,
  workspace_ready boolean,
  uploads_blocked boolean,
  blueprint_count int,
  dry_run_minutes int,
  dry_run_at timestamptz,
  baseline_event_id bigint,
  baseline_locked_at timestamptz,
  countersigned_at timestamptz,
  confirmed_track text,
  track_confirmed_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.user_id,
    (select count(distinct pe.data->>'harness_id')::int
       from public.profile_event pe
       where pe.user_id = e.user_id and pe.type = 'harness_saved'),
    (select coalesce(array_agg(h.doc_type order by h.first_at), '{}')
       from (
         select distinct on (pe.data->>'harness_id')
           pe.data->>'doc_type' as doc_type,
           min(pe.created_at) over (partition by pe.data->>'harness_id') as first_at
         from public.profile_event pe
         where pe.user_id = e.user_id and pe.type = 'harness_saved'
         order by pe.data->>'harness_id', (pe.data->'harness_version') desc
       ) h),
    (select count(*)::int
       from public.profile_event pe
       where pe.user_id = e.user_id and pe.type = 'correction_logged'),
    ws.created_at,
    ws.data->>'assistant',
    (ws.data->>'instructions_set')::boolean and (ws.data->>'test_followed')::boolean,
    (ws.data->>'uploads_blocked')::boolean,
    (select count(*)::int
       from public.profile_event pe
       where pe.user_id = e.user_id and pe.type = 'blueprint_submitted'),
    round(extract(epoch from (
      (dr.data->>'ended_at')::timestamptz - (dr.data->>'started_at')::timestamptz
    )) / 60)::int,
    dr.created_at,
    bl.id,
    bl.created_at,
    cs.created_at,
    tc.data->>'track',
    tc.created_at
  from public.enrollment e
  left join lateral (
    select pe.created_at, pe.data from public.profile_event pe
    where pe.user_id = e.user_id and pe.type = 'workspace_setup'
    order by pe.id desc limit 1
  ) ws on true
  left join lateral (
    select pe.created_at, pe.data from public.profile_event pe
    where pe.user_id = e.user_id and pe.type = 'time_log_entry'
      and pe.data ? 'dry_run'
    order by pe.id desc limit 1
  ) dr on true
  left join lateral (
    select pe.id, pe.created_at from public.profile_event pe
    where pe.user_id = e.user_id and pe.type = 'baseline_locked'
    order by pe.id desc limit 1
  ) bl on true
  left join lateral (
    select pe.created_at from public.profile_event pe
    where pe.user_id = e.user_id and pe.type = 'baseline_countersigned'
      and pe.data->>'baseline_event_id' = bl.id::text
    limit 1
  ) cs on true
  left join lateral (
    select pe.created_at, pe.data from public.profile_event pe
    where pe.user_id = e.user_id and pe.type = 'track_confirmed'
    order by pe.id desc limit 1
  ) tc on true
  where e.cohort_id = p_cohort
    and e.status = 'active'
    and public.staff_role() is not null
$$;

revoke execute on function public.cohort_week_signals(uuid) from public, anon;
grant execute on function public.cohort_week_signals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Checks to run after applying (and the RLS proofs, process.md step 4):
--
--   select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
--     from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'harness_template'
--       and grantee in ('anon', 'authenticated') group by 1, 2;
--   -- expected: authenticated SELECT only; anon no row.
--
--   select p.proname, r.rolname, has_function_privilege(r.oid, p.oid, 'execute')
--     from pg_proc p cross join pg_roles r
--     where p.proname in ('lock_baseline', 'countersign_baseline', 'cohort_week_signals')
--       and r.rolname in ('anon', 'authenticated', 'service_role') order by 1, 2;
--   -- expected: lock_baseline and countersign_baseline true for service_role
--   -- only; cohort_week_signals true for authenticated and service_role.
--
--   select indexdef from pg_indexes where indexname = 'profile_event_countersign_uidx';
--
--   RLS proofs (scripts/checks/week3-labs.mjs): anon reads 0 templates; a
--   registered learner who is not enrolled reads 0; an enrolled learner
--   reads 3; a learner insert or update on harness_template is refused;
--   POST /rest/v1/rpc/lock_baseline and /rpc/countersign_baseline with a
--   learner JWT and with a staff JWT are refused; cohort_week_signals with a
--   learner JWT returns 0 rows.
-- ---------------------------------------------------------------------------
