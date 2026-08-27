begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text,
  requester_email text not null,
  requester_role text not null check (requester_role in ('STUDENT','FACULTY','COLLEGE_ADMIN','SUPER_ADMIN')),
  category text not null check (category in ('account','payment','course','assessment','institution','technical','other')),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 3000),
  status text not null default 'open' check (status in ('open','resolved')),
  email_notified boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_created_idx on public.support_tickets(user_id,created_at desc);
create index if not exists support_tickets_status_created_idx on public.support_tickets(status,created_at desc);

alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon, authenticated;

insert into public.schema_migrations(version,description)
values('202608270003','Lightweight support ticket inbox with email notification state')
on conflict(version) do nothing;

commit;
