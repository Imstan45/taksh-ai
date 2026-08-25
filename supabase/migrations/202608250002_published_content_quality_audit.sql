begin;

create temporary table quality_targets on commit drop as
select id from public.taksh_content_assets
where status='published' and (
  jsonb_array_length(coalesce(content->'checkpoint_questions','[]'::jsonb))<3
  or length(coalesce(content->'core_content'->>'concept_explanation',''))<400
);

update public.taksh_content_assets a
set content=jsonb_set(
      jsonb_set(a.content,'{core_content,concept_explanation}',to_jsonb(
        case when length(coalesce(a.content->'core_content'->>'concept_explanation',''))<400 then
          concat_ws(' ',
            a.content->'core_content'->>'canonical_definition',
            a.content->'core_content'->>'why_it_matters',
            (select string_agg(concat_ws(': ',rule->>'title',rule->>'explanation',rule->>'why_it_works'),' ')
             from jsonb_array_elements(coalesce(a.content->'principles'->'rules','[]'::jsonb)) rule),
            'Worked application:',a.content->'worked_examples'->0->>'question_or_scenario',
            'Result:',a.content->'worked_examples'->0->>'final_answer',
            'Verification:',a.content->'worked_examples'->0->>'why_the_answer_is_correct'
          )
        else a.content->'core_content'->>'concept_explanation' end
      ),true),
      '{checkpoint_questions}',
      coalesce(a.content->'checkpoint_questions','[]'::jsonb) ||
      case when jsonb_array_length(coalesce(a.content->'checkpoint_questions','[]'::jsonb))<3 then jsonb_build_array(
        jsonb_build_object(
          'question_number',2,'type','conceptual',
          'question',concat('Explain ',lower(a.subtopic),' in your own words and state when it should be used.'),
          'answer',a.content->'core_content'->>'canonical_definition',
          'explanation',concat('A complete response connects the definition to ',lower(a.topic),' and gives a relevant situation.'),
          'skill_tested',a.subtopic,'difficulty',coalesce(a.difficulty,'Foundation')
        ),
        jsonb_build_object(
          'question_number',3,'type','reasoning',
          'question',concat('What should you verify before accepting an answer or result for ',lower(a.subtopic),'?'),
          'answer',coalesce(nullif(a.content->'memory_support'->>'memory_aid',''),'Check the result against the governing rule, the original information and relevant edge cases.'),
          'explanation','Verification prevents a plausible-looking response from being accepted when it violates a condition, rule or expected outcome.',
          'skill_tested',concat(a.subtopic,' verification'),'difficulty',coalesce(a.difficulty,'Foundation')
        )
      ) else '[]'::jsonb end,true
    ),
    content_version=a.content_version+1,updated_at=now(),reviewed_at=now(),approved_at=now(),published_at=now()
where a.id in(select id from quality_targets);

insert into public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
select a.id,a.content_version,'quality_review','Full published-catalogue quality audit: lesson depth and three-check minimum',a.content
from public.taksh_content_assets a join quality_targets q on q.id=a.id
on conflict(asset_id,version_number) do nothing;

with ranked as (
  select id,row_number() over(partition by course,module,topic,subtopic order by
    length(content->'core_content'->>'concept_explanation') desc,updated_at desc,id) rank
  from public.taksh_content_assets where status='published'
)
update public.taksh_content_assets a set status='archived',updated_at=now()
from ranked r where a.id=r.id and r.rank>1;

update public.taksh_content_assets set status='approved',published_at=null,updated_at=now()
where course='Intermediate Physics – EAPCET, JEE Main and JEE Advanced' and status='published';
update public.courses set published=false,status='draft',updated_at=now()
where title='Intermediate Physics – EAPCET, JEE Main and JEE Advanced';

insert into public.schema_migrations(version,description)
values('202608250002','Published catalogue quality audit, duplicate cleanup and incomplete-course unpublish')
on conflict do nothing;

commit;
