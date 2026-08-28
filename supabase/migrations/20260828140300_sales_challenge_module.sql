begin;

create table public.sales_challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 3 and 160),
  description text not null check(char_length(description) between 10 and 2000),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'draft' check(status in('draft','registration_open','active','completed','archived')),
  rules_version text not null default '1.0',
  show_participant_leaderboard boolean not null default false,
  conversion_minimum_registrations integer not null default 20 check(conversion_minimum_registrations between 1 and 10000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_at>start_at)
);

create table public.sales_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.sales_challenges(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  referral_code text not null unique check(referral_code ~ '^TSC-[A-Z0-9]{6,12}$'),
  display_name text not null check(char_length(display_name) between 2 and 80),
  joined_at timestamptz not null default now(),
  status text not null default 'active' check(status in('pending','active','disqualified','completed','selected','not_selected')),
  rules_accepted_at timestamptz not null,
  rules_version text not null,
  compliance_score numeric(3,2) not null default 0 check(compliance_score between 0 and 5),
  compliance_notes text,
  compliance_scored_by uuid references auth.users(id) on delete set null,
  compliance_scored_at timestamptz,
  disqualified_at timestamptz,
  disqualified_by uuid references auth.users(id) on delete set null,
  disqualification_reason text,
  selection_status text not null default 'not_reviewed' check(selection_status in('not_reviewed','final_interview','waitlisted','selected','not_selected')),
  selected_at timestamptz,
  selected_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(challenge_id,user_id)
);

create table public.sales_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.sales_challenges(id) on delete restrict,
  participant_id uuid not null references public.sales_challenge_participants(id) on delete restrict,
  referral_code text not null,
  visitor_token_hash text not null unique,
  first_visit_at timestamptz not null default now(),
  last_visit_at timestamptz not null default now(),
  total_visits integer not null default 1 check(total_visits>0),
  registered_user_id uuid references auth.users(id) on delete set null,
  registered_at timestamptz,
  assessment_started_at timestamptz,
  assessment_completed_at timestamptz,
  is_qualified_registration boolean not null default false,
  fraud_flag boolean not null default false,
  fraud_reason text,
  validity_status text not null default 'valid' check(validity_status in('valid','invalid','review')),
  invalidated_at timestamptz,
  invalidated_by uuid references auth.users(id) on delete set null,
  invalidation_reason text,
  override_by uuid references auth.users(id) on delete set null,
  override_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sales_referral_registered_user_unique on public.sales_referral_attributions(registered_user_id) where registered_user_id is not null;
create index sales_challenges_status_dates_idx on public.sales_challenges(status,start_at,end_at);
create index sales_participants_challenge_status_idx on public.sales_challenge_participants(challenge_id,status);
create index sales_participants_user_idx on public.sales_challenge_participants(user_id,joined_at desc);
create index sales_attributions_participant_idx on public.sales_referral_attributions(participant_id,first_visit_at desc);
create index sales_attributions_challenge_idx on public.sales_referral_attributions(challenge_id,first_visit_at desc);
create index sales_attributions_registered_idx on public.sales_referral_attributions(registered_user_id) where registered_user_id is not null;
create index sales_attributions_valid_funnel_idx on public.sales_referral_attributions(challenge_id,validity_status,is_qualified_registration);

create table public.sales_challenge_audit_events (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.sales_challenges(id) on delete restrict,
  participant_id uuid references public.sales_challenge_participants(id) on delete set null,
  attribution_id uuid references public.sales_referral_attributions(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index sales_challenge_audit_challenge_idx on public.sales_challenge_audit_events(challenge_id,created_at desc);

alter table public.payment_orders add column if not exists sales_attribution_id uuid references public.sales_referral_attributions(id) on delete set null;
create index payment_orders_sales_attribution_idx on public.payment_orders(sales_attribution_id,status,updated_at) where sales_attribution_id is not null;
alter table public.payments add column if not exists refunded_amount_in_paise integer not null default 0 check(refunded_amount_in_paise>=0 and refunded_amount_in_paise<=amount_in_paise);

alter table public.sales_challenges enable row level security;
alter table public.sales_challenge_participants enable row level security;
alter table public.sales_referral_attributions enable row level security;
alter table public.sales_challenge_audit_events enable row level security;
revoke all on public.sales_challenges,public.sales_challenge_participants,public.sales_referral_attributions,public.sales_challenge_audit_events from anon,authenticated;
grant select on public.sales_challenges,public.sales_challenge_participants,public.sales_referral_attributions to authenticated;
grant select on public.sales_challenges to anon;

create policy sales_challenges_available_read on public.sales_challenges for select to anon,authenticated
  using(status in('registration_open','active','completed'));
create policy sales_participant_own_or_leaderboard_read on public.sales_challenge_participants for select to authenticated
  using(user_id=(select auth.uid()) or exists(select 1 from public.sales_challenges challenge where challenge.id=challenge_id and challenge.show_participant_leaderboard and challenge.status in('active','completed')));
create policy sales_attribution_participant_own_read on public.sales_referral_attributions for select to authenticated
  using(exists(select 1 from public.sales_challenge_participants participant where participant.id=participant_id and participant.user_id=(select auth.uid())));

insert into public.schema_migrations(version,description)
values('20260828140300','Taksh Sales Challenge module, referral attribution and payment linkage') on conflict do nothing;

commit;
