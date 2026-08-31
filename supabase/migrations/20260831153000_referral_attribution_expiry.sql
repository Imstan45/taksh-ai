drop index if exists public.sales_referral_registered_user_unique;
create index if not exists sales_referral_registered_user_idx on public.sales_referral_attributions(registered_user_id,first_visit_at) where registered_user_id is not null;
insert into public.schema_migrations(version,description) values('20260831153000','Allow a new first-touch referral after the prior 30-day attribution expires') on conflict do nothing;
