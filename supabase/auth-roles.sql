-- Taksh AI role and institution migration. Safe to run more than once.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role' and typnamespace = 'public'::regnamespace) then
    create type public.app_role as enum ('STUDENT', 'FACULTY', 'COLLEGE_ADMIN', 'SUPER_ADMIN');
  end if;
end $$;

alter type public.app_role add value if not exists 'FACULTY' after 'STUDENT';

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'STUDENT',
  institution_id uuid references public.institutions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles add column if not exists institution_id uuid references public.institutions(id) on delete set null;
alter table public.user_roles enable row level security;
alter table public.institutions enable row level security;

revoke insert, update, delete on public.user_roles from anon, authenticated;
revoke insert, update, delete on public.institutions from anon, authenticated;
grant select on public.user_roles to authenticated;
grant select on public.institutions to authenticated;

drop policy if exists "Users can read their own role" on public.user_roles;
create policy "Users can read their own role"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their institution" on public.institutions;
create policy "Users can read their institution"
on public.institutions for select to authenticated
using (
  id in (
    select institution_id from public.user_roles
    where user_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'SUPER_ADMIN'
  )
);

create or replace function public.assign_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'STUDENT'::public.app_role)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists assign_role_after_signup on auth.users;
create trigger assign_role_after_signup
after insert on auth.users
for each row execute function public.assign_default_user_role();

insert into public.user_roles (user_id, role)
select id, 'STUDENT'::public.app_role from auth.users
on conflict (user_id) do nothing;

update public.user_roles
set role = 'SUPER_ADMIN'::public.app_role,
    institution_id = null,
    updated_at = now()
where user_id = (
  select id from auth.users
  where lower(email) = lower('surya.bijumalla@gmail.com')
  limit 1
);

notify pgrst, 'reload schema';

select u.email, r.role, i.name as institution
from auth.users u
join public.user_roles r on r.user_id = u.id
left join public.institutions i on i.id = r.institution_id
where lower(u.email) = lower('surya.bijumalla@gmail.com');
