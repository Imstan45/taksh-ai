begin;

do $$
declare column_name text;
begin
  if to_regclass('public.audit_logs') is not null then
    for column_name in
      select columns.column_name from information_schema.columns
      where columns.table_schema='public' and columns.table_name='audit_logs'
        and columns.is_nullable='NO' and columns.column_default is null
        and columns.column_name not in ('id','action','target_type','target_id','metadata','created_at')
    loop
      execute format('alter table public.audit_logs alter column %I drop not null',column_name);
    end loop;
  end if;
end $$;

delete from public.institution_course_access older using public.institution_course_access newer
where older.institution_id=newer.institution_id and older.course=newer.course and older.id<newer.id;
delete from public.student_course_assignments older using public.student_course_assignments newer
where older.student_id=newer.student_id and older.course=newer.course and older.id<newer.id;

create unique index if not exists institutions_slug_upsert_unique on public.institutions(slug);
create unique index if not exists institution_course_access_upsert_unique on public.institution_course_access(institution_id,course);
create unique index if not exists student_course_assignments_upsert_unique on public.student_course_assignments(student_id,course);

do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='institutions' and column_name='active') then
    execute $trigger$
      create or replace function public.sync_institution_legacy_active()
      returns trigger language plpgsql set search_path=public as $body$
      begin new.active := new.status='active'; return new; end $body$
    $trigger$;
    drop trigger if exists sync_institution_legacy_active on public.institutions;
    create trigger sync_institution_legacy_active before insert or update of status on public.institutions
      for each row execute function public.sync_institution_legacy_active();
    update public.institutions set active=(status='active');
  end if;
end $$;

insert into public.schema_migrations(version,description)
values('202607240009','Legacy write compatibility and required upsert indexes')
on conflict(version) do nothing;
commit;
