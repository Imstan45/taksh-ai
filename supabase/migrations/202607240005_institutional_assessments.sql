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
