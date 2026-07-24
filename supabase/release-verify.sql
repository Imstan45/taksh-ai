\set ON_ERROR_STOP on
do $$
declare missing text;
begin
  select string_agg(name,', ') into missing from unnest(array[
    'institutions','user_roles','departments','academic_years','academic_batches','cohorts',
    'user_academic_memberships','faculty_assignments','students','student_profiles','courses',
    'taksh_content_assets','institution_course_access','student_course_assignments',
    'student_content_progress','student_xp_ledger','student_streaks','question_bank','assessments',
    'assessment_questions','assessment_assignments','assessment_attempts','assessment_responses',
    'faculty_feedback','invitations','audit_logs'
  ]) name where to_regclass('public.'||name) is null;
  if missing is not null then raise exception 'Missing required tables: %',missing; end if;

  select string_agg(item,', ') into missing from (values
    ('institutions.status'),('user_roles.account_status'),('user_roles.institution_id'),
    ('academic_batches.academic_year_id'),('user_academic_memberships.roll_number'),
    ('assessments.pass_percentage'),('assessments.randomize_questions'),
    ('assessment_attempts.passed'),('assessment_attempts.time_used_seconds'),
    ('invitations.token_hash'),('invitations.expires_at')
  ) expected(item) where not exists(
    select 1 from information_schema.columns c
    where c.table_schema='public' and c.table_name=split_part(item,'.',1) and c.column_name=split_part(item,'.',2));
  if missing is not null then raise exception 'Missing required columns: %',missing; end if;

  select string_agg(name,', ') into missing from unnest(array[
    'invitations_pending_email_role_unique','assessment_one_open_attempt',
    'assessment_assignment_student_unique','memberships_roll_number_unique',
    'user_roles_directory_idx','assignments_batch_active_idx',
    'institutions_slug_upsert_unique','institution_course_access_upsert_unique',
    'student_course_assignments_upsert_unique'
  ]) name where to_regclass('public.'||name) is null;
  if missing is not null then raise exception 'Missing required indexes: %',missing; end if;

  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in('user_roles','departments','academic_batches','student_course_assignments',
    'student_content_progress','assessments','assessment_attempts','assessment_responses','invitations','audit_logs')
    and not c.relrowsecurity) then raise exception 'RLS is disabled on one or more tenant tables'; end if;

  if to_regprocedure('public.current_user_role()') is null or to_regprocedure('public.current_institution_id()') is null
    or to_regprocedure('public.is_super_admin()') is null or to_regprocedure('public.verify_taksh_schema()') is null
    then raise exception 'Required authorization or verification function is missing'; end if;

  if not exists(select 1 from pg_trigger where tgname='memberships_institution_guard' and not tgisinternal)
    or not exists(select 1 from pg_trigger where tgname='faculty_assignments_institution_guard' and not tgisinternal)
    then raise exception 'Required tenant relationship trigger is missing'; end if;

  if exists(select 1 from generate_series(1,9) n where not exists(
    select 1 from public.schema_migrations where version='20260724000'||n))
    then raise exception 'One or more ordered migrations 001-008 are not recorded'; end if;
end $$;
select 'Taksh release schema verified' as result,now() as verified_at;
