import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { launchCatalogueCurriculum, launchCourses } from "../src/lib/content-factory/launch-catalogue";

const codes=new Set(["BCP-001","IPB-001","SNF-001","DMF-001","FLY-001"]);
const courses=launchCourses.filter(course=>codes.has(course.code));
if(courses.length!==5)throw new Error(`Five non-technical courses are required; found ${launchCourses.map(course=>course.code).join(",")}.`);
const q=(value:string)=>`'${value.replaceAll("'","''")}'`;
const array=(values:string[])=>`array[${values.map(q).join(",")}]::text[]`;
const schemaSql=`begin;
alter table public.diagnostic_attempts add column if not exists diagnostic_track text not null default 'technical';
alter table public.diagnostic_attempts drop constraint if exists diagnostic_attempts_diagnostic_track_check;
alter table public.diagnostic_attempts add constraint diagnostic_attempts_diagnostic_track_check check(diagnostic_track in('technical','non_technical')) not valid;
alter table public.diagnostic_attempts validate constraint diagnostic_attempts_diagnostic_track_check;
alter table public.candidate_readiness add column if not exists diagnostic_track text not null default 'technical';
alter table public.candidate_readiness drop constraint if exists candidate_readiness_diagnostic_track_check;
alter table public.candidate_readiness add constraint candidate_readiness_diagnostic_track_check check(diagnostic_track in('technical','non_technical')) not valid;
alter table public.candidate_readiness validate constraint candidate_readiness_diagnostic_track_check;
create index if not exists diagnostic_attempts_track_created_idx on public.diagnostic_attempts(diagnostic_track,created_at desc);
create index if not exists candidate_readiness_track_updated_idx on public.candidate_readiness(diagnostic_track,updated_at desc);
commit;`;
const sql:string[]=[schemaSql.slice(0,-8)];
const batchDirectory=resolve(process.cwd(),".tmp/non-technical-course-batches");
mkdirSync(batchDirectory,{recursive:true});
writeFileSync(resolve(batchDirectory,"00-schema.sql"),schemaSql);

for(const [courseIndex,course] of courses.entries()){
 const courseStart=sql.length;
 const lessons=launchCatalogueCurriculum.filter(item=>item.course===course.title);
 const courseBatchDirectory=resolve(batchDirectory,String(courseIndex+1));
 mkdirSync(courseBatchDirectory,{recursive:true});
 if(course.code==="DMF-001")sql.push(`update public.taksh_content_assets set status='archived',updated_at=now() where course=${q(course.title)} and module like '%Â·%' and status='published';\nupdate public.taksh_curriculum set active=false where course=${q(course.title)} and module like '%Â·%' and active;`);
 sql.push(`insert into public.products(code,name,description,product_type,price_in_paise,currency,active,campaign_available,display_order,metadata) values(${q(course.slug)},${q(course.title)},${q(course.description)},'course',39900,'INR',true,true,${60+courseIndex},${q(JSON.stringify({course_slug:course.slug,headline:course.outcome}))}::jsonb) on conflict(code) do update set name=excluded.name,description=excluded.description,product_type='course',price_in_paise=39900,currency='INR',active=true,campaign_available=true,display_order=excluded.display_order,metadata=excluded.metadata,updated_at=now();
insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published,skill_tags) values(${q(course.code)},${q(course.title)},${q(course.description)},'active',${q(course.slug)},${q(course.description)},${q(`${course.description} ${course.outcome}`)},${q(course.category)},'Foundation to career-ready',${lessons.length},1080,true,${array(course.skills)}) on conflict(code) do update set title=excluded.title,description=excluded.description,status='active',slug=excluded.slug,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,difficulty=excluded.difficulty,lesson_count=excluded.lesson_count,estimated_minutes=excluded.estimated_minutes,published=true,skill_tags=excluded.skill_tags,updated_at=now();`);
 course.modules.forEach((module,index)=>sql.push(`insert into public.course_modules(course_id,title,display_order,skill_tags) select id,${q(`Module ${index+1} · ${module.title}`)},${index+1},${array(module.skills)} from public.courses where code=${q(course.code)} on conflict(course_id,title) do update set display_order=excluded.display_order,skill_tags=excluded.skill_tags;`));
 writeFileSync(resolve(courseBatchDirectory,"00-setup.sql"),`begin;\n${sql.slice(courseStart).join("\n\n")}\ncommit;\n`);
 for(const [index,item] of lessons.entries()){
  const courseModule=course.modules.find(value=>item.module.endsWith(value.title))??course.modules.at(-1)!;
  const content=buildAuthoredLesson(item),order=item.topic==="Understand"?1:item.topic==="Apply"?2:item.topic==="Assess"?3:4;
  sql.push(`insert into public.course_topics(module_id,title,display_order) select module.id,${q(item.topic)},${order} from public.course_modules module join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)} on conflict(module_id,title) do update set display_order=excluded.display_order;
insert into public.course_subtopics(topic_id,title,slug,display_order,active) select topic.id,${q(item.subtopic)},${q(content.identity.slug)},${order},true from public.course_topics topic join public.course_modules module on module.id=topic.module_id join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)} and topic.title=${q(item.topic)} on conflict(slug) do update set title=excluded.title,active=true;
insert into public.taksh_curriculum(course,module,topic,subtopic,display_order,active,skill_tags) values(${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${index+1},true,${array(courseModule.skills)}) on conflict(course,module,topic,subtopic) do update set display_order=excluded.display_order,active=true,skill_tags=excluded.skill_tags;
update public.taksh_content_assets set title=${q(content.identity.title)},slug=${q(content.identity.slug)},difficulty=${q(content.identity.difficulty)},status='published',content=${q(JSON.stringify(content))}::jsonb,content_version=content_version+1,reviewed_at=now(),approved_at=now(),published_at=now(),skill_tags=${array(courseModule.skills)},updated_at=now() where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived';
insert into public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,content_version,reviewed_at,approved_at,published_at,skill_tags) select ${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${q(content.identity.title)},${q(content.identity.slug)},${q(content.identity.difficulty)},'published',${q(JSON.stringify(content))}::jsonb,1,now(),now(),now(),${array(courseModule.skills)} where not exists(select 1 from public.taksh_content_assets where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived');`);
  writeFileSync(resolve(courseBatchDirectory,`${String(index+1).padStart(2,"0")}-lesson.sql`),`begin;\n${sql.at(-1)}\ncommit;\n`);
 }
 sql.push(`insert into public.product_courses(product_id,course,display_order) select id,${q(course.title)},1 from public.products where code=${q(course.slug)} on conflict(product_id,course) do update set display_order=excluded.display_order;`);
 writeFileSync(resolve(courseBatchDirectory,"99-mapping.sql"),`begin;\n${sql.at(-1)}\ncommit;\n`);
 writeFileSync(resolve(batchDirectory,`${courseIndex+1}-${course.code.toLowerCase()}.sql`),`begin;\n${sql.slice(courseStart).join("\n\n")}\ncommit;\n`);
}
sql.push("commit;");
const output=resolve(process.cwd(),"supabase/migrations/20260902080634_non_technical_courses_and_diagnostic_track.sql");
writeFileSync(output,`${sql.join("\n\n")}\n`);
console.log(JSON.stringify({courses:courses.length,lessons:courses.map(course=>({code:course.code,count:launchCatalogueCurriculum.filter(item=>item.course===course.title).length})),output}));
