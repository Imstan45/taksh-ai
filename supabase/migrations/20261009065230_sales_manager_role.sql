-- Keep this statement outside a transaction: PostgreSQL enum values must be committed
-- before they can be used by later transactions.
alter type public.app_role add value if not exists 'SALES_MANAGER' after 'SALES_REP';

insert into public.schema_migrations(version,description)
values ('20261009065230','Add the least-privilege Sales Manager application role')
on conflict do nothing;
