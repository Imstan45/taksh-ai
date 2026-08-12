begin;

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  sequence_number integer not null check (sequence_number > 0),
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on > starts_on),
  unique (academic_year_id, sequence_number),
  unique (academic_year_id, name)
);

alter table public.academic_batches
  add column if not exists semester_id uuid references public.semesters(id) on delete restrict;

alter table public.faculty_assignments
  add column if not exists course text;

create index if not exists semesters_institution_year_idx
  on public.semesters(institution_id, academic_year_id, status, sequence_number);
create index if not exists academic_batches_semester_idx
  on public.academic_batches(institution_id, semester_id, department_id, status);
create index if not exists faculty_assignments_teaching_scope_idx
  on public.faculty_assignments(institution_id, faculty_id, batch_id, course)
  where active;

create or replace function public.validate_semester_institution()
returns trigger language plpgsql set search_path = public as $$
declare year_institution uuid;
begin
  select institution_id into year_institution
  from public.academic_years
  where id = new.academic_year_id;

  if year_institution is distinct from new.institution_id then
    raise exception 'Academic year belongs to another institution';
  end if;
  return new;
end $$;

drop trigger if exists semesters_institution_guard on public.semesters;
create trigger semesters_institution_guard
before insert or update on public.semesters
for each row execute function public.validate_semester_institution();

create or replace function public.validate_batch_semester()
returns trigger language plpgsql set search_path = public as $$
declare semester_institution uuid;
declare semester_year uuid;
begin
  if new.semester_id is not null then
    select institution_id, academic_year_id
      into semester_institution, semester_year
    from public.semesters
    where id = new.semester_id;

    if semester_institution is distinct from new.institution_id then
      raise exception 'Semester belongs to another institution';
    end if;
    if new.academic_year_id is distinct from semester_year then
      raise exception 'Section or batch must use the semester academic year';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists academic_batches_semester_guard on public.academic_batches;
create trigger academic_batches_semester_guard
before insert or update on public.academic_batches
for each row execute function public.validate_batch_semester();

alter table public.semesters enable row level security;
revoke all on public.semesters from anon;
grant select on public.semesters to authenticated;

drop policy if exists semesters_scoped_read on public.semesters;
create policy semesters_scoped_read on public.semesters
for select to authenticated using (
  (select public.is_super_admin())
  or institution_id = (select public.current_institution_id())
);

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
values ('202608130000', 'Institutional semesters and faculty teaching scope')
on conflict (version) do nothing;

commit;
notify pgrst, 'reload schema';
