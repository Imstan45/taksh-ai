begin;

create table public.readiness_assessment_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_seconds integer not null check(duration_seconds between 300 and 7200),
  verification_duration_seconds integer not null check(verification_duration_seconds between 300 and 1800),
  question_count integer not null check(question_count between 10 and 100),
  section_counts jsonb not null,
  placement_ready_min integer not null check(placement_ready_min between 0 and 100),
  nearly_ready_min integer not null check(nearly_ready_min between 0 and 100),
  development_required_min integer not null check(development_required_min between 0 and 100),
  suspicious_speed_seconds integer not null check(suspicious_speed_seconds between 60 and 7200),
  integrity_warning_events integer not null default 1 check(integrity_warning_events >= 1),
  integrity_invalidation_events integer not null default 3 check(integrity_invalidation_events > integrity_warning_events),
  verification_score_min integer not null default 85 check(verification_score_min between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(placement_ready_min > nearly_ready_min and nearly_ready_min > development_required_min)
);

insert into public.readiness_assessment_configs(code,name,duration_seconds,verification_duration_seconds,question_count,section_counts,placement_ready_min,nearly_ready_min,development_required_min,suspicious_speed_seconds,integrity_warning_events,integrity_invalidation_events,verification_score_min)
values('placement-readiness-v1','Taksh Placement Readiness Assessment',2700,900,40,'{"quantitative_aptitude":10,"logical_reasoning":8,"english_verbal":8,"database_technical":14}',95,85,70,720,1,3,85)
on conflict(code) do nothing;

create table public.technical_tracks (
  code text primary key,
  name text not null,
  description text not null default '',
  recommended_product_code text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.technical_tracks(code,name,description,recommended_product_code,display_order) values
 ('python-full-stack','Python / Full Stack','Python, web, database and debugging fundamentals.','python-full-stack',10),
 ('java-full-stack','Java / Full Stack','Java, object-oriented, web and database fundamentals.','java-full-stack',20),
 ('servicenow','ServiceNow','ITSM, platform, scripting and ServiceNow fundamentals.','servicenow-itsm-developer',30),
 ('general-it','General IT / Fresher','Programming, web, database, security and IT fundamentals.',null,40)
on conflict(code) do update set name=excluded.name,description=excluded.description,recommended_product_code=excluded.recommended_product_code,display_order=excluded.display_order,updated_at=now();

alter table public.diagnostic_questions add column if not exists technical_track text references public.technical_tracks(code) on delete set null;
alter table public.diagnostic_questions add column if not exists pool_type text not null default 'primary' check(pool_type in('primary','verification'));
alter table public.diagnostic_questions add column if not exists competency text;
alter table public.diagnostic_questions add column if not exists approved boolean not null default true;
update public.diagnostic_questions set technical_track='general-it' where category='database_technical' and technical_track is null;
with verification_pool as (
  select id from (
    select id,category,row_number() over(partition by category order by difficulty desc,id) position
    from public.diagnostic_questions where active and approved
  ) ranked where (category='quantitative_aptitude' and position<=6)
    or (category='logical_reasoning' and position<=5)
    or (category='english_verbal' and position<=5)
    or (category='database_technical' and position<=8)
)
update public.diagnostic_questions question set pool_type='verification' from verification_pool where question.id=verification_pool.id;
create index if not exists diagnostic_question_pool_selection on public.diagnostic_questions(category,technical_track,pool_type,difficulty) where active and approved;

alter table public.diagnostic_attempts alter column expires_at drop default;
alter table public.diagnostic_attempts add column if not exists config_code text references public.readiness_assessment_configs(code) on delete restrict;
alter table public.diagnostic_attempts add column if not exists technical_track text references public.technical_tracks(code) on delete restrict;
alter table public.diagnostic_attempts add column if not exists stage text not null default 'primary' check(stage in('legacy','primary','verification'));
alter table public.diagnostic_attempts add column if not exists parent_attempt_id uuid references public.diagnostic_attempts(id) on delete set null;
alter table public.diagnostic_attempts add column if not exists duration_seconds integer check(duration_seconds is null or duration_seconds between 60 and 7200);
alter table public.diagnostic_attempts add column if not exists average_seconds_per_question numeric(8,2);
alter table public.diagnostic_attempts add column if not exists suspicious_speed boolean not null default false;
alter table public.diagnostic_attempts add column if not exists integrity_status text not null default 'NOT_MONITORED' check(integrity_status in('NOT_MONITORED','VALID','WARNING','INVALID'));
alter table public.diagnostic_attempts add column if not exists readiness_status text check(readiness_status in('PLACEMENT_READY','VERIFIED_PLACEMENT_READY','VERIFICATION_REQUIRED','NEARLY_READY','DEVELOPMENT_REQUIRED','FOUNDATION_REQUIRED','ASSESSMENT_INCOMPLETE','ASSESSMENT_INVALID','MANUAL_REVIEW'));
alter table public.diagnostic_attempts add column if not exists verification_status text not null default 'NOT_REQUIRED' check(verification_status in('NOT_REQUIRED','REQUIRED','IN_PROGRESS','VERIFIED','MANUAL_REVIEW'));
alter table public.diagnostic_attempts add column if not exists invalidation_reason text;
update public.diagnostic_attempts set stage='legacy',duration_seconds=600 where config_code is null;
create index if not exists diagnostic_attempt_candidate_pipeline on public.diagnostic_attempts(readiness_status,technical_track,submitted_at desc);
create index if not exists diagnostic_attempt_verification_parent on public.diagnostic_attempts(parent_attempt_id) where parent_attempt_id is not null;

create table public.assessment_integrity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.diagnostic_attempts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in('visibility_hidden','window_blur','fullscreen_exit','navigation_attempt','refresh_restore','connection_lost','connection_restored')),
  client_occurred_at timestamptz,
  server_received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create index assessment_integrity_attempt_time on public.assessment_integrity_events(attempt_id,server_received_at);

create table public.candidate_readiness (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latest_attempt_id uuid references public.diagnostic_attempts(id) on delete set null,
  technical_track text references public.technical_tracks(code) on delete set null,
  readiness_status text not null default 'ASSESSMENT_INCOMPLETE' check(readiness_status in('PLACEMENT_READY','VERIFIED_PLACEMENT_READY','VERIFICATION_REQUIRED','NEARLY_READY','DEVELOPMENT_REQUIRED','FOUNDATION_REQUIRED','ASSESSMENT_INCOMPLETE','ASSESSMENT_INVALID','MANUAL_REVIEW')),
  current_score integer check(current_score between 0 and 100),
  verification_status text not null default 'NOT_REQUIRED' check(verification_status in('NOT_REQUIRED','REQUIRED','IN_PROGRESS','VERIFIED','MANUAL_REVIEW')),
  profile_complete boolean not null default false,
  employer_sharing_consent boolean not null default false,
  employer_sharing_consented_at timestamptz,
  employer_eligible boolean not null default false,
  employer_eligible_at timestamptz,
  preferred_roles text[] not null default '{}',
  education_json jsonb not null default '{}',
  experience_json jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  check(not employer_eligible or (employer_sharing_consent and profile_complete and readiness_status in('PLACEMENT_READY','VERIFIED_PLACEMENT_READY')))
);

create table public.candidate_readiness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique references public.diagnostic_attempts(id) on delete cascade,
  readiness_status text not null,
  score integer not null check(score between 0 and 100),
  section_scores jsonb not null,
  technical_track text references public.technical_tracks(code) on delete set null,
  integrity_status text not null,
  suspicious_speed boolean not null default false,
  measured_at timestamptz not null default now()
);
create index candidate_readiness_history_user_time on public.candidate_readiness_history(user_id,measured_at desc);

alter table public.readiness_scores add column if not exists readiness_status text;
alter table public.readiness_scores add column if not exists technical_track text references public.technical_tracks(code) on delete set null;
alter table public.readiness_scores add column if not exists duration_seconds integer;
alter table public.readiness_scores add column if not exists suspicious_speed boolean not null default false;

alter table public.product_events drop constraint if exists product_events_event_name_check;
alter table public.product_events add constraint product_events_event_name_check check(event_name in('campaign_landed','registration_completed','diagnostic_started','diagnostic_completed','results_viewed','course_viewed','checkout_started','payment_success','payment_failed','course_started','lesson_completed','practice_started','practice_completed','verification_started','verification_completed','reassessment_completed','placement_ready_achieved','employer_consent_updated'));

update public.products set price_in_paise=49900,reference_price_in_paise=null,updated_at=now() where code='aptitude-english';
update public.products set name='Taksh Career Starter',description='Complete preparation across technical skills, aptitude, English, practice and placement readiness.',price_in_paise=99900,reference_price_in_paise=null,metadata=metadata||'{"featured":true,"primary_bundle":true}'::jsonb,updated_at=now() where code='complete-placement-bundle';
update public.campaigns set assessment_code='placement-readiness-v1',landing_path='/assessment/placement-readiness',updated_at=now() where assessment_code='taksh-skill-diagnostic-v1';

alter table public.readiness_assessment_configs enable row level security;
alter table public.technical_tracks enable row level security;
alter table public.assessment_integrity_events enable row level security;
alter table public.candidate_readiness enable row level security;
alter table public.candidate_readiness_history enable row level security;
revoke all on public.readiness_assessment_configs,public.technical_tracks,public.assessment_integrity_events,public.candidate_readiness,public.candidate_readiness_history from anon,authenticated;
grant select on public.readiness_assessment_configs,public.technical_tracks to anon,authenticated;
grant select on public.assessment_integrity_events,public.candidate_readiness,public.candidate_readiness_history to authenticated;
create policy readiness_config_public_read on public.readiness_assessment_configs for select to anon,authenticated using(active);
create policy technical_tracks_public_read on public.technical_tracks for select to anon,authenticated using(active);
create policy integrity_event_own_read on public.assessment_integrity_events for select to authenticated using((select auth.uid())=student_id or public.is_super_admin());
create policy candidate_readiness_own_read on public.candidate_readiness for select to authenticated using((select auth.uid())=user_id or public.is_super_admin());
create policy candidate_history_own_read on public.candidate_readiness_history for select to authenticated using((select auth.uid())=user_id or public.is_super_admin());

insert into public.schema_migrations(version,description) values('20260826130209','Career readiness assessment configuration, integrity, verification, candidate quality and consent') on conflict do nothing;
commit;
