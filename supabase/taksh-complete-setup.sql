-- Taksh AI complete database setup
-- Includes legacy compatibility preflight plus ordered migrations 001 through 008.
-- Run in Supabase Dashboard > SQL Editor > New query.

-- ===== 202607240000_legacy_compatibility.sql =====
begin;

-- Older Taksh deployments may already contain tables with fewer columns.
-- Add canonical columns before the production baseline creates indexes/policies.
do $$
begin
  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs add column if not exists actor_id uuid references auth.users(id) on delete set null;
    alter table public.audit_logs add column if not exists institution_id uuid;
    alter table public.audit_logs add column if not exists action text not null default 'legacy.event';
    alter table public.audit_logs add column if not exists target_type text not null default 'legacy';
    alter table public.audit_logs add column if not exists target_id text not null default 'unknown';
    alter table public.audit_logs add column if not exists previous_values jsonb;
    alter table public.audit_logs add column if not exists new_values jsonb;
    alter table public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
    alter table public.audit_logs add column if not exists created_at timestamptz not null default now();
  end if;

  if to_regclass('public.institutions') is not null then
    alter table public.institutions add column if not exists status text not null default 'active';
    alter table public.institutions add column if not exists metadata jsonb not null default '{}'::jsonb;
    alter table public.institutions add column if not exists created_at timestamptz not null default now();
    alter table public.institutions add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;

-- Add the audit-log institution FK only after the canonical institutions table
-- exists. Migration 001 safely creates that table when it is absent.
commit;


-- ===== 202607240001_production_baseline.sql =====
begin;

create extension if not exists pgcrypto;

create table if not exists public.schema_migrations (
  version text primary key,
  description text not null,
  installed_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role' and typnamespace = 'public'::regnamespace) then
    create type public.app_role as enum ('STUDENT', 'FACULTY', 'COLLEGE_ADMIN', 'SUPER_ADMIN');
  end if;
end $$;

alter type public.app_role add value if not exists 'FACULTY' after 'STUDENT';

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.institutions add column if not exists status text not null default 'active';
alter table public.institutions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'STUDENT',
  institution_id uuid references public.institutions(id) on delete restrict,
  account_status text not null default 'active' check (account_status in ('invited', 'active', 'suspended', 'disabled')),
  authorization_version integer not null default 1 check (authorization_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles add column if not exists institution_id uuid references public.institutions(id) on delete restrict;
alter table public.user_roles add column if not exists account_status text not null default 'active';
alter table public.user_roles add column if not exists authorization_version integer not null default 1;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table if not exists public.academic_batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  name text not null,
  academic_year text not null,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name, academic_year)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid not null references public.academic_batches(id) on delete restrict,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, name)
);

create table if not exists public.user_academic_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  cohort_id uuid references public.cohorts(id) on delete restrict,
  membership_type text not null check (membership_type in ('STUDENT', 'FACULTY')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, institution_id, membership_type)
);

create table if not exists public.faculty_assignments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  cohort_id uuid references public.cohorts(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (faculty_id, institution_id, department_id, batch_id, cohort_id)
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  college text,
  branch text,
  year integer,
  cgpa numeric(4,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  learning_style text,
  aptitude_level text,
  english_level text,
  coding_level text,
  communication_level text,
  confidence_score integer not null default 0,
  career_goal text,
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists student_profiles_student_unique on public.student_profiles(student_id);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null,
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (course_id, title)
);

create table if not exists public.course_topics (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete restrict,
  title text not null,
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (module_id, title)
);

create table if not exists public.course_subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.course_topics(id) on delete restrict,
  title text not null,
  slug text not null unique,
  display_order integer not null check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (topic_id, title)
);

create table if not exists public.taksh_curriculum (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  module text not null,
  topic text not null,
  subtopic text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (course, module, topic, subtopic)
);

create table if not exists public.taksh_content_assets (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  module text not null,
  topic text not null,
  subtopic text not null,
  title text not null,
  slug text not null,
  difficulty text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  content jsonb not null,
  content_version integer not null default 1 check (content_version > 0),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.taksh_content_assets add column if not exists content_version integer not null default 1;
alter table public.taksh_content_assets add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.taksh_content_assets add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.taksh_content_assets add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.taksh_content_assets add column if not exists published_by uuid references auth.users(id) on delete set null;
alter table public.taksh_content_assets add column if not exists reviewed_at timestamptz;
alter table public.taksh_content_assets add column if not exists approved_at timestamptz;
alter table public.taksh_content_assets add column if not exists published_at timestamptz;

create table if not exists public.taksh_content_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.taksh_content_assets(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  change_type text not null default 'edited',
  change_note text not null default '',
  content jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (asset_id, version_number)
);

alter table public.taksh_content_versions add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.content_publication_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.taksh_content_assets(id) on delete restrict,
  version_number integer not null,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  change_summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.institution_course_access (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  course text not null,
  active boolean not null default true,
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, course)
);

create table if not exists public.student_course_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete restrict,
  course text not null,
  assigned_by uuid references auth.users(id) on delete set null,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  starts_at timestamptz,
  due_at timestamptz,
  revoked_at timestamptz,
  unique (student_id, course)
);

alter table public.student_course_assignments add column if not exists institution_id uuid references public.institutions(id) on delete restrict;
alter table public.student_course_assignments add column if not exists assigned_by uuid references auth.users(id) on delete set null;
alter table public.student_course_assignments add column if not exists batch_id uuid references public.academic_batches(id) on delete restrict;
alter table public.student_course_assignments add column if not exists starts_at timestamptz;
alter table public.student_course_assignments add column if not exists due_at timestamptz;
alter table public.student_course_assignments add column if not exists revoked_at timestamptz;

create table if not exists public.student_content_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  module text not null,
  topic text not null,
  subtopic text not null,
  content_id uuid not null references public.taksh_content_assets(id) on delete restrict,
  content_version integer not null default 1,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  progress_percentage integer not null default 0 check (progress_percentage between 0 and 100),
  last_section text,
  started_at timestamptz,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subtopic)
);

create table if not exists public.student_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  points integer not null check (points > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (student_id, event_key)
);

create table if not exists public.student_streaks (
  student_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.student_badge_awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete restrict,
  event_key text not null,
  awarded_at timestamptz not null default now(),
  unique (student_id, badge_id),
  unique (student_id, event_key)
);

create table if not exists public.question_topics (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete restrict,
  module text not null,
  subject text not null,
  topic_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete restrict,
  topic_id uuid not null references public.question_topics(id) on delete restrict,
  author_id uuid references auth.users(id) on delete set null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  question text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text not null,
  explanation text,
  time_limit integer not null default 60 check (time_limit > 0),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text not null default '',
  course text,
  module text,
  topic text,
  subtopic text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  duration_minutes integer not null check (duration_minutes > 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  available_from timestamptz,
  available_until timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete restrict,
  display_order integer not null check (display_order >= 0),
  points numeric(8,2) not null default 1 check (points > 0),
  unique (assessment_id, question_id),
  unique (assessment_id, display_order)
);

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  cohort_id uuid references public.cohorts(id) on delete restrict,
  student_id uuid references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  check (batch_id is not null or cohort_id is not null or student_id is not null)
);

create unique index if not exists assessment_assignment_student_unique
on public.assessment_assignments(assessment_id, student_id) where student_id is not null;

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  assignment_id uuid not null references public.assessment_assignments(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired', 'evaluated')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(10,2),
  max_score numeric(10,2),
  percentage numeric(5,2) check (percentage between 0 and 100),
  evaluation_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id, attempt_number)
);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete restrict,
  selected_answer text,
  is_correct boolean,
  points_awarded numeric(8,2),
  answered_at timestamptz,
  unique (attempt_id, question_id)
);

create table if not exists public.faculty_feedback (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  faculty_id uuid not null references auth.users(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete cascade,
  course text,
  topic text,
  assessment_attempt_id uuid references public.assessment_attempts(id) on delete set null,
  feedback_type text not null default 'general',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_role not null,
  institution_id uuid references public.institutions(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists invitations_pending_email_role_unique
on public.invitations(lower(email), role) where status = 'pending';

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  institution_id uuid references public.institutions(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  previous_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_institution_idx on public.audit_logs(institution_id, created_at desc);
create index if not exists user_roles_institution_idx on public.user_roles(institution_id, role, account_status);
create index if not exists memberships_scope_idx on public.user_academic_memberships(institution_id, batch_id, cohort_id, active);
create index if not exists faculty_assignments_scope_idx on public.faculty_assignments(faculty_id, institution_id, active);
create index if not exists content_assets_published_idx on public.taksh_content_assets(status, course, module, topic, subtopic);
create index if not exists progress_student_idx on public.student_content_progress(student_id, last_viewed_at desc);
create index if not exists attempts_student_idx on public.assessment_attempts(student_id, started_at desc);

create or replace function public.current_user_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.user_roles
  where user_id = auth.uid() and account_status = 'active'
$$;

create or replace function public.current_institution_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select institution_id from public.user_roles
  where user_id = auth.uid() and account_status = 'active'
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'SUPER_ADMIN', false)
$$;

create or replace function public.assign_default_user_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role, account_status)
  values (new.id, 'STUDENT'::public.app_role, 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists assign_role_after_signup on auth.users;
create trigger assign_role_after_signup after insert on auth.users
for each row execute function public.assign_default_user_role();

insert into public.user_roles (user_id, role, account_status)
select id, 'STUDENT'::public.app_role, 'active' from auth.users
on conflict (user_id) do nothing;

insert into public.badges (code, name, description, criteria)
values
  ('FIRST_LESSON', 'First Step', 'Completed the first lesson.', '{"completed_lessons":1}'),
  ('FIVE_LESSONS', 'Momentum', 'Completed five lessons.', '{"completed_lessons":5}'),
  ('SEVEN_DAY_STREAK', 'Consistent Learner', 'Maintained a seven-day streak.', '{"streak_days":7}')
on conflict (code) do update set name = excluded.name, description = excluded.description, criteria = excluded.criteria;

insert into public.schema_migrations (version, description)
values ('202607240001', 'Production baseline schema')
on conflict (version) do nothing;

commit;

notify pgrst, 'reload schema';


-- ===== 202607240002_tenant_security.sql =====
begin;

-- Remove legacy anonymous Content Factory permissions.
drop policy if exists "Taksh admin can read curriculum" on public.taksh_curriculum;
drop policy if exists "Taksh admin can manage curriculum" on public.taksh_curriculum;
drop policy if exists "Taksh admin can read assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can create assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can update assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can delete assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can read versions" on public.taksh_content_versions;
drop policy if exists "Taksh admin can create versions" on public.taksh_content_versions;

revoke all on public.taksh_curriculum from anon;
revoke all on public.taksh_content_assets from anon;
revoke all on public.taksh_content_versions from anon;
revoke all on public.content_publication_history from anon;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'institutions','user_roles','departments','academic_batches','cohorts',
    'user_academic_memberships','faculty_assignments','students','student_profiles',
    'courses','course_modules','course_topics','course_subtopics','taksh_curriculum',
    'taksh_content_assets','taksh_content_versions','content_publication_history',
    'institution_course_access','student_course_assignments','student_content_progress',
    'student_xp_ledger','student_streaks','badges','student_badge_awards',
    'question_topics','question_bank','assessments','assessment_questions',
    'assessment_assignments','assessment_attempts','assessment_responses',
    'faculty_feedback','invitations','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists institutions_scoped_read on public.institutions;
create policy institutions_scoped_read on public.institutions
for select to authenticated using (public.is_super_admin() or id = public.current_institution_id());

drop policy if exists departments_scoped_read on public.departments;
create policy departments_scoped_read on public.departments
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists batches_scoped_read on public.academic_batches;
create policy batches_scoped_read on public.academic_batches
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists cohorts_scoped_read on public.cohorts;
create policy cohorts_scoped_read on public.cohorts
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists memberships_scoped_read on public.user_academic_memberships;
create policy memberships_scoped_read on public.user_academic_memberships
for select to authenticated using (
  public.is_super_admin()
  or user_id = auth.uid()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists faculty_assignments_scoped_read on public.faculty_assignments;
create policy faculty_assignments_scoped_read on public.faculty_assignments
for select to authenticated using (
  public.is_super_admin()
  or faculty_id = auth.uid()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() = 'COLLEGE_ADMIN'
  )
);

drop policy if exists students_scoped_read on public.students;
create policy students_scoped_read on public.students
for select to authenticated using (
  id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.user_roles student_role
    where student_role.user_id = students.id
      and student_role.institution_id = public.current_institution_id()
      and public.current_user_role() = 'COLLEGE_ADMIN'
  )
  or exists (
    select 1
    from public.user_academic_memberships student_membership
    join public.faculty_assignments assignment
      on assignment.faculty_id = auth.uid()
     and assignment.institution_id = student_membership.institution_id
     and assignment.active
     and (
       assignment.batch_id is null or assignment.batch_id = student_membership.batch_id
     )
     and (
       assignment.cohort_id is null or assignment.cohort_id = student_membership.cohort_id
     )
    where student_membership.user_id = students.id
      and student_membership.active
  )
);

drop policy if exists profiles_scoped_read on public.student_profiles;
create policy profiles_scoped_read on public.student_profiles
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.user_roles student_role
    where student_role.user_id = student_profiles.student_id
      and student_role.institution_id = public.current_institution_id()
      and public.current_user_role() = 'COLLEGE_ADMIN'
  )
  or exists (
    select 1
    from public.user_academic_memberships student_membership
    join public.faculty_assignments assignment
      on assignment.faculty_id = auth.uid()
     and assignment.institution_id = student_membership.institution_id
     and assignment.active
     and (assignment.batch_id is null or assignment.batch_id = student_membership.batch_id)
     and (assignment.cohort_id is null or assignment.cohort_id = student_membership.cohort_id)
    where student_membership.user_id = student_profiles.student_id
      and student_membership.active
  )
);

drop policy if exists curriculum_authenticated_read on public.taksh_curriculum;
create policy curriculum_authenticated_read on public.taksh_curriculum
for select to authenticated using (active);

drop policy if exists assets_assigned_published_read on public.taksh_content_assets;
create policy assets_assigned_published_read on public.taksh_content_assets
for select to authenticated using (
  public.is_super_admin()
  or (
    status = 'published'
    and exists (
      select 1 from public.student_course_assignments assignment
      where assignment.student_id = auth.uid()
        and assignment.course = taksh_content_assets.course
        and assignment.active
        and assignment.revoked_at is null
        and (assignment.starts_at is null or assignment.starts_at <= now())
        and (assignment.due_at is null or assignment.due_at >= now())
    )
  )
  or (
    status in ('approved', 'published')
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and exists (
      select 1 from public.institution_course_access access
      where access.institution_id = public.current_institution_id()
        and access.course = taksh_content_assets.course
        and access.active
    )
  )
);

drop policy if exists content_versions_super_admin_read on public.taksh_content_versions;
create policy content_versions_super_admin_read on public.taksh_content_versions
for select to authenticated using (public.is_super_admin());

drop policy if exists publication_history_super_admin_read on public.content_publication_history;
create policy publication_history_super_admin_read on public.content_publication_history
for select to authenticated using (public.is_super_admin());

drop policy if exists course_access_scoped_read on public.institution_course_access;
create policy course_access_scoped_read on public.institution_course_access
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists assignments_scoped_read on public.student_course_assignments;
create policy assignments_scoped_read on public.student_course_assignments
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists progress_own_read on public.student_content_progress;
create policy progress_own_read on public.student_content_progress
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and exists (
      select 1 from public.user_roles student_role
      where student_role.user_id = student_content_progress.student_id
        and student_role.institution_id = public.current_institution_id()
    )
  )
);

drop policy if exists xp_own_read on public.student_xp_ledger;
create policy xp_own_read on public.student_xp_ledger
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists streak_own_read on public.student_streaks;
create policy streak_own_read on public.student_streaks
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists badge_catalog_read on public.badges;
create policy badge_catalog_read on public.badges for select to authenticated using (active);

drop policy if exists badge_awards_own_read on public.student_badge_awards;
create policy badge_awards_own_read on public.student_badge_awards
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists question_topics_staff_read on public.question_topics;
create policy question_topics_staff_read on public.question_topics
for select to authenticated using (
  public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and (institution_id is null or institution_id = public.current_institution_id())
  )
);

drop policy if exists question_bank_staff_read on public.question_bank;
create policy question_bank_staff_read on public.question_bank
for select to authenticated using (
  public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and (institution_id is null or institution_id = public.current_institution_id())
  )
);

drop policy if exists assessments_scoped_read on public.assessments;
create policy assessments_scoped_read on public.assessments
for select to authenticated using (
  public.is_super_admin()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
  or (
    status = 'published'
    and exists (
      select 1 from public.assessment_assignments assignment
      where assignment.assessment_id = assessments.id
        and assignment.active
        and (
          assignment.student_id = auth.uid()
          or assignment.batch_id in (
            select batch_id from public.user_academic_memberships
            where user_id = auth.uid() and active
          )
          or assignment.cohort_id in (
            select cohort_id from public.user_academic_memberships
            where user_id = auth.uid() and active
          )
        )
    )
  )
);

drop policy if exists attempts_scoped_read on public.assessment_attempts;
create policy attempts_scoped_read on public.assessment_attempts
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.assessments assessment
    where assessment.id = assessment_attempts.assessment_id
      and assessment.institution_id = public.current_institution_id()
      and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists responses_scoped_read on public.assessment_responses;
create policy responses_scoped_read on public.assessment_responses
for select to authenticated using (
  exists (
    select 1 from public.assessment_attempts attempt
    where attempt.id = assessment_responses.attempt_id
      and (
        attempt.student_id = auth.uid()
        or public.is_super_admin()
        or exists (
          select 1 from public.assessments assessment
          where assessment.id = attempt.assessment_id
            and assessment.institution_id = public.current_institution_id()
            and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
        )
      )
  )
);

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read on public.invitations
for select to authenticated using (
  public.is_super_admin()
  or (institution_id = public.current_institution_id() and public.current_user_role() = 'COLLEGE_ADMIN')
);

drop policy if exists audit_logs_scoped_read on public.audit_logs;
create policy audit_logs_scoped_read on public.audit_logs
for select to authenticated using (
  public.is_super_admin()
  or (institution_id = public.current_institution_id() and public.current_user_role() = 'COLLEGE_ADMIN')
);

insert into public.schema_migrations (version, description)
values ('202607240002', 'Tenant isolation and Content Factory RLS')
on conflict (version) do nothing;

commit;
notify pgrst, 'reload schema';


-- ===== 202607240003_operational_integrity.sql =====
begin;

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (institution_id, name)
);

alter table public.academic_batches add column if not exists academic_year_id uuid
  references public.academic_years(id) on delete restrict;
alter table public.invitations add column if not exists cohort_id uuid
  references public.cohorts(id) on delete restrict;
create index if not exists academic_years_institution_idx
  on public.academic_years(institution_id, status, starts_on desc);
create index if not exists invitations_scope_status_idx
  on public.invitations(institution_id, status, created_at desc);
create index if not exists assessment_assignments_scope_idx
  on public.assessment_assignments(institution_id, assessment_id, active);

create or replace function public.validate_institution_relationships()
returns trigger language plpgsql set search_path = public as $$
declare related_institution uuid;
begin
  if new.department_id is not null then
    select institution_id into related_institution from public.departments where id = new.department_id;
    if related_institution is distinct from new.institution_id then
      raise exception 'Department belongs to another institution';
    end if;
  end if;
  if new.batch_id is not null then
    select institution_id into related_institution from public.academic_batches where id = new.batch_id;
    if related_institution is distinct from new.institution_id then
      raise exception 'Batch belongs to another institution';
    end if;
  end if;
  if new.cohort_id is not null then
    select institution_id into related_institution from public.cohorts where id = new.cohort_id;
    if related_institution is distinct from new.institution_id then
      raise exception 'Cohort belongs to another institution';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists memberships_institution_guard on public.user_academic_memberships;
create trigger memberships_institution_guard before insert or update on public.user_academic_memberships
for each row execute function public.validate_institution_relationships();
drop trigger if exists faculty_assignments_institution_guard on public.faculty_assignments;
create trigger faculty_assignments_institution_guard before insert or update on public.faculty_assignments
for each row execute function public.validate_institution_relationships();
drop trigger if exists invitations_institution_guard on public.invitations;
create trigger invitations_institution_guard before insert or update on public.invitations
for each row execute function public.validate_institution_relationships();

create or replace function public.expire_invitations()
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update public.invitations set status = 'expired', updated_at = now()
  where status = 'pending' and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end $$;

alter table public.academic_years enable row level security;
revoke all on public.academic_years from anon;
grant select on public.academic_years to authenticated;
drop policy if exists academic_years_scoped_read on public.academic_years;
create policy academic_years_scoped_read on public.academic_years for select to authenticated using (
  public.is_super_admin() or institution_id = public.current_institution_id()
);

create or replace function public.verify_taksh_schema()
returns table(check_name text, ok boolean, details text)
language sql security definer set search_path = '' as $$
  with required(name) as (
    select unnest(array[
      'institutions','user_roles','departments','academic_years','academic_batches','cohorts',
      'user_academic_memberships','faculty_assignments','students','student_profiles','courses',
      'course_modules','course_topics','course_subtopics','taksh_content_assets',
      'taksh_content_versions','content_publication_history','institution_course_access',
      'student_course_assignments','student_content_progress','student_xp_ledger','student_streaks',
      'badges','student_badge_awards','question_bank','assessments','assessment_assignments',
      'assessment_attempts','assessment_responses','faculty_feedback','invitations','audit_logs'
    ])
  )
  select 'required_tables', count(*) = 0,
    case when count(*) = 0 then 'all present' else string_agg(name, ', ' order by name) end
  from required where to_regclass('public.' || name) is null
  union all
  select 'rls_enabled', count(*) = 0,
    case when count(*) = 0 then 'all enabled' else string_agg(name, ', ' order by name) end
  from required r
  where exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=r.name and not c.relrowsecurity)
$$;

insert into public.schema_migrations(version, description)
values ('202607240003', 'Operational integrity, academic years, tenant guards, and verification')
on conflict (version) do nothing;

commit;


-- ===== 202607240004_secure_aptitude_attempts.sql =====
begin;
create table if not exists public.aptitude_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  question_ids uuid[] not null,
  responses jsonb not null default '[]'::jsonb,
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0 and score <= max_score),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  started_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  time_used_seconds integer not null check (time_used_seconds >= 0),
  unique (student_id, submitted_at)
);
create index if not exists aptitude_attempts_student_idx on public.aptitude_assessment_attempts(student_id, submitted_at desc);
alter table public.aptitude_assessment_attempts enable row level security;
revoke all on public.aptitude_assessment_attempts from anon;
grant select on public.aptitude_assessment_attempts to authenticated;
create policy aptitude_attempts_own_read on public.aptitude_assessment_attempts
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());
insert into public.schema_migrations(version, description)
values ('202607240004', 'Secure persisted aptitude assessment attempts')
on conflict (version) do nothing;
commit;


-- ===== 202607240005_institutional_assessments.sql =====
begin;
alter table public.assessments add column if not exists instructions text not null default '';
alter table public.assessments add column if not exists pass_percentage numeric(5,2) not null default 60 check (pass_percentage between 0 and 100);
alter table public.assessment_attempts add column if not exists passed boolean;
alter table public.assessment_attempts add column if not exists time_used_seconds integer check (time_used_seconds is null or time_used_seconds >= 0);
alter table public.assessments drop constraint if exists assessments_status_check;
alter table public.assessments add constraint assessments_status_check check (status in ('draft','published','closed','archived'));
create unique index if not exists assessment_one_open_attempt
  on public.assessment_attempts(assessment_id,student_id) where status='in_progress';
create index if not exists assessment_availability_idx on public.assessments(institution_id,status,available_from,available_until);
insert into public.schema_migrations(version,description) values('202607240005','Institutional assessment lifecycle and attempt locking') on conflict(version) do nothing;
commit;


-- ===== 202607240006_student_operations.sql =====
begin;
alter table public.user_academic_memberships add column if not exists roll_number text;
create unique index if not exists memberships_roll_number_unique
  on public.user_academic_memberships(institution_id,lower(roll_number))
  where roll_number is not null and active;
create index if not exists memberships_student_directory_idx
  on public.user_academic_memberships(institution_id,membership_type,department_id,batch_id,active);
insert into public.schema_migrations(version,description)
values('202607240006','Student directory roll numbers and operational indexes')
on conflict(version) do nothing;
commit;


-- ===== 202607240007_assessment_management.sql =====
begin;
alter table public.assessments add column if not exists randomize_questions boolean not null default false;
create index if not exists assessment_attempt_results_idx on public.assessment_attempts(assessment_id,status,submitted_at desc);
insert into public.schema_migrations(version,description) values('202607240007','Assessment management, randomization, and results indexes') on conflict(version) do nothing;
commit;


-- ===== 202607240008_release_indexes.sql =====
begin;
create index if not exists user_roles_directory_idx on public.user_roles(institution_id,role,account_status,user_id);
create index if not exists invitations_expiry_idx on public.invitations(status,expires_at) where status='pending';
create index if not exists assignments_batch_active_idx on public.student_course_assignments(institution_id,batch_id,active);
create index if not exists progress_activity_idx on public.student_content_progress(student_id,last_viewed_at desc);
create index if not exists feedback_student_idx on public.faculty_feedback(student_id,created_at desc);
insert into public.schema_migrations(version,description) values('202607240008','August release directory, invitation, assignment, and activity indexes') on conflict(version) do nothing;
commit;


-- ===== RELEASE VERIFICATION =====
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
    'user_roles_directory_idx','assignments_batch_active_idx'
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

  if exists(select 1 from generate_series(1,8) n where not exists(
    select 1 from public.schema_migrations where version='20260724000'||n))
    then raise exception 'One or more ordered migrations 001-008 are not recorded'; end if;
end $$;
select 'Taksh release schema verified' as result,now() as verified_at;

