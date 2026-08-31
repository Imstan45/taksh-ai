create index if not exists referral_sales_attribution_idx on public.referral_sales(attribution_id);
create index if not exists referral_sales_product_idx on public.referral_sales(product_id) where product_id is not null;
create index if not exists referral_sales_user_idx on public.referral_sales(referred_user_id);
create index if not exists sales_reps_approved_by_idx on public.sales_reps(approved_by) where approved_by is not null;
drop policy if exists sales_attribution_participant_own_read on public.sales_referral_attributions;
drop policy if exists sales_attribution_rep_own_read on public.sales_referral_attributions;
drop policy if exists sales_attribution_owner_read on public.sales_referral_attributions;
create policy sales_attribution_owner_read on public.sales_referral_attributions for select to authenticated using (
  exists(select 1 from public.sales_challenge_participants participant where participant.id=participant_id and participant.user_id=(select auth.uid()))
  or exists(select 1 from public.sales_reps rep where rep.id=sales_rep_id and rep.user_id=(select auth.uid()))
);
insert into public.schema_migrations(version,description) values('20260831154500','Sales Rep referral indexes and consolidated attribution RLS') on conflict do nothing;
