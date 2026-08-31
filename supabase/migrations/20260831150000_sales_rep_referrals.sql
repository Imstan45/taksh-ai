alter type public.app_role add value if not exists 'SALES_REP' after 'STUDENT';

create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  source_participant_id uuid unique references public.sales_challenge_participants(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  phone text,
  college text,
  city text,
  referral_code text not null unique check (referral_code ~ '^[A-Z][A-Z0-9]{5,11}$'),
  status text not null default 'invited' check (status in ('invited','active','inactive','suspended')),
  joined_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_referral_attributions alter column challenge_id drop not null;
alter table public.sales_referral_attributions alter column participant_id drop not null;
alter table public.sales_referral_attributions add column if not exists sales_rep_id uuid references public.sales_reps(id) on delete restrict;
alter table public.sales_referral_attributions add column if not exists attribution_expires_at timestamptz;
update public.sales_referral_attributions set attribution_expires_at=least(first_visit_at+interval '30 days',coalesce((select end_at from public.sales_challenges where id=challenge_id),first_visit_at+interval '30 days')) where attribution_expires_at is null;
alter table public.sales_referral_attributions alter column attribution_expires_at set default (now()+interval '30 days');
alter table public.sales_referral_attributions alter column attribution_expires_at set not null;
alter table public.sales_referral_attributions drop constraint if exists sales_referral_owner_check;
alter table public.sales_referral_attributions add constraint sales_referral_owner_check check (sales_rep_id is not null or participant_id is not null);
drop index if exists public.sales_referral_registered_user_unique;
create index if not exists sales_referral_registered_user_idx on public.sales_referral_attributions(registered_user_id,first_visit_at) where registered_user_id is not null;

create table if not exists public.referral_sales (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null references public.sales_reps(id) on delete restrict,
  attribution_id uuid not null references public.sales_referral_attributions(id) on delete restrict,
  referred_user_id uuid not null references auth.users(id) on delete restrict,
  referral_code text not null,
  product_id uuid references public.products(id) on delete set null,
  product_type text,
  payment_order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  provider text not null,
  provider_payment_reference text not null,
  amount_in_paise integer not null check (amount_in_paise >= 0),
  refunded_amount_in_paise integer not null default 0 check (refunded_amount_in_paise >= 0 and refunded_amount_in_paise <= amount_in_paise),
  currency text not null,
  status text not null default 'confirmed' check (status in ('confirmed','partially_refunded','refunded','disputed')),
  paid_at timestamptz not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_reps_status_revenue_idx on public.sales_reps(status,created_at desc);
create index if not exists sales_reps_search_idx on public.sales_reps(lower(email),lower(full_name),referral_code);
create index if not exists sales_attributions_rep_funnel_idx on public.sales_referral_attributions(sales_rep_id,validity_status,first_visit_at desc) where sales_rep_id is not null;
create index if not exists referral_sales_rep_paid_idx on public.referral_sales(sales_rep_id,paid_at desc);
create index if not exists referral_sales_status_paid_idx on public.referral_sales(status,paid_at desc);
create index if not exists referral_sales_attribution_idx on public.referral_sales(attribution_id);
create index if not exists referral_sales_product_idx on public.referral_sales(product_id) where product_id is not null;
create index if not exists referral_sales_user_idx on public.referral_sales(referred_user_id);
create index if not exists sales_reps_approved_by_idx on public.sales_reps(approved_by) where approved_by is not null;

alter table public.sales_reps enable row level security;
alter table public.referral_sales enable row level security;
revoke all on public.sales_reps,public.referral_sales from anon,authenticated;
grant select on public.sales_reps,public.referral_sales to authenticated;
create policy sales_reps_own_read on public.sales_reps for select to authenticated using (user_id=(select auth.uid()));
create policy referral_sales_rep_own_read on public.referral_sales for select to authenticated using (exists(select 1 from public.sales_reps rep where rep.id=sales_rep_id and rep.user_id=(select auth.uid())));
drop policy if exists sales_attribution_participant_own_read on public.sales_referral_attributions;
create policy sales_attribution_owner_read on public.sales_referral_attributions for select to authenticated using (
  exists(select 1 from public.sales_challenge_participants participant where participant.id=participant_id and participant.user_id=(select auth.uid()))
  or exists(select 1 from public.sales_reps rep where rep.id=sales_rep_id and rep.user_id=(select auth.uid()))
);

create or replace function public.sync_verified_referral_sale()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status='captured' then
    insert into public.referral_sales(sales_rep_id,attribution_id,referred_user_id,referral_code,product_id,product_type,payment_order_id,payment_id,provider,provider_payment_reference,amount_in_paise,currency,status,paid_at)
    select attribution.sales_rep_id,attribution.id,orders.user_id,attribution.referral_code,orders.product_id,product.product_type,
      orders.id,new.id,new.provider,new.provider_payment_id,orders.amount_in_paise,orders.currency,'confirmed',coalesce(new.verified_at,now())
    from public.payment_orders orders
    join public.sales_referral_attributions attribution on attribution.id=orders.sales_attribution_id
    join public.sales_reps rep on rep.id=attribution.sales_rep_id and rep.status='active'
    left join public.products product on product.id=orders.product_id
    where orders.id=new.payment_order_id and attribution.validity_status='valid' and attribution.registered_user_id=orders.user_id
      and attribution.attribution_expires_at>=orders.created_at and rep.user_id<>orders.user_id
    on conflict(payment_order_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.sync_verified_referral_sale() from public,anon,authenticated;
drop trigger if exists payments_sync_verified_referral_sale on public.payments;
create trigger payments_sync_verified_referral_sale after insert on public.payments for each row execute function public.sync_verified_referral_sale();

create or replace function public.sync_referral_sale_refund()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status in('refunded','partially_refunded','disputed') and (old.status is distinct from new.status or old.refunded_amount_in_paise is distinct from new.refunded_amount_in_paise) then
    update public.referral_sales set refunded_amount_in_paise=case when new.status='refunded' then amount_in_paise else greatest(refunded_amount_in_paise,new.refunded_amount_in_paise) end,
      status=case when new.status='refunded' then 'refunded' when new.status='disputed' then 'disputed' else 'partially_refunded' end,
      refunded_at=case when new.status in('refunded','partially_refunded') then now() else refunded_at end,updated_at=now()
    where payment_id=new.id;
  end if;
  return new;
end $$;
revoke all on function public.sync_referral_sale_refund() from public,anon,authenticated;
drop trigger if exists payments_sync_referral_sale_refund on public.payments;
create trigger payments_sync_referral_sale_refund after update of status,refunded_amount_in_paise on public.payments for each row execute function public.sync_referral_sale_refund();

insert into public.schema_migrations(version,description) values('20260831150000','Permanent Sales Rep role, profiles, 30-day referral attribution and auditable verified sales') on conflict do nothing;
