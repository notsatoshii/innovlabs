-- ---------------------------------------------------------------------------
-- 0007: courses, cohorts, enrollment, lab drafts, evidence storage
-- (docs/app/phases/phase-2.md). Learners read only their own rows; staff read
-- everything; every write to cohort and enrollment goes through a server
-- route with the service role after a staff or code check.
-- ---------------------------------------------------------------------------

create table public.cohort (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null,
  track_code text not null check (track_code in ('DOC','RES','DAT','SAL','CON','MGT','SMB','SPINE')),
  starts_on date,
  schedule_note text,          -- e.g. "매주 화요일 19:00–21:00"
  venue text,
  org_code text,
  open_week smallint not null default 0 check (open_week between 0 and 12),
  status text not null default 'planned' check (status in ('planned','running','done')),
  created_by text,             -- staff email
  created_at timestamptz not null default now()
);

create table public.enrollment (
  cohort_id uuid not null references public.cohort (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active','dropped','completed')),
  enrolled_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create index enrollment_user_idx on public.enrollment (user_id);

alter table public.cohort enable row level security;
alter table public.enrollment enable row level security;

create policy enrollment_select_own
  on public.enrollment for select
  to authenticated
  using (user_id = auth.uid());

create policy enrollment_select_staff
  on public.enrollment for select
  to authenticated
  using (public.staff_role() is not null);

-- A learner sees the cohorts they are enrolled in; staff see all.
create policy cohort_select_enrolled
  on public.cohort for select
  to authenticated
  using (exists (
    select 1 from public.enrollment e
    where e.cohort_id = cohort.id and e.user_id = auth.uid()
  ));

create policy cohort_select_staff
  on public.cohort for select
  to authenticated
  using (public.staff_role() is not null);

-- ---------------------------------------------------------------------------
-- artifact_draft: server-side autosave for the labs (one row per learner and
-- artifact kind). The submitted, immutable version lives in profile_event.
-- ---------------------------------------------------------------------------
create table public.artifact_draft (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('work_map','drill','harness','blueprint','baseline')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.artifact_draft enable row level security;

create policy artifact_draft_own
  on public.artifact_draft for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy artifact_draft_select_staff
  on public.artifact_draft for select
  to authenticated
  using (public.staff_role() is not null);

-- ---------------------------------------------------------------------------
-- Evidence uploads (time log screenshots, before/after outputs). Private
-- bucket, one folder per learner: <user_id>/<file>. Images only, 5 MB.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy evidence_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy evidence_select_own
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy evidence_select_staff
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidence' and public.staff_role() is not null);
