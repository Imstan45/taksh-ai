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
