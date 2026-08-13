begin;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  description text not null, price_in_paise integer not null check(price_in_paise > 0), currency text not null default 'INR',
  duration_days integer not null check(duration_days > 0), features_json jsonb not null default '[]', active boolean not null default true,
  display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), plan_id uuid not null references public.plans(id),
  internal_order_reference text not null unique, razorpay_order_id text unique, amount_in_paise integer not null, currency text not null,
  status text not null check(status in ('pending','created','paid','failed','cancelled','refunded','disputed')) default 'pending',
  attribution_json jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), payment_order_id uuid not null references public.payment_orders(id),
  razorpay_payment_id text not null unique, razorpay_order_id text not null, amount_in_paise integer not null, currency text not null,
  status text not null check(status in ('pending','captured','failed','refunded','partially_refunded','disputed')),
  verified_at timestamptz, failure_code text, failure_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), plan_id uuid not null references public.plans(id),
  payment_id uuid not null unique references public.payments(id), starts_at timestamptz not null, expires_at timestamptz not null,
  status text not null check(status in ('active','expired','revoked','refunded')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null, external_event_id text not null,
  event_type text not null, processing_status text not null check(processing_status in ('received','processed','ignored','failed')) default 'received',
  received_at timestamptz not null default now(), processed_at timestamptz, unique(provider,external_event_id)
);
create table if not exists public.student_consents (
  user_id uuid primary key references auth.users(id), terms_accepted boolean not null, privacy_accepted boolean not null,
  policy_version text not null, accepted_at timestamptz not null, marketing_consent boolean not null default false,
  age_18_or_above boolean not null, college_name text, academic_status text,
  attribution_json jsonb not null default '{}', updated_at timestamptz not null default now()
);
insert into public.plans(code,name,description,price_in_paise,duration_days,features_json,display_order) values
('practice_30','30-Day Placement Practice','Focused access to the currently available learning and practice tools.',19900,30,'["Complete available aptitude learning","Complete available English learning","Full available practice","Progress tracking"]',1),
('placement_90','90-Day Placement Plan','A longer preparation window for consistent placement practice.',49900,90,'["Complete available aptitude learning","Complete available English learning","Full available practice","Available mock assessments","Progress tracking"]',2),
('annual','Annual Taksh Plan','Year-round access to the complete currently available learning catalogue.',99900,365,'["Complete available aptitude learning","Complete available English learning","Full available practice","Available mock assessments","Progress tracking","Available explanations"]',3)
on conflict(code) do update set name=excluded.name,description=excluded.description,price_in_paise=excluded.price_in_paise,duration_days=excluded.duration_days,features_json=excluded.features_json,display_order=excluded.display_order,updated_at=now();
create index if not exists payment_orders_user_idx on public.payment_orders(user_id,created_at desc);
create index if not exists payments_user_idx on public.payments(user_id,created_at desc);
create index if not exists entitlements_active_idx on public.entitlements(user_id,expires_at desc) where status='active';
alter table public.plans enable row level security; alter table public.payment_orders enable row level security; alter table public.payments enable row level security;
alter table public.entitlements enable row level security; alter table public.payment_webhook_events enable row level security; alter table public.student_consents enable row level security;
revoke all on public.payment_orders,public.payments,public.entitlements,public.payment_webhook_events from anon,authenticated;
create policy payment_orders_own_read on public.payment_orders for select to authenticated using((select auth.uid())=user_id);
create policy payments_own_read on public.payments for select to authenticated using((select auth.uid())=user_id);
create policy entitlements_own_read on public.entitlements for select to authenticated using((select auth.uid())=user_id);
grant select on public.plans to anon,authenticated; grant select,insert,update on public.student_consents to authenticated;
create policy plans_public_read on public.plans for select to anon,authenticated using(active);
create policy consents_own_read on public.student_consents for select to authenticated using((select auth.uid())=user_id);
create policy consents_own_insert on public.student_consents for insert to authenticated with check((select auth.uid())=user_id);
create policy consents_own_update on public.student_consents for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
commit;
