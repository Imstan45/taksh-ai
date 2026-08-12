begin;

-- Older Taksh databases used college_id and only stored a department name.
-- Bring that table up to the schema expected by the admin and faculty modules.
alter table public.departments
  add column if not exists institution_id uuid references public.institutions(id) on delete restrict,
  add column if not exists code text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'departments' and column_name = 'college_id'
  ) then
    update public.departments
    set institution_id = college_id
    where institution_id is null and college_id is not null;
  end if;
end $$;

update public.departments
set code = upper(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g')) || '-' || left(id::text, 8)
where code is null or btrim(code) = '';

alter table public.departments alter column code set not null;

create unique index if not exists departments_institution_code_unique
  on public.departments(institution_id, code);

insert into public.schema_migrations(version, description)
values ('202608110001', 'Repair legacy departments for centralized admin and faculty access')
on conflict (version) do update
set description = excluded.description, installed_at = now();

commit;
