-- Phase 3: cache the generated one-pager on the profile (generated once,
-- served from here afterwards).
alter table public.user_profile
  add column one_pager jsonb,
  add column one_pager_generated_at timestamptz;
