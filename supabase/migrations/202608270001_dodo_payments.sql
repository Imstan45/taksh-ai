begin;

alter table public.payment_orders add column if not exists provider text not null default 'razorpay';
alter table public.payment_orders add column if not exists provider_order_id text;
update public.payment_orders set provider_order_id=razorpay_order_id where provider_order_id is null and razorpay_order_id is not null;
create unique index if not exists payment_orders_provider_order_unique on public.payment_orders(provider,provider_order_id) where provider_order_id is not null;

alter table public.payments add column if not exists provider text not null default 'razorpay';
alter table public.payments add column if not exists provider_payment_id text;
update public.payments set provider_payment_id=razorpay_payment_id where provider_payment_id is null;
alter table public.payments alter column razorpay_payment_id drop not null;
alter table public.payments alter column razorpay_order_id drop not null;
create unique index if not exists payments_provider_payment_unique on public.payments(provider,provider_payment_id) where provider_payment_id is not null;

insert into public.schema_migrations(version,description)
values ('202608270001','Add provider-neutral identifiers for Dodo Payments') on conflict do nothing;

commit;
