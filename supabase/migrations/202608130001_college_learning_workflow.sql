begin;

create table if not exists public.aptitude_assessment_sessions (
  id uuid primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > started_at)
);
create index if not exists aptitude_sessions_student_open_idx
  on public.aptitude_assessment_sessions(student_id,expires_at) where submitted_at is null;

create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  faculty_id uuid not null references auth.users(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  batch_id uuid references public.academic_batches(id) on delete restrict,
  student_id uuid references auth.users(id) on delete cascade,
  course text not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  activity_type text not null check (activity_type in ('homework','classwork','assignment')),
  due_at timestamptz,
  max_marks numeric(8,2) not null default 100 check (max_marks > 0),
  allow_resubmission boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (batch_id is not null or student_id is not null)
);

create table if not exists public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  text_content text not null default '',
  file_url text,
  file_key text,
  file_name text,
  status text not null default 'pending' check (status in ('pending','submitted','late','graded','returned')),
  submitted_at timestamptz,
  marks numeric(8,2),
  grade text,
  feedback text,
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  ai_suggested_score numeric(8,2),
  ai_feedback text,
  ai_evaluation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id,student_id),
  check (marks is null or marks >= 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists learning_activities_student_due_idx
  on public.learning_activities(institution_id,status,due_at);
create index if not exists learning_activities_faculty_idx
  on public.learning_activities(faculty_id,status,created_at desc);
create index if not exists activity_submissions_activity_status_idx
  on public.activity_submissions(activity_id,status,submitted_at desc);
create index if not exists activity_submissions_student_idx
  on public.activity_submissions(student_id,status,updated_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id,created_at desc) where read_at is null;

create or replace function public.validate_learning_activity_scope()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.department_id is not null and not exists(select 1 from public.departments where id=new.department_id and institution_id=new.institution_id) then
    raise exception 'Activity department belongs to another institution';
  end if;
  if new.batch_id is not null and not exists(select 1 from public.academic_batches where id=new.batch_id and institution_id=new.institution_id) then
    raise exception 'Activity batch belongs to another institution';
  end if;
  if not exists(select 1 from public.user_roles where user_id=new.faculty_id and institution_id=new.institution_id and role='FACULTY' and account_status='active') then
    raise exception 'Activity faculty is not active in this institution';
  end if;
  if new.student_id is not null and not exists(select 1 from public.user_roles where user_id=new.student_id and institution_id=new.institution_id and role='STUDENT' and account_status='active') then
    raise exception 'Activity student is not active in this institution';
  end if;
  return new;
end $$;
create trigger learning_activities_scope_guard before insert or update on public.learning_activities
for each row execute function public.validate_learning_activity_scope();

create or replace function public.validate_activity_submission()
returns trigger language plpgsql set search_path=public as $$
declare target public.learning_activities%rowtype;
begin
  select * into target from public.learning_activities where id=new.activity_id;
  if target.id is null then raise exception 'Activity not found'; end if;
  if new.marks is not null and new.marks>target.max_marks then raise exception 'Marks exceed activity maximum'; end if;
  if target.student_id is distinct from new.student_id and not exists(
    select 1 from public.user_academic_memberships where user_id=new.student_id and batch_id=target.batch_id and membership_type='STUDENT' and active
  ) then raise exception 'Student is outside the activity target'; end if;
  return new;
end $$;
create trigger activity_submissions_scope_guard before insert or update on public.activity_submissions
for each row execute function public.validate_activity_submission();

alter table public.aptitude_assessment_sessions enable row level security;
alter table public.learning_activities enable row level security;
alter table public.activity_submissions enable row level security;
alter table public.notifications enable row level security;
revoke all on public.aptitude_assessment_sessions,public.learning_activities,public.activity_submissions,public.notifications from anon;
grant select on public.aptitude_assessment_sessions,public.learning_activities,public.activity_submissions,public.notifications to authenticated;

create policy aptitude_sessions_own_read on public.aptitude_assessment_sessions
for select to authenticated using (student_id=(select auth.uid()) or (select public.is_super_admin()));

create policy learning_activities_scoped_read on public.learning_activities
for select to authenticated using (
  (select public.is_super_admin())
  or (institution_id=(select public.current_institution_id()) and (select public.current_user_role())='COLLEGE_ADMIN')
  or faculty_id=(select auth.uid())
  or (
    status='published' and (
      student_id=(select auth.uid()) or batch_id in (
        select membership.batch_id from public.user_academic_memberships membership
        where membership.user_id=(select auth.uid()) and membership.active
      )
    )
  )
);

create policy activity_submissions_scoped_read on public.activity_submissions
for select to authenticated using (
  student_id=(select auth.uid())
  or (select public.is_super_admin())
  or exists (
    select 1 from public.learning_activities activity
    where activity.id=activity_submissions.activity_id and (
      activity.faculty_id=(select auth.uid())
      or (activity.institution_id=(select public.current_institution_id()) and (select public.current_user_role())='COLLEGE_ADMIN')
    )
  )
);

create policy notifications_own_read on public.notifications
for select to authenticated using (user_id=(select auth.uid()) or (select public.is_super_admin()));

create or replace function public.verify_taksh_schema()
returns table(check_name text, ok boolean, details text)
language sql security definer set search_path = '' as $$
  with required(name) as (
    select unnest(array[
      'institutions','user_roles','departments','academic_years','semesters','academic_batches','cohorts',
      'user_academic_memberships','faculty_assignments','students','student_profiles','courses',
      'course_modules','course_topics','course_subtopics','taksh_content_assets',
      'taksh_content_versions','content_publication_history','institution_course_access',
      'student_course_assignments','student_content_progress','student_xp_ledger','student_streaks',
      'badges','student_badge_awards','question_bank','assessments','assessment_assignments',
      'assessment_attempts','assessment_responses','aptitude_assessment_sessions','faculty_feedback',
      'learning_activities','activity_submissions','notifications','invitations','audit_logs'
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

insert into public.schema_migrations(version,description)
values('202608130001','College learning activities, submissions, grading, notifications, and single-use aptitude sessions')
on conflict(version) do nothing;

commit;
notify pgrst, 'reload schema';
