-- Taksh AI server-controlled authorization roles.
-- Run this entire file once in the Supabase SQL Editor.

create type public.app_role as enum (
  'STUDENT',
  'COLLEGE_ADMIN',
  'SUPER_ADMIN'
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'STUDENT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- A signed-in user may read only their own role. Role changes must be made
-- through the Supabase dashboard/SQL editor or a trusted service-role backend.
create policy "Users can read their own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.assign_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'STUDENT');
  return new;
end;
$$;

create trigger assign_role_after_signup
after insert on auth.users
for each row execute procedure public.assign_default_user_role();

-- Add roles for accounts that existed before this migration.
insert into public.user_roles (user_id, role)
select id, 'STUDENT'::public.app_role
from auth.users
on conflict (user_id) do nothing;

-- Bootstrap the requested Super Admin account.
update public.user_roles
set role = 'SUPER_ADMIN', updated_at = now()
where user_id = (
  select id
  from auth.users
  where lower(email) = lower('surya.bijumalla@gmail.com')
);
