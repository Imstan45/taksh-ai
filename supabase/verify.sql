\pset tuples_only on
\pset format aligned
select * from public.verify_taksh_schema();
select version, description, installed_at
from public.schema_migrations
order by version;
