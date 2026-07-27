alter table public.institutions
  add column if not exists institution_type text not null default 'college';

alter table public.institutions
  drop constraint if exists institutions_institution_type_check;

alter table public.institutions
  add constraint institutions_institution_type_check
  check (institution_type in ('school', 'college'));

create index if not exists institutions_type_status_idx
  on public.institutions(institution_type, status);
