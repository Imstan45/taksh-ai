import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { launchCatalogueCurriculum, launchCourses } from "../src/lib/content-factory/launch-catalogue";

const output=resolve(process.cwd(),"supabase/migrations/20260901113841_customer_support_bpo_course.sql");
const course=launchCourses.find(value=>value.code==="BPO-001");
if(!course)throw new Error("BPO course definition is missing.");
const courseLessons=launchCatalogueCurriculum.filter(value=>value.course===course.title);
const lastModuleLabel=courseLessons.find(value=>value.module.endsWith(course.modules.at(-1)!.title) && value.topic!=="Final assessment")?.module;
if(!lastModuleLabel)throw new Error("BPO final module label is missing.");
const lessons=courseLessons.map(value=>value.topic==="Final assessment"?{...value,module:lastModuleLabel}:value);
const q=(value:string)=>`'${value.replaceAll("'","''")}'`;
const textArray=(values:string[])=>`array[${values.map(q).join(",")}]::text[]`;
const sql:string[]=[`begin;

insert into public.products(code,name,description,product_type,price_in_paise,currency,active,campaign_available,display_order,metadata)
values('customer-support-bpo-career-readiness','Customer Support & BPO Career Readiness','A practical career-readiness programme that strengthens workplace English, customer communication, problem-solving and interview performance for voice, non-voice, support and operations roles.','course',39900,'INR',true,true,55,'{"course_slug":"customer-support-bpo-career-readiness","headline":"Build the communication skills employers expect."}'::jsonb)
on conflict(code) do update set name=excluded.name,description=excluded.description,product_type='course',price_in_paise=39900,currency='INR',active=true,campaign_available=true,display_order=excluded.display_order,metadata=excluded.metadata,updated_at=now();

insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published,skill_tags)
values(${q(course.code)},${q(course.title)},${q(course.description)},'active',${q(course.slug)},${q(course.description)},${q(`${course.description} ${course.outcome}`)},${q(course.category)},'Beginner to interview-ready',${lessons.length},1680,true,${textArray(course.skills)})
on conflict(code) do update set title=excluded.title,description=excluded.description,status='active',slug=excluded.slug,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,difficulty=excluded.difficulty,lesson_count=excluded.lesson_count,estimated_minutes=excluded.estimated_minutes,published=true,skill_tags=excluded.skill_tags,updated_at=now();`];

course.modules.forEach((courseModule,index)=>{
  const moduleTitle=lessons.find(lesson=>lesson.module.endsWith(courseModule.title))?.module??`Module ${index+1} · ${courseModule.title}`;
  sql.push(`insert into public.course_modules(course_id,title,display_order,skill_tags)
select id,${q(moduleTitle)},${index+1},${textArray(courseModule.skills)} from public.courses where code=${q(course.code)}
on conflict(course_id,title) do update set display_order=excluded.display_order,skill_tags=excluded.skill_tags;`);
});

for(const [index,item] of lessons.entries()){
  const moduleIndex=course.modules.findIndex(value=>item.module.endsWith(value.title));
  const courseModule=course.modules[Math.max(0,moduleIndex)];
  const content=buildAuthoredLesson(item);
  const topicOrder=item.topic==="Understand"?1:item.topic==="Apply"?2:item.topic==="Assess"?3:4;
  sql.push(`insert into public.course_topics(module_id,title,display_order)
select module.id,${q(item.topic)},${topicOrder} from public.course_modules module join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)}
on conflict(module_id,title) do update set display_order=excluded.display_order;`);
  sql.push(`insert into public.course_subtopics(topic_id,title,slug,display_order,active)
select topic.id,${q(item.subtopic)},${q(content.identity.slug)},${topicOrder},true from public.course_topics topic join public.course_modules module on module.id=topic.module_id join public.courses course on course.id=module.course_id where course.code=${q(course.code)} and module.title=${q(item.module)} and topic.title=${q(item.topic)}
on conflict(slug) do update set title=excluded.title,active=true;`);
  sql.push(`insert into public.taksh_curriculum(course,module,topic,subtopic,display_order,active,skill_tags)
values(${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${index+1},true,${textArray(courseModule?.skills??course.skills)})
on conflict(course,module,topic,subtopic) do update set display_order=excluded.display_order,active=true,skill_tags=excluded.skill_tags;`);
  sql.push(`update public.taksh_content_assets set title=${q(content.identity.title)},slug=${q(content.identity.slug)},difficulty=${q(content.identity.difficulty)},status='published',content=${q(JSON.stringify(content))}::jsonb,content_version=content_version+1,reviewed_at=now(),approved_at=now(),published_at=now(),skill_tags=${textArray(courseModule?.skills??course.skills)},updated_at=now()
where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived';
insert into public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,content_version,reviewed_at,approved_at,published_at,skill_tags)
select ${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${q(content.identity.title)},${q(content.identity.slug)},${q(content.identity.difficulty)},'published',${q(JSON.stringify(content))}::jsonb,1,now(),now(),now(),${textArray(courseModule?.skills??course.skills)}
where not exists(select 1 from public.taksh_content_assets where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived');`);
  sql.push(`insert into public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
select id,content_version,'authored','Validated Customer Support and BPO course publication',content from public.taksh_content_assets where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status='published'
on conflict(asset_id,version_number) do nothing;`);
}

sql.push(`insert into public.product_courses(product_id,course,display_order)
select id,${q(course.title)},1 from public.products where code='customer-support-bpo-career-readiness'
on conflict(product_id,course) do update set display_order=excluded.display_order;

commit;`);
writeFileSync(output,`${sql.join("\n\n")}\n`);
const batchDirectory=resolve(process.cwd(),".tmp/bpo-course-batches");
mkdirSync(batchDirectory,{recursive:true});
writeFileSync(resolve(batchDirectory,"00-setup.sql"),`${sql.slice(0,course.modules.length+1).join("\n\n")}\ncommit;\n`);
for(let index=0;index<lessons.length;index+=1){
  const offset=course.modules.length+1+index*5;
  writeFileSync(resolve(batchDirectory,`${String(index+1).padStart(2,"0")}-lesson.sql`),`begin;\n${sql.slice(offset,offset+5).join("\n\n")}\ncommit;\n`);
}
writeFileSync(resolve(batchDirectory,`${lessons.length+1}-mapping.sql`),`begin;\n${sql.at(-1)}\n`);
console.log(JSON.stringify({output,modules:course.modules.length,lessons:lessons.length,price:39900}));
