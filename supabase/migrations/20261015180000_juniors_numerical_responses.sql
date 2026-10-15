begin;
alter table public.juniors_questions add column numerical_tolerance numeric not null default 0;
alter table public.juniors_responses alter column selected_option drop not null;
alter table public.juniors_responses add column numerical_response numeric;
alter table public.juniors_responses add constraint juniors_response_answer_shape check(
  (selected_option is not null and numerical_response is null) or
  (selected_option is null and numerical_response is not null)
);
alter table public.juniors_questions add constraint juniors_question_answer_shape check(
  status <> 'published' or
  (question_type='mcq' and jsonb_array_length(options)=4 and correct_option between 0 and 3 and numerical_answer is null) or
  (question_type='numerical' and numerical_answer is not null and numerical_tolerance >= 0)
);
commit;
