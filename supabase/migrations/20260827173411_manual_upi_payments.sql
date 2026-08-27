begin;

alter table public.payment_orders drop constraint if exists payment_orders_status_check;
alter table public.payment_orders add constraint payment_orders_status_check
  check (status in ('pending','created','pending_verification','paid','rejected','failed','cancelled','refunded','disputed'));

alter table public.entitlements drop constraint if exists entitlements_grant_source_check;
alter table public.entitlements add constraint entitlements_grant_source_check
  check (grant_source in ('payment','manual_upi','manual','promotional','institutional','legacy','admin_test','backfill'));

create table if not exists public.manual_upi_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  utr_reference text not null check (char_length(utr_reference) between 6 and 40),
  screenshot_reference text,
  verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification','verified','rejected')),
  duplicate_flag boolean not null default false,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.manual_upi_payment_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.manual_upi_submissions(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','resubmitted','verified','rejected')),
  previous_status text,
  new_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists manual_upi_status_idx on public.manual_upi_submissions(verification_status,submitted_at desc);
create index if not exists manual_upi_utr_lookup_idx on public.manual_upi_submissions(lower(utr_reference));
create unique index if not exists manual_upi_verified_utr_unique
  on public.manual_upi_submissions(lower(utr_reference)) where verification_status='verified';
create index if not exists manual_upi_events_submission_idx on public.manual_upi_payment_events(submission_id,created_at);

alter table public.manual_upi_submissions enable row level security;
alter table public.manual_upi_payment_events enable row level security;
revoke all on public.manual_upi_submissions,public.manual_upi_payment_events from anon,authenticated;
grant select on public.manual_upi_submissions,public.manual_upi_payment_events to authenticated;
create policy manual_upi_submission_own_read on public.manual_upi_submissions for select to authenticated
  using ((select auth.uid())=user_id);
create policy manual_upi_events_own_read on public.manual_upi_payment_events for select to authenticated
  using (exists(select 1 from public.manual_upi_submissions s where s.id=submission_id and s.user_id=(select auth.uid())));

insert into public.schema_migrations(version,description)
values('20260827173411','Manual UPI payment submission, verification and audit trail') on conflict do nothing;

commit;
