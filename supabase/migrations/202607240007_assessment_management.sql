begin;
alter table public.assessments add column if not exists randomize_questions boolean not null default false;
create index if not exists assessment_attempt_results_idx on public.assessment_attempts(assessment_id,status,submitted_at desc);
insert into public.schema_migrations(version,description) values('202607240007','Assessment management, randomization, and results indexes') on conflict(version) do nothing;
commit;
