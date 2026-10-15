revoke all privileges on table public.juniors_questions from anon, authenticated;

grant select (
  id, slug, subject, chapter_slug, topic, subtopic, prompt, options,
  question_type, difficulty, exam_tags, status, source_reference,
  content_version, created_at, updated_at
) on table public.juniors_questions to authenticated;

comment on table public.juniors_questions is
  'Validated Juniors question bank. Answer keys, tolerances, and explanations are server-only.';
