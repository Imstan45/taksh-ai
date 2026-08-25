alter table public.courses add column if not exists slug text;
alter table public.courses add column if not exists short_description text not null default '';
alter table public.courses add column if not exists full_description text not null default '';
alter table public.courses add column if not exists category text not null default 'Career Skills';
alter table public.courses add column if not exists difficulty text not null default 'Beginner';
alter table public.courses add column if not exists lesson_count integer not null default 0;
alter table public.courses add column if not exists estimated_minutes integer not null default 0;
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists published boolean not null default false;
create unique index if not exists courses_slug_unique on public.courses(slug) where slug is not null;

alter table public.entitlements alter column payment_id drop not null;
alter table public.entitlements add column if not exists grant_source text not null default 'payment';
alter table public.entitlements add column if not exists granted_by uuid references auth.users(id) on delete set null;
do $$ begin
  alter table public.entitlements add constraint entitlements_grant_source_check
    check (grant_source in ('payment','admin_test','backfill'));
exception when duplicate_object then null; end $$;
create unique index if not exists entitlements_one_active_plan
  on public.entitlements(user_id,plan_id) where status='active';

insert into public.plans(code,name,description,price_in_paise,currency,duration_days,features_json,active,display_order)
values ('career_starter','Taksh Career Starter','A complete placement-readiness learning package.',49900,'INR',365,
  '["Python Fundamentals","Prompt Engineering Fundamentals","UI/UX Fundamentals","Logical Reasoning","English Proficiency","Placement Readiness Test and retest"]'::jsonb,true,1)
on conflict(code) do update set name=excluded.name,description=excluded.description,price_in_paise=excluded.price_in_paise,
  duration_days=excluded.duration_days,features_json=excluded.features_json,active=true,display_order=1,updated_at=now();

create table if not exists public.plan_course_entitlements(
  plan_id uuid not null references public.plans(id) on delete cascade,
  course text not null,
  created_at timestamptz not null default now(),
  primary key(plan_id,course)
);
alter table public.plan_course_entitlements enable row level security;
revoke all on public.plan_course_entitlements from anon,authenticated;

insert into public.plan_course_entitlements(plan_id,course)
select p.id,c.course from public.plans p cross join (values
 ('Python Fundamentals'),('Prompt Engineering Fundamentals'),('UI/UX Fundamentals'),
 ('Logical Reasoning'),('English Proficiency')) c(course)
where p.code='career_starter'
on conflict do nothing;

create or replace function public.sync_paid_course_assignments() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.status='active' and new.expires_at>now() then
    insert into public.student_course_assignments(student_id,institution_id,course,assigned_by,active,revoked_at)
    select new.user_id,(select institution_id from public.user_roles where user_id=new.user_id order by created_at limit 1),m.course,new.granted_by,true,null
    from public.plan_course_entitlements m where m.plan_id=new.plan_id
    on conflict(student_id,course) do update set active=true,revoked_at=null,assigned_by=coalesce(excluded.assigned_by,student_course_assignments.assigned_by);
  end if;
  return new;
end $$;
drop trigger if exists entitlement_grants_courses on public.entitlements;
create trigger entitlement_grants_courses after insert or update of status,plan_id,expires_at on public.entitlements
for each row execute function public.sync_paid_course_assignments();

insert into public.student_course_assignments(student_id,institution_id,course,assigned_by,active,revoked_at)
select e.user_id,(select institution_id from public.user_roles where user_id=e.user_id order by created_at limit 1),m.course,e.granted_by,true,null
from public.entitlements e join public.plan_course_entitlements m on m.plan_id=e.plan_id
where e.status='active' and e.expires_at>now()
on conflict(student_id,course) do update set active=true,revoked_at=null;

insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published)
values
 ('PYF-001','Python Fundamentals','Learn practical Python from first principles through functions, files and a final project.','PUBLISHED','python-fundamentals','Start coding confidently with Python.','Twenty guided lessons with runnable examples, practice and knowledge checks.','Programming','Beginner',20,600,true),
 ('PEF-001','Prompt Engineering Fundamentals','Learn to design, test and improve reliable prompts for modern AI tools.','PUBLISHED','prompt-engineering-fundamentals','Turn vague requests into dependable AI instructions.','Twenty applied lessons covering context, constraints, examples, evaluation and responsible use.','AI Skills','Beginner',20,500,true),
 ('UXF-001','UI/UX Fundamentals','Learn research, interaction design, visual hierarchy, prototyping and usability testing.','PUBLISHED','ui-ux-fundamentals','Design useful, usable and accessible digital experiences.','Twenty practical lessons built around real products, common mistakes and portfolio-ready activities.','Design','Beginner',20,500,true)
on conflict(code) do update set title=excluded.title,description=excluded.description,status=excluded.status,slug=excluded.slug,
short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,difficulty=excluded.difficulty,
lesson_count=excluded.lesson_count,estimated_minutes=excluded.estimated_minutes,published=true,updated_at=now();

insert into public.schema_migrations(version) values ('202608250001') on conflict do nothing;
