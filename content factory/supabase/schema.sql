create extension if not exists pgcrypto;

create table if not exists public.taksh_curriculum (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  module text not null,
  topic text not null,
  subtopic text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(course, module, topic, subtopic)
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
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taksh_content_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.taksh_content_assets(id) on delete cascade,
  version_number integer not null,
  change_type text not null default 'edited',
  change_note text not null default '',
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique(asset_id, version_number)
);

create index if not exists taksh_assets_updated_idx on public.taksh_content_assets(updated_at desc);
create index if not exists taksh_assets_status_idx on public.taksh_content_assets(status);
create index if not exists taksh_assets_hierarchy_idx on public.taksh_content_assets(course, module, topic, subtopic);
create index if not exists taksh_versions_asset_idx on public.taksh_content_versions(asset_id, version_number desc);
create index if not exists taksh_curriculum_hierarchy_idx on public.taksh_curriculum(course, module, topic, subtopic);

alter table public.taksh_curriculum enable row level security;
alter table public.taksh_content_assets enable row level security;
alter table public.taksh_content_versions enable row level security;

drop policy if exists "Taksh admin can read assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can create assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can update assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can delete assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can read versions" on public.taksh_content_versions;
drop policy if exists "Taksh admin can create versions" on public.taksh_content_versions;
drop policy if exists "Taksh admin can read curriculum" on public.taksh_curriculum;
drop policy if exists "Taksh admin can manage curriculum" on public.taksh_curriculum;

create policy "Taksh admin can read curriculum" on public.taksh_curriculum for select to anon using (true);
create policy "Taksh admin can manage curriculum" on public.taksh_curriculum for all to anon using (true) with check (true);
create policy "Taksh admin can read assets" on public.taksh_content_assets for select to anon using (true);
create policy "Taksh admin can create assets" on public.taksh_content_assets for insert to anon with check (true);
create policy "Taksh admin can update assets" on public.taksh_content_assets for update to anon using (true) with check (true);
create policy "Taksh admin can delete assets" on public.taksh_content_assets for delete to anon using (true);
create policy "Taksh admin can read versions" on public.taksh_content_versions for select to anon using (true);
create policy "Taksh admin can create versions" on public.taksh_content_versions for insert to anon with check (true);

comment on table public.taksh_content_assets is 'Canonical Taksh AI teaching assets.';
comment on table public.taksh_content_versions is 'Immutable history for each teaching asset.';
comment on table public.taksh_curriculum is 'Fixed course, module, topic and subtopic hierarchy used by content generation.';

insert into public.taksh_curriculum (course, module, topic, subtopic, display_order)
values
  ('Logical Reasoning', 'Analytical Reasoning', 'Direction Sense', 'Distance and final direction', 1),
  ('Logical Reasoning', 'Analytical Reasoning', 'Direction Sense', 'Turns and orientation', 2),
  ('Logical Reasoning', 'Analytical Reasoning', 'Blood Relations', 'Family tree relationships', 3),
  ('Logical Reasoning', 'Arrangements and Puzzles', 'Linear Arrangement', 'Single-row arrangement', 4),
  ('English Proficiency', 'Grammar', 'Parts of Speech', 'Nouns and their types', 5),
  ('English Proficiency', 'Grammar', 'Subject–Verb Agreement', 'Agreement with compound subjects', 6),
  ('English Proficiency', 'Verbal Ability', 'Reading Comprehension', 'Facts and inferences', 7),
  ('English Proficiency', 'Vocabulary', 'Contextual Vocabulary', 'Meaning from context', 8)
on conflict (course, module, topic, subtopic) do nothing;
