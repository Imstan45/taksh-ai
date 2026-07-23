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
