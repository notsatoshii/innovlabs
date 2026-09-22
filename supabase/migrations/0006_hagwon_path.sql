-- ---------------------------------------------------------------------------
-- 0006: 학원 (hagwon) path. docs/product/hagwon_survey_schema_v0.2.md.
-- A fourth fork door with its own survey; scoring is stored in
-- survey_response.scoring (jsonb, kind = 'hagwon'). No new tables.
-- ---------------------------------------------------------------------------
alter table public.survey_response drop constraint survey_response_path_check;
alter table public.survey_response
  add constraint survey_response_path_check
  check (path in ('employee', 'solo', 'student', 'hagwon'));

alter table public.user_profile drop constraint user_profile_path_check;
alter table public.user_profile
  add constraint user_profile_path_check
  check (path in ('employee', 'solo', 'student', 'hagwon'));
