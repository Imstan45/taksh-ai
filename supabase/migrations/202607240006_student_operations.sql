begin;
alter table public.user_academic_memberships add column if not exists roll_number text;
create unique index if not exists memberships_roll_number_unique
  on public.user_academic_memberships(institution_id,lower(roll_number))
  where roll_number is not null and active;
create index if not exists memberships_student_directory_idx
  on public.user_academic_memberships(institution_id,membership_type,department_id,batch_id,active);
insert into public.schema_migrations(version,description)
values('202607240006','Student directory roll numbers and operational indexes')
on conflict(version) do nothing;
commit;
