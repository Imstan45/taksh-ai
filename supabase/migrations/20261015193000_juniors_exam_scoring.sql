begin;
alter table public.juniors_practice_sessions add column correct_answers smallint;
alter table public.juniors_practice_sessions add column incorrect_answers smallint;
alter table public.juniors_practice_sessions add column unanswered_questions smallint;
alter table public.juniors_practice_sessions add column marks_awarded numeric(7,2);
alter table public.juniors_practice_sessions add column maximum_marks numeric(7,2);
alter table public.juniors_questions add column question_type text not null default 'mcq' check(question_type in('mcq','numerical'));
alter table public.juniors_questions add column numerical_answer numeric;
commit;
