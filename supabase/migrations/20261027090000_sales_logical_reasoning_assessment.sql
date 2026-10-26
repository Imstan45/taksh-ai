begin;

create table if not exists public.sales_logical_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null check (char_length(question_text) between 12 and 1600),
  options jsonb not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  explanation text not null check (char_length(explanation) between 8 and 1600),
  category text not null check (category in ('number_series','letter_series','analogy','syllogism','coding_decoding','directions','arrangement','analytical_reasoning','patterns')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  approved boolean not null default false,
  fingerprint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'object' and options ?& array['A','B','C','D'] and jsonb_object_length(options) = 4)
);

create table if not exists public.sales_logical_attempts (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null unique references public.sales_reps(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED')),
  score smallint check (score between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'IN_PROGRESS' and submitted_at is null and score is null) or (status = 'COMPLETED' and submitted_at is not null and score is not null))
);

create table if not exists public.sales_logical_attempt_items (
  attempt_id uuid not null references public.sales_logical_attempts(id) on delete restrict,
  question_id uuid not null references public.sales_logical_questions(id) on delete restrict,
  position smallint not null check (position between 1 and 10),
  option_order text[] not null check (cardinality(option_order) = 4 and option_order <@ array['A','B','C','D'] and option_order @> array['A','B','C','D']),
  question_snapshot jsonb not null,
  submitted_option text check (submitted_option in ('A','B','C','D')),
  answered_at timestamptz,
  primary key (attempt_id, question_id),
  unique (attempt_id, position),
  check ((submitted_option is null and answered_at is null) or (submitted_option is not null and answered_at is not null)),
  check (question_snapshot ?& array['question_text','options','correct_option','explanation','category','difficulty'])
);

create index if not exists sales_logical_questions_approved_idx on public.sales_logical_questions(category,difficulty,id) where approved;
create index if not exists sales_logical_attempts_submitted_idx on public.sales_logical_attempts(submitted_at desc) where status='COMPLETED';
create index if not exists sales_logical_attempt_items_question_idx on public.sales_logical_attempt_items(question_id);

alter table public.sales_logical_questions enable row level security;
alter table public.sales_logical_attempts enable row level security;
alter table public.sales_logical_attempt_items enable row level security;
revoke all on public.sales_logical_questions, public.sales_logical_attempts, public.sales_logical_attempt_items from anon, authenticated;
grant select on public.sales_logical_questions, public.sales_logical_attempts, public.sales_logical_attempt_items to authenticated;
create policy sales_logical_questions_super_admin_read on public.sales_logical_questions for select to authenticated using (public.is_super_admin());
create policy sales_logical_attempts_owner_or_admin_read on public.sales_logical_attempts for select to authenticated using (public.is_super_admin() or exists (select 1 from public.sales_reps rep where rep.id=sales_rep_id and rep.user_id=(select auth.uid())));
create policy sales_logical_attempt_items_owner_or_admin_read on public.sales_logical_attempt_items for select to authenticated using (public.is_super_admin() or exists (select 1 from public.sales_logical_attempts attempt join public.sales_reps rep on rep.id=attempt.sales_rep_id where attempt.id=attempt_id and rep.user_id=(select auth.uid())));

-- A deterministic, idempotent approved bank. All correct values are stored as A;
-- the application persists a per-attempt shuffled option order before any question is shown.
with generated as (
  select
    'number_series'::text category,
    case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end difficulty,
    format('What is the next number in the series: %s, %s, %s, %s, ?', n*3, n*3+n+2, n*3+2*(n+2), n*3+3*(n+2)) question_text,
    jsonb_build_object('A',(n*3+4*(n+2))::text,'B',(n*3+5*(n+2))::text,'C',(n*3+4*(n+1))::text,'D',(n*3+3*(n+3))::text) options,
    format('The series increases by %s each time, so the next term is %s.',n+2,n*3+4*(n+2)) explanation
  from generate_series(1,15) n
  union all
  select 'letter_series',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('What comes next in this letter series: %s, %s, %s, %s, ?',chr(64+n),chr(64+n+2),chr(64+n+4),chr(64+n+6)),
    jsonb_build_object('A',chr(64+n+8),'B',chr(64+n+7),'C',chr(64+n+9),'D',chr(64+n+6)),
    format('Each letter advances two places: the next letter is %s.',chr(64+n+8))
  from generate_series(1,15) n
  union all
  select 'analogy',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('%s is to %s as %s is to ?',a,b,c),jsonb_build_object('A',d,'B',wrong1,'C',wrong2,'D',wrong3),
    format('The relationship is %s.',reason)
  from (values
    (1,'Book','Reading','Fork','Eating','Writing','Drawing','Sleeping','an object and its usual use'),
    (2,'Doctor','Hospital','Teacher','School','Library','Market','Court','a professional and usual workplace'),
    (3,'Bird','Nest','Bee','Hive','Web','Burrow','Stable','an animal and its home'),
    (4,'Eye','See','Ear','Hear','Taste','Touch','Speak','a sense organ and its function'),
    (5,'Seed','Plant','Egg','Chick','Nest','Feather','Wing','an early form and what it develops into'),
    (6,'Clock','Time','Thermometer','Temperature','Distance','Weight','Speed','an instrument and what it measures'),
    (7,'Author','Novel','Composer','Symphony','Painting','Camera','Museum','a creator and their work'),
    (8,'Fish','Water','Camel','Desert','Forest','Mountain','Cave','an animal and its typical habitat'),
    (9,'Key','Lock','Password','Account','Door','Window','Screen','a means of access and what it opens'),
    (10,'Puppy','Dog','Calf','Cow','Horse','Goat','Sheep','a young animal and its adult form')
  ) as v(n,a,b,c,d,wrong1,wrong2,wrong3,reason)
  union all
  select 'syllogism',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('All %s are %s. Some %s are %s. Which conclusion definitely follows?',x,y,y,z),
    jsonb_build_object('A',format('All %s are %s.',x,y),'B',format('All %s are %s.',y,x),'C',format('Some %s are %s.',x,z),'D',format('No %s are %s.',x,z)),
    format('The first statement directly guarantees that every %s is a %s; the other conclusions are not guaranteed.',x,y)
  from (values
    (1,'orchids','flowers','flowers','fragrant'),(2,'pilots','licensed','licensed','teachers'),(3,'copper coins','metal objects','metal objects','old'),(4,'violinists','musicians','musicians','travellers'),(5,'triangles','polygons','polygons','blue'),(6,'editors','readers','readers','volunteers'),(7,'sparrows','birds','birds','migratory'),(8,'managers','employees','employees','remote workers'),(9,'novels','books','books','borrowed'),(10,'whales','mammals','mammals','large')
  ) as v(n,x,y,ignored,z)
  union all
  select 'coding_decoding',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('In a code, every letter is moved forward %s places. How is %s written?',shift,word),
    jsonb_build_object('A',coded,'B',word,'C',reverse_coded,'D',lower(coded)),
    format('Moving every letter in %s forward %s places gives %s.',word,shift,coded)
  from (select n,case when n%2=0 then 2 else 1 end shift, word,
    string_agg(chr(65+((ascii(ch)-65+(case when n%2=0 then 2 else 1 end))%26)),'' order by ord) coded,
    string_agg(chr(65+((ascii(ch)-65+26-(case when n%2=0 then 2 else 1 end))%26)),'' order by ord) reverse_coded
    from (select n,word,substr(word,pos,1) ch,pos ord from (values (1,'CAT'),(2,'DOG'),(3,'MAP'),(4,'SUN'),(5,'RING'),(6,'LAMP'),(7,'COLD'),(8,'FISH'),(9,'STAR'),(10,'NOTE')) words(n,word) cross join lateral generate_series(1,length(word)) pos) chars group by n,word) coded_words
  union all
  select 'directions',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('A rep walks %s metres north, then %s metres east. Relative to the starting point, which direction is the rep now?',n+2,n+3),
    jsonb_build_object('A','North-east','B','North-west','C','South-east','D','West'),
    'Moving north and east places the rep to the north-east of the starting point.'
  from generate_series(1,10) n
  union all
  select 'arrangement',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('Five files A, B, C, D and E are placed left to right. A is first, B is immediately after A, and C is last. Which statement must be true? (Version %s)',n),
    jsonb_build_object('A','B is second','B','D is second','C','E is first','D','A is last'),
    'A is first and B is immediately after A, so B must be second.'
  from generate_series(1,10) n
  union all
  select 'analytical_reasoning',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('A team can launch a campaign only if approval is received. Approval has been received for campaign %s. What can be concluded?',n),
    jsonb_build_object('A','Approval is a requirement for launch, but launch is not guaranteed.','B','The campaign has already launched.','C','The campaign cannot launch.','D','No approval was needed.'),
    '“Only if” makes approval necessary, not sufficient; receiving approval does not prove the campaign launched.'
  from generate_series(1,10) n
  union all
  select 'patterns',case when n%3=0 then 'hard' when n%2=0 then 'medium' else 'easy' end,
    format('A pattern repeats: circle, square, triangle, circle, square, triangle. What is item %s?',n+6),
    jsonb_build_object('A',case when n%3=1 then 'Circle' when n%3=2 then 'Square' else 'Triangle' end,'B','Rectangle','C','Star','D','Pentagon'),
    'The pattern repeats every three items; reducing the position modulo three identifies the next shape.'
  from generate_series(1,10) n
)
insert into public.sales_logical_questions(question_text,options,correct_option,explanation,category,difficulty,approved,fingerprint)
select question_text,options,'A',explanation,category,difficulty,true,md5(lower(question_text)) from generated
on conflict (fingerprint) do update set options=excluded.options,correct_option=excluded.correct_option,explanation=excluded.explanation,category=excluded.category,difficulty=excluded.difficulty,approved=true,updated_at=now();

do $$ begin
  if (select count(*) from public.sales_logical_questions where approved) < 100 then raise exception 'Logical assessment seed is incomplete'; end if;
  if exists(select 1 from public.sales_logical_questions where approved and (not (options ?& array['A','B','C','D']) or not options ? correct_option)) then raise exception 'Logical assessment answer-key validation failed'; end if;
end $$;

insert into public.schema_migrations(version,description) values('20261027090000','One-time Logical Reasoning Assessment for active Sales Reps') on conflict do nothing;
commit;
notify pgrst, 'reload schema';
