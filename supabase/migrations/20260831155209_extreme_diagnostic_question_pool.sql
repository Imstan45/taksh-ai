begin;

alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_difficulty_check;
alter table public.diagnostic_questions add constraint diagnostic_questions_difficulty_check check(difficulty in(1,2,3,4));
alter table public.diagnostic_questions add column if not exists difficulty_label text not null default 'standard' check(difficulty_label in('standard','extreme'));
alter table public.diagnostic_questions add constraint diagnostic_extreme_consistency check((difficulty=4 and difficulty_label='extreme') or (difficulty<4 and difficulty_label='standard'));
create index if not exists diagnostic_extreme_selection on public.diagnostic_questions(category,technical_track,id) where active and approved and pool_type='primary' and difficulty_label='extreme';

insert into public.schema_migrations(version,description)
values('20260831155209','Add extreme diagnostic difficulty classification and selection index') on conflict do nothing;

commit;
