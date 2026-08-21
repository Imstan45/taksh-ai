begin;
create table if not exists public.diagnostic_questions(
 id text primary key,question_text text not null,category text not null check(category in('logical_reasoning','quantitative_aptitude','english_verbal','database_technical')),
 subcategory text not null,difficulty numeric(2,1) not null check(difficulty between 9.0 and 9.5),option_a text not null,option_b text not null,option_c text not null,option_d text not null,
 correct_answer char(1) not null check(correct_answer in('A','B','C','D')),explanation text not null,estimated_time_seconds integer not null check(estimated_time_seconds between 30 and 180),active boolean not null default true,created_at timestamptz not null default now()
);
create table if not exists public.diagnostic_attempts(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references auth.users(id) on delete cascade,assessment_id text not null default 'taksh-skill-diagnostic-v1',question_ids text[] not null,
 option_orders jsonb not null default '{}',answers jsonb not null default '{}',started_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '10 minutes'),submitted_at timestamptz,
 time_taken_seconds integer,score integer,category_scores jsonb,status text not null check(status in('NOT_STARTED','IN_PROGRESS','COMPLETED','TIME_EXPIRED')) default 'IN_PROGRESS',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists diagnostic_one_active_attempt on public.diagnostic_attempts(student_id,assessment_id) where status in('NOT_STARTED','IN_PROGRESS');
create index if not exists diagnostic_attempts_student_history on public.diagnostic_attempts(student_id,created_at desc);
create index if not exists diagnostic_questions_category_active on public.diagnostic_questions(category,active);
alter table public.diagnostic_questions enable row level security;alter table public.diagnostic_attempts enable row level security;
revoke all on public.diagnostic_questions from anon,authenticated;revoke all on public.diagnostic_attempts from anon;grant select on public.diagnostic_attempts to authenticated;
create policy diagnostic_attempts_own_read on public.diagnostic_attempts for select to authenticated using((select auth.uid())=student_id or public.is_super_admin());
commit;
