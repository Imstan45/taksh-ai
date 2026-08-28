begin;

drop policy if exists sales_participant_own_or_leaderboard_read on public.sales_challenge_participants;
create policy sales_participant_own_read on public.sales_challenge_participants for select to authenticated
  using(user_id=(select auth.uid()));

insert into public.schema_migrations(version,description)
values('20260828192000','Prevent leaderboard users from reading participant identity and referral columns directly') on conflict do nothing;

commit;
