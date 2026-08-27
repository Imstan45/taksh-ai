begin;

alter table public.payment_orders drop constraint if exists payment_orders_status_check;
alter table public.payment_orders add constraint payment_orders_status_check
  check (status in ('pending','awaiting_payment','created','pending_verification','paid','rejected','failed','cancelled','refunded','disputed'));

drop index if exists public.manual_upi_verified_utr_unique;
drop index if exists public.manual_upi_utr_lookup_idx;
create unique index if not exists manual_upi_utr_unique
  on public.manual_upi_submissions(lower(utr_reference));

insert into public.schema_migrations(version,description)
values('20260827202621','Reject duplicate manual UPI references and add awaiting payment state') on conflict do nothing;

commit;
