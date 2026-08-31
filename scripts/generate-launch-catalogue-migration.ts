import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { launchCatalogueCurriculum, launchCourses } from "../src/lib/content-factory/launch-catalogue";

const output=resolve(process.cwd(),"supabase/migrations/202608310001_launch_course_catalogue.sql");
const q=(value:string)=>`'${value.replaceAll("'","''")}'`;
const textArray=(values:string[])=>`array[${values.map(q).join(",")}]::text[]`;
const statements:string[]=[`begin;

alter table public.courses add column if not exists skill_tags text[] not null default '{}';
alter table public.course_modules add column if not exists skill_tags text[] not null default '{}';
alter table public.taksh_curriculum add column if not exists skill_tags text[] not null default '{}';
alter table public.taksh_content_assets add column if not exists skill_tags text[] not null default '{}';

create index if not exists courses_skill_tags_gin on public.courses using gin(skill_tags);
create index if not exists course_modules_skill_tags_gin on public.course_modules using gin(skill_tags);
create index if not exists content_assets_skill_tags_gin on public.taksh_content_assets using gin(skill_tags);`];

for(const course of launchCourses){
  statements.push(`insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published,skill_tags)
select ${q(course.code)},${q(course.title)},${q(course.description)},'active',${q(course.slug)},${q(course.description)},${q(`${course.description} ${course.outcome}`)},${q(course.category)},'Beginner to job-ready',25,660,true,${textArray(course.skills)}
where not exists(select 1 from public.courses where lower(title)=lower(${q(course.title)}) or slug=${q(course.slug)})
on conflict(code) do nothing;`);
  course.modules.forEach((module,index)=>statements.push(`insert into public.course_modules(course_id,title,display_order,skill_tags)
select id,${q(`Module ${index+1} · ${module.title}`)},${index+1},${textArray(module.skills)} from public.courses where code=${q(course.code)}
on conflict(course_id,title) do update set display_order=excluded.display_order,skill_tags=excluded.skill_tags;`));
}

for(const [index,item] of launchCatalogueCurriculum.entries()){
  const course=launchCourses.find(value=>value.title===item.course)!;
  const moduleIndex=course.modules.findIndex(value=>item.module.endsWith(value.title));
  const courseModule=course.modules[Math.max(0,moduleIndex)];
  const content=buildAuthoredLesson(item);
  const slug=content.identity.slug;
  const topicOrder=item.topic==="Understand"?1:item.topic==="Apply"?2:item.topic==="Assess"?3:4;
  statements.push(`insert into public.course_topics(module_id,title,display_order)
select module.id,${q(item.topic)},${topicOrder} from public.course_modules module join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)}
on conflict(module_id,title) do update set display_order=excluded.display_order;`);
  statements.push(`insert into public.course_subtopics(topic_id,title,slug,display_order,active)
select topic.id,${q(item.subtopic)},${q(slug)},${topicOrder},true from public.course_topics topic join public.course_modules module on module.id=topic.module_id join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)} and topic.title=${q(item.topic)}
on conflict(slug) do update set title=excluded.title,active=true;`);
  statements.push(`insert into public.taksh_curriculum(course,module,topic,subtopic,display_order,active,skill_tags)
values(${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${index+1},true,${textArray(courseModule?.skills??course.skills)})
on conflict(course,module,topic,subtopic) do update set display_order=excluded.display_order,active=true,skill_tags=excluded.skill_tags;`);
  statements.push(`insert into public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,content_version,reviewed_at,approved_at,published_at,skill_tags)
select ${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${q(content.identity.title)},${q(slug)},${q(content.identity.difficulty)},'published',${q(JSON.stringify(content))}::jsonb,1,now(),now(),now(),${textArray(courseModule?.skills??course.skills)}
where not exists(select 1 from public.taksh_content_assets where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived');`);
  statements.push(`insert into public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
select asset.id,1,'authored','Launch catalogue job-readiness lesson',asset.content from public.taksh_content_assets asset
where asset.course=${q(item.course)} and asset.module=${q(item.module)} and asset.topic=${q(item.topic)} and asset.subtopic=${q(item.subtopic)} and asset.status='published'
on conflict(asset_id,version_number) do nothing;`);
}

for(const [index,course] of launchCourses.entries())statements.push(`insert into public.product_courses(product_id,course,display_order)
select product.id,${q(course.title)},${index+20} from public.products product where product.code='complete-placement-bundle'
on conflict(product_id,course) do update set display_order=excluded.display_order;`);

statements.push(`insert into public.schema_migrations(version,description) values('202608310001','Ten launch courses with 80 modules, 250 authored lessons, assessments, skill tags and Career Starter bundle access') on conflict(version) do nothing;

commit;`);

mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,`${statements.join("\n\n")}\n`);
console.log(JSON.stringify({output,courses:launchCourses.length,modules:launchCourses.reduce((sum,course)=>sum+course.modules.length,0),lessons:launchCatalogueCurriculum.length}));
