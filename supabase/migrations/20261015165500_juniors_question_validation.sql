begin;
alter table public.juniors_questions add column subtopic text;
alter table public.juniors_questions add column source_reference text;
alter table public.juniors_questions add column validated_at timestamptz;
alter table public.juniors_questions add column validated_by text;
alter table public.juniors_questions add column content_version text not null default '1.0';

update public.juniors_questions set
  subtopic=case slug
    when 'math-quadratic-discriminant' then 'Nature of roots'
    when 'math-derivative-power' then 'Product, quotient and chain rules'
    when 'math-vector-magnitude' then 'Types and components'
    when 'physics-net-force' then 'Newton laws'
    when 'physics-wave-length' then 'Progressive waves'
    when 'physics-ohm-current' then 'Ohm law'
    when 'chem-mole-particles' then 'Mole concept'
    when 'chem-periodic-size' then 'Atomic and ionic radii'
    when 'chem-functional-group' then 'Nomenclature'
    else subtopic end,
  source_reference=coalesce(source_reference,'Taksh mapped MPC curriculum v1.1'),
  validated_at=coalesce(validated_at,updated_at),
  validated_by=coalesce(validated_by,'phase3-curation')
where status='published';

alter table public.juniors_questions add constraint juniors_published_questions_validated check(
  status <> 'published' or (subtopic is not null and source_reference is not null and validated_at is not null and validated_by is not null)
);
create index juniors_questions_coverage_idx on public.juniors_questions(subject,chapter_slug,topic,subtopic,status);
commit;
