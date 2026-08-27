begin;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  product_type text not null check (product_type in ('course','bundle')),
  price_in_paise integer not null check (price_in_paise >= 0),
  reference_price_in_paise integer check (reference_price_in_paise is null or reference_price_in_paise >= price_in_paise),
  currency text not null default 'INR',
  active boolean not null default true,
  campaign_available boolean not null default true,
  display_order integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.product_courses (
  product_id uuid not null references public.products(id) on delete cascade,
  course text not null,
  display_order integer not null default 0,
  primary key(product_id,course)
);

create table if not exists public.product_features (
  product_id uuid not null references public.products(id) on delete cascade,
  feature_code text not null,
  display_name text not null,
  display_order integer not null default 0,
  primary key(product_id,feature_code)
);

alter table public.payment_orders add column if not exists product_id uuid references public.products(id) on delete restrict;
alter table public.payment_orders alter column plan_id drop not null;
alter table public.entitlements add column if not exists product_id uuid references public.products(id) on delete restrict;
alter table public.entitlements alter column plan_id drop not null;
alter table public.entitlements alter column expires_at drop not null;
alter table public.entitlements drop constraint if exists entitlements_grant_source_check;
alter table public.entitlements add constraint entitlements_grant_source_check
  check (grant_source in ('payment','manual','promotional','institutional','legacy','admin_test','backfill'));

create unique index if not exists entitlements_active_product_unique
  on public.entitlements(user_id,product_id) where status='active' and product_id is not null;
create index if not exists entitlements_user_product_access
  on public.entitlements(user_id,product_id,status,expires_at);
create index if not exists payment_orders_product_idx on public.payment_orders(product_id,created_at desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  source text not null, assessment_code text not null default 'taksh-skill-diagnostic-v1',
  starts_at timestamptz, ends_at timestamptz, active boolean not null default true,
  landing_path text not null default '/assessment/job-readiness', category_config jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.campaign_attributions (
  id uuid primary key default gen_random_uuid(), visitor_id text,
  user_id uuid references auth.users(id) on delete cascade, campaign_id uuid references public.campaigns(id) on delete set null,
  source text, medium text, campaign_code text, referral_url text, landing_page text,
  first_touched_at timestamptz not null default now(), registered_at timestamptz,
  diagnostic_started_at timestamptz, diagnostic_completed_at timestamptz,
  recommended_product_id uuid references public.products(id) on delete set null,
  checkout_started_at timestamptz, purchased_at timestamptz, purchased_product_id uuid references public.products(id) on delete set null,
  revenue_in_paise integer, metadata jsonb not null default '{}'
);
create unique index if not exists campaign_attribution_user_campaign_unique
  on public.campaign_attributions(user_id,campaign_id) where user_id is not null and campaign_id is not null;
create index if not exists campaign_attribution_campaign_funnel on public.campaign_attributions(campaign_id,first_touched_at desc);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  event_name text not null check(event_name in ('campaign_landed','registration_completed','diagnostic_started','diagnostic_completed','results_viewed','course_viewed','checkout_started','payment_success','payment_failed','course_started','lesson_completed','practice_started','practice_completed')),
  product_id uuid references public.products(id) on delete set null, course text,
  properties jsonb not null default '{}', occurred_at timestamptz not null default now()
);
create index if not exists product_events_funnel_idx on public.product_events(event_name,occurred_at desc);
create index if not exists product_events_campaign_idx on public.product_events(campaign_id,event_name,occurred_at desc);

create table if not exists public.readiness_scores (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique references public.diagnostic_attempts(id) on delete cascade,
  overall_score integer not null check(overall_score between 0 and 100), skill_scores jsonb not null,
  strongest_area text, improvement_area text, recommended_product_id uuid references public.products(id) on delete set null,
  measured_at timestamptz not null default now()
);
create index if not exists readiness_scores_history on public.readiness_scores(user_id,measured_at desc);

alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_difficulty_check;
update public.diagnostic_questions set difficulty=case
  when mod(abs(hashtext(id)::bigint),10)<2 then 1 when mod(abs(hashtext(id)::bigint),10)<7 then 2 else 3 end;
alter table public.diagnostic_questions add constraint diagnostic_questions_difficulty_check check(difficulty in(1,2,3));

insert into public.products(code,name,description,product_type,price_in_paise,reference_price_in_paise,display_order,metadata) values
 ('prompt-engineering','Prompt Engineering','Design, test and improve reliable prompts for modern AI tools.','course',49900,null,10,'{"course_slug":"prompt-engineering-fundamentals"}'),
 ('servicenow-itsm-developer','ServiceNow ITSM + Developer','Learn ITSM, ServiceNow administration and secure platform development.','course',49900,null,20,'{"course_slug":"servicenow-itsm-development-genai"}'),
 ('python-full-stack','Python Full Stack','Build practical Python and full-stack development foundations.','course',49900,null,30,'{"course_slug":"python-fundamentals"}'),
 ('java-full-stack','Java Full Stack','Learn Java and modern full-stack application development.','course',49900,null,40,'{"course_slug":"java-full-stack"}'),
 ('aptitude-english','Aptitude + English Proficiency','Prepare for quantitative, reasoning and English placement assessments.','course',39900,null,50,'{"course_slug":"logical-reasoning"}'),
 ('complete-placement-bundle','Taksh Complete Placement Bundle','Complete learning, practice and readiness preparation in one bundle.','bundle',99900,249900,1,'{"featured":true}')
on conflict(code) do update set name=excluded.name,description=excluded.description,product_type=excluded.product_type,
 price_in_paise=excluded.price_in_paise,reference_price_in_paise=excluded.reference_price_in_paise,
 display_order=excluded.display_order,metadata=excluded.metadata,updated_at=now();

insert into public.product_courses(product_id,course,display_order)
select p.id,v.course,v.position from public.products p join (values
 ('prompt-engineering','Prompt Engineering Fundamentals',1),
 ('servicenow-itsm-developer','ServiceNow ITSM, Development & GenAI Career Program',1),
 ('python-full-stack','Python Fundamentals',1),
 ('java-full-stack','Java Full Stack',1),
 ('aptitude-english','Logical Reasoning',1),('aptitude-english','English Proficiency',2),
 ('complete-placement-bundle','Prompt Engineering Fundamentals',1),
 ('complete-placement-bundle','ServiceNow ITSM, Development & GenAI Career Program',2),
 ('complete-placement-bundle','Python Fundamentals',3),('complete-placement-bundle','Java Full Stack',4),
 ('complete-placement-bundle','Logical Reasoning',5),('complete-placement-bundle','English Proficiency',6)
) v(code,course,position) on p.code=v.code on conflict do nothing;

insert into public.product_features(product_id,feature_code,display_name,display_order)
select p.id,v.code,v.name,v.position from public.products p cross join (values
 ('practice_aptitude','Aptitude practice',1),('practice_english','English practice',2),
 ('practice_technical','Technical practice',3),('topic_tests','Topic-wise tests',4),
 ('readiness_retests','Placement readiness assessments',5),('performance_analytics','Learner performance analytics',6),
 ('weak_area_analysis','Weak-area analysis',7),('resume_tools','JD-based resume tools',8),
 ('interview_prep','JD-based interview preparation',9),('mock_interview','AI mock interviews',10)
) v(code,name,position) where p.code='complete-placement-bundle' on conflict do nothing;

-- Map the previous Career Starter purchase to the complete bundle without invalidating paid access.
update public.payment_orders o set product_id=p.id from public.products p,public.plans legacy
 where o.plan_id=legacy.id and legacy.code='career_starter' and p.code='complete-placement-bundle' and o.product_id is null;
update public.entitlements e set product_id=p.id,grant_source=case when e.payment_id is null then 'legacy' else 'payment' end
 from public.products p,public.plans legacy where e.plan_id=legacy.id and legacy.code='career_starter'
 and p.code='complete-placement-bundle' and e.product_id is null;

-- Preserve legitimate historical assignments as source-aware entitlements.
insert into public.entitlements(user_id,product_id,starts_at,expires_at,status,grant_source,granted_by)
select distinct assignment.student_id,product.id,coalesce(assignment.assigned_at,now()),assignment.due_at,'active',
 case when assignment.institution_id is not null then 'institutional' else 'legacy' end,assignment.assigned_by
from public.student_course_assignments assignment
join public.product_courses mapping on mapping.course=assignment.course
join public.products product on product.id=mapping.product_id and product.product_type='course'
where assignment.active
on conflict(user_id,product_id) where status='active' and product_id is not null do nothing;

alter table public.products enable row level security; alter table public.product_courses enable row level security;
alter table public.product_features enable row level security; alter table public.campaigns enable row level security;
alter table public.campaign_attributions enable row level security; alter table public.product_events enable row level security;
alter table public.readiness_scores enable row level security;
revoke all on public.products,public.product_courses,public.product_features,public.campaigns,public.campaign_attributions,public.product_events,public.readiness_scores from anon,authenticated;
grant select on public.products,public.product_courses,public.product_features to anon,authenticated;
grant select on public.campaigns to anon,authenticated;
grant select on public.campaign_attributions,public.readiness_scores to authenticated;
create policy products_public_read on public.products for select to anon,authenticated using(active);
create policy product_courses_public_read on public.product_courses for select to anon,authenticated using(true);
create policy product_features_public_read on public.product_features for select to anon,authenticated using(true);
create policy campaigns_active_read on public.campaigns for select to anon,authenticated using(active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy campaign_attribution_own_read on public.campaign_attributions for select to authenticated using((select auth.uid())=user_id or public.is_super_admin());
create policy readiness_scores_own_read on public.readiness_scores for select to authenticated using((select auth.uid())=user_id or public.is_super_admin());

insert into public.schema_migrations(version,description) values ('20260826095850','Normalized products, source-aware entitlements, campaigns, analytics and readiness history') on conflict do nothing;
commit;
