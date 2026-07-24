create table if not exists public.content_factory_settings (
  id boolean primary key default true check (id),
  default_model text not null default 'gemini-3.6-flash',
  default_teaching_style text not null default 'Concept-first and practical',
  default_difficulty text not null default 'Intermediate',
  default_language text not null default 'English',
  default_content_depth text not null default 'Detailed',
  default_batch_size integer not null default 5 check (default_batch_size between 1 and 25),
  auto_save_drafts boolean not null default true,
  require_manual_approval boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.content_factory_settings (id) values (true) on conflict (id) do nothing;
alter table public.content_factory_settings enable row level security;
revoke all on public.content_factory_settings from anon, authenticated;
create index if not exists content_factory_settings_updated_idx on public.content_factory_settings(updated_at desc);
