begin;

alter table public.user_roles drop constraint if exists user_roles_account_status_check;
alter table public.user_roles add constraint user_roles_account_status_check
  check (account_status in ('invited','pending','active','suspended','rejected','disabled'));

alter table public.sales_reps add column if not exists network_reach integer;
alter table public.sales_reps drop constraint if exists sales_reps_network_reach_check;
alter table public.sales_reps add constraint sales_reps_network_reach_check
  check (network_reach is null or network_reach between 1 and 1000000);
alter table public.sales_reps alter column referral_code drop not null;
alter table public.sales_reps drop constraint if exists sales_reps_referral_code_check;
alter table public.sales_reps add constraint sales_reps_referral_code_check
  check (referral_code is null or referral_code ~ '^([A-Z][A-Z0-9]{5,11}|TAKSH-[A-Z0-9]{4,16})$');
alter table public.sales_reps drop constraint if exists sales_reps_status_check;
update public.sales_reps set status='suspended' where status='inactive';
alter table public.sales_reps add constraint sales_reps_status_check
  check (status in ('invited','pending','active','suspended','rejected'));

create index if not exists sales_reps_review_queue_idx
  on public.sales_reps(status,created_at) where status in ('pending','invited');

insert into public.schema_migrations(version,description)
values('20260901090000','Dedicated Sales Partner portal self-registration, approval lifecycle and network profile')
on conflict do nothing;

commit;
