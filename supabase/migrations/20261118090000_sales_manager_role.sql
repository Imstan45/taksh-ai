alter type public.app_role add value if not exists 'SALES_MANAGER';

insert into public.schema_migrations(version, description)
values ('20261118090000', 'Add read-only Sales Manager workspace role')
on conflict (version) do nothing;
