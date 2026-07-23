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
