insert into public.plan_course_entitlements(plan_id,course)
select id,'ServiceNow ITSM, Development & GenAI Career Program' from public.plans where code='career_starter'
on conflict do nothing;

update public.plans set features_json='["Python Fundamentals","Prompt Engineering Fundamentals","UI/UX Fundamentals","ServiceNow ITSM, Development & GenAI Career Program","Logical Reasoning","English Proficiency","Placement Readiness Test and retest"]'::jsonb,updated_at=now()
where code='career_starter';

insert into public.student_course_assignments(student_id,institution_id,course,assigned_by,active,revoked_at)
select e.user_id,(select institution_id from public.user_roles where user_id=e.user_id order by created_at limit 1),m.course,e.granted_by,true,null
from public.entitlements e join public.plans p on p.id=e.plan_id join public.plan_course_entitlements m on m.plan_id=e.plan_id
where p.code='career_starter' and m.course='ServiceNow ITSM, Development & GenAI Career Program' and e.status='active' and e.expires_at>now()
on conflict(student_id,course) do update set active=true,revoked_at=null;

insert into public.schema_migrations(version,description)
values('202608250004','Add ServiceNow development program to Career Starter entitlement') on conflict do nothing;
