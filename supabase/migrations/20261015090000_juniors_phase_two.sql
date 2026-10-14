begin;

create table if not exists public.juniors_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_exam text check (selected_exam in ('jee-main','tg-eapcet','ap-eapcet')),
  daily_goal_lessons smallint not null default 1 check (daily_goal_lessons between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.juniors_curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.juniors_lessons (
  id uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.juniors_curriculum_versions(id) on delete restrict,
  subject text not null check (subject in ('mathematics','physics','chemistry')),
  chapter_slug text not null,
  lesson_slug text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(curriculum_version_id, lesson_slug)
);

create table if not exists public.juniors_learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_slug text not null,
  status text not null default 'started' check (status in ('started','completed')),
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_slug)
);

create index if not exists juniors_progress_user_updated_idx on public.juniors_learning_progress(user_id, updated_at desc);
create index if not exists juniors_lessons_browse_idx on public.juniors_lessons(subject, chapter_slug, display_order) where status='published';

alter table public.juniors_profiles enable row level security;
alter table public.juniors_curriculum_versions enable row level security;
alter table public.juniors_lessons enable row level security;
alter table public.juniors_learning_progress enable row level security;

create policy "juniors profiles owner select" on public.juniors_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "juniors profiles owner insert" on public.juniors_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy "juniors profiles owner update" on public.juniors_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "published juniors versions readable" on public.juniors_curriculum_versions for select to authenticated using (status='published');
create policy "published juniors lessons readable" on public.juniors_lessons for select to authenticated using (status='published');
create policy "juniors progress owner select" on public.juniors_learning_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "juniors progress owner insert" on public.juniors_learning_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "juniors progress owner update" on public.juniors_learning_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

revoke all on public.juniors_profiles, public.juniors_curriculum_versions, public.juniors_lessons, public.juniors_learning_progress from anon;
grant select,insert,update on public.juniors_profiles to authenticated;
grant select on public.juniors_curriculum_versions, public.juniors_lessons to authenticated;
grant select,insert,update on public.juniors_learning_progress to authenticated;

insert into public.juniors_curriculum_versions(version,title,status,published_at) values('1.0','MPC representative curriculum','published',now()) on conflict(version) do update set title=excluded.title,status='published',published_at=coalesce(juniors_curriculum_versions.published_at,now());

insert into public.juniors_lessons(curriculum_version_id,subject,chapter_slug,lesson_slug,title,content,status,display_order)
select id,'mathematics','algebra','quadratic-roots','Reading quadratic roots','{"origin":"taksh_original","review_status":"representative"}'::jsonb,'published',10 from public.juniors_curriculum_versions where version='1.0'
on conflict(curriculum_version_id,lesson_slug) do update set title=excluded.title,content=excluded.content,status=excluded.status;
insert into public.juniors_lessons(curriculum_version_id,subject,chapter_slug,lesson_slug,title,content,status,display_order)
select id,'physics','mechanics','newtons-second-law','Force changes motion','{"origin":"taksh_original","review_status":"representative"}'::jsonb,'published',10 from public.juniors_curriculum_versions where version='1.0'
on conflict(curriculum_version_id,lesson_slug) do update set title=excluded.title,content=excluded.content,status=excluded.status;
insert into public.juniors_lessons(curriculum_version_id,subject,chapter_slug,lesson_slug,title,content,status,display_order)
select id,'chemistry','physical-chemistry','mole-concept','The mole as a counting unit','{"origin":"taksh_original","review_status":"representative"}'::jsonb,'published',10 from public.juniors_curriculum_versions where version='1.0'
on conflict(curriculum_version_id,lesson_slug) do update set title=excluded.title,content=excluded.content,status=excluded.status;

commit;
