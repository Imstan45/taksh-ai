insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published)
values
 ('ENG-001','English Proficiency','Build placement-ready grammar, vocabulary, verbal ability and reading comprehension.','active','english-proficiency','Communicate accurately and solve verbal placement questions with confidence.','Thirty-five guided lessons covering grammar, vocabulary, verbal ability and critical reading with applied examples and knowledge checks.','Placement Skills','Foundation to intermediate',35,420,true),
 ('LR-001','Logical Reasoning','Develop systematic reasoning for patterns, arrangements, relationships, deduction and critical thinking.','active','logical-reasoning','Master the reasoning patterns used in placement assessments.','Thirty-nine guided lessons covering foundational logic, series, coding, relationships, arrangements, puzzles and critical reasoning.','Placement Skills','Foundation to intermediate',39,468,true),
 ('SN-001','ServiceNow ITSM, Development & GenAI Career Program','Become job-ready across ITSM processes, ServiceNow administration, development and responsible GenAI workflows.','active','servicenow-itsm-development-genai','Learn ServiceNow through concepts, platform workflows, labs and portfolio projects.','Twenty-five in-depth lessons covering ITSM, administration, scripting, automation, security, integrations, GenAI and career-ready capstones.','Enterprise Technology','Foundation to intermediate',25,1500,true)
on conflict(code) do update set title=excluded.title,description=excluded.description,status=excluded.status,slug=excluded.slug,
 short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,
 difficulty=excluded.difficulty,lesson_count=excluded.lesson_count,estimated_minutes=excluded.estimated_minutes,published=true,updated_at=now();

insert into public.schema_migrations(version,description)
values('202608250003','Normalize editable course metadata for all published legacy courses') on conflict do nothing;
