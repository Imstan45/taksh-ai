create extension if not exists pgcrypto;

alter table public.taksh_content_assets
  add column if not exists content_version integer not null default 1,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid;

create table if not exists public.student_course_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique(student_id, course)
);

create table if not exists public.student_content_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  module text not null,
  topic text not null,
  subtopic text not null,
  content_id uuid not null references public.taksh_content_assets(id) on delete cascade,
  content_version integer not null default 1,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  progress_percentage integer not null default 0 check (progress_percentage between 0 and 100),
  last_section text,
  started_at timestamptz,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, subtopic)
);

create table if not exists public.student_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  points integer not null check (points > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  unique(student_id, event_key)
);

create table if not exists public.student_streaks (
  student_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create index if not exists student_progress_student_idx on public.student_content_progress(student_id, last_viewed_at desc);
create index if not exists student_progress_course_idx on public.student_content_progress(student_id, course, status);
create index if not exists student_assignments_student_idx on public.student_course_assignments(student_id, active);
create index if not exists published_assets_idx on public.taksh_content_assets(status, course, module, topic, subtopic);

alter table public.student_course_assignments enable row level security;
alter table public.student_content_progress enable row level security;
alter table public.student_xp_ledger enable row level security;
alter table public.student_streaks enable row level security;
alter table public.taksh_content_assets enable row level security;
alter table public.taksh_curriculum enable row level security;

drop policy if exists "Students read own assignments" on public.student_course_assignments;
drop policy if exists "Students read own progress" on public.student_content_progress;
drop policy if exists "Students insert own progress" on public.student_content_progress;
drop policy if exists "Students update own progress" on public.student_content_progress;
drop policy if exists "Students read own XP" on public.student_xp_ledger;
drop policy if exists "Students read own streak" on public.student_streaks;
drop policy if exists "Students read published lessons" on public.taksh_content_assets;
drop policy if exists "Students read active curriculum" on public.taksh_curriculum;

create policy "Students read own assignments" on public.student_course_assignments for select to authenticated using (student_id = auth.uid());
create policy "Students read own progress" on public.student_content_progress for select to authenticated using (student_id = auth.uid());
create policy "Students insert own progress" on public.student_content_progress for insert to authenticated with check (student_id = auth.uid());
create policy "Students update own progress" on public.student_content_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Students read own XP" on public.student_xp_ledger for select to authenticated using (student_id = auth.uid());
create policy "Students read own streak" on public.student_streaks for select to authenticated using (student_id = auth.uid());
create policy "Students read published lessons" on public.taksh_content_assets for select to authenticated using (status = 'published');
create policy "Students read active curriculum" on public.taksh_curriculum for select to authenticated using (active = true);

-- The student app never exposes content tables directly. Its authenticated server
-- queries select only status='published'. Remove any broad anon SELECT policy from
-- taksh_content_assets before making the Content Factory public.

notify pgrst, 'reload schema';

-- Assign a course after replacing the example values:
-- insert into public.student_course_assignments (student_id, course)
-- values ('STUDENT_AUTH_USER_UUID', 'Logical Reasoning')
-- on conflict (student_id, course) do update set active = true;
