import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { launchCatalogueCurriculum, launchCourses } from "../src/lib/content-factory/launch-catalogue";

const output = resolve(process.cwd(), "supabase/migrations/20260901091701_archive_physics_publish_java_uiux.sql");
const java = launchCourses.find((course) => course.code === "JFS-001");
if (!java) throw new Error("Java Full Stack course definition is missing.");
const lessons = launchCatalogueCurriculum.filter((lesson) => lesson.course === java.title);
const q = (value: string) => `'${value.replaceAll("'", "''")}'`;
const textArray = (values: string[]) => `array[${values.map(q).join(",")}]::text[]`;
const sql: string[] = [`begin;

-- Archive, rather than delete, the incomplete physics curriculum.
update public.taksh_curriculum set active=false where course ilike 'Intermediate Physics%';
update public.taksh_content_assets set status='archived',updated_at=now() where course ilike 'Intermediate Physics%' and status<>'archived';
update public.courses set status='archived',published=false,updated_at=now() where title ilike 'Intermediate Physics%';
update public.course_subtopics subtopic set active=false
from public.course_topics topic join public.course_modules module on module.id=topic.module_id join public.courses course on course.id=module.course_id
where subtopic.topic_id=topic.id and course.title ilike 'Intermediate Physics%';

-- UI/UX already has twenty audited lessons; make it a visible, purchasable programme.
insert into public.products(code,name,description,product_type,price_in_paise,currency,active,campaign_available,display_order,metadata)
values('ui-ux-fundamentals','UI/UX Fundamentals','Learn user research, interaction design, accessible visual systems, prototyping, usability testing and portfolio presentation.','course',49900,'INR',true,true,45,'{"course_slug":"ui-ux-fundamentals"}'::jsonb)
on conflict(code) do update set name=excluded.name,description=excluded.description,product_type=excluded.product_type,price_in_paise=excluded.price_in_paise,currency=excluded.currency,active=true,campaign_available=true,display_order=excluded.display_order,metadata=excluded.metadata,updated_at=now();
insert into public.product_courses(product_id,course,display_order)
select id,'UI/UX Fundamentals',1 from public.products where code='ui-ux-fundamentals'
on conflict(product_id,course) do update set display_order=excluded.display_order;
insert into public.product_courses(product_id,course,display_order)
select id,'UI/UX Fundamentals',7 from public.products where code='complete-placement-bundle'
on conflict(product_id,course) do update set display_order=excluded.display_order;

-- Restore the Java catalogue record and publish its reviewed full-stack pathway.
insert into public.courses(code,title,description,status,slug,short_description,full_description,category,difficulty,lesson_count,estimated_minutes,published,skill_tags)
values(${q(java.code)},${q(java.title)},${q(java.description)},'active',${q(java.slug)},${q(java.description)},${q(`${java.description} ${java.outcome}`)},${q(java.category)},'Beginner to job-ready',25,660,true,${textArray(java.skills)})
on conflict(code) do update set title=excluded.title,description=excluded.description,status='active',slug=excluded.slug,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,difficulty=excluded.difficulty,lesson_count=excluded.lesson_count,estimated_minutes=excluded.estimated_minutes,published=true,skill_tags=excluded.skill_tags,updated_at=now();`];

java.modules.forEach((module, index) => {
  const moduleTitle = lessons.find((lesson) => lesson.module.endsWith(module.title))?.module ?? `Module ${index + 1} · ${module.title}`;
  sql.push(`insert into public.course_modules(course_id,title,display_order,skill_tags)
select id,${q(moduleTitle)},${index + 1},${textArray(module.skills)} from public.courses where code=${q(java.code)}
on conflict(course_id,title) do update set display_order=excluded.display_order,skill_tags=excluded.skill_tags;`);
});

for (const [index, item] of lessons.entries()) {
  const moduleIndex = java.modules.findIndex((module) => item.module.endsWith(module.title));
  const courseModule = java.modules[Math.max(0, moduleIndex)];
  const content = buildAuthoredLesson(item);
  const topicOrder = item.topic === "Understand" ? 1 : item.topic === "Apply" ? 2 : item.topic === "Assess" ? 3 : 4;
  sql.push(`insert into public.course_topics(module_id,title,display_order)
select module.id,${q(item.topic)},${topicOrder} from public.course_modules module join public.courses course on course.id=module.course_id where course.code=${q(java.code)} and module.title=${q(item.module)}
on conflict(module_id,title) do update set display_order=excluded.display_order;`);
  sql.push(`insert into public.course_subtopics(topic_id,title,slug,display_order,active)
select topic.id,${q(item.subtopic)},${q(content.identity.slug)},${topicOrder},true from public.course_topics topic join public.course_modules module on module.id=topic.module_id join public.courses course on course.id=module.course_id where course.code=${q(java.code)} and module.title=${q(item.module)} and topic.title=${q(item.topic)}
on conflict(slug) do update set title=excluded.title,active=true;`);
  sql.push(`insert into public.taksh_curriculum(course,module,topic,subtopic,display_order,active,skill_tags)
values(${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${index + 1},true,${textArray(courseModule?.skills ?? java.skills)})
on conflict(course,module,topic,subtopic) do update set display_order=excluded.display_order,active=true,skill_tags=excluded.skill_tags;`);
  sql.push(`update public.taksh_content_assets set course=${q(item.course)},module=${q(item.module)},topic=${q(item.topic)},subtopic=${q(item.subtopic)},title=${q(content.identity.title)},slug=${q(content.identity.slug)},difficulty=${q(content.identity.difficulty)},status='published',content=${q(JSON.stringify(content))}::jsonb,content_version=content_version+1,reviewed_at=now(),approved_at=now(),published_at=now(),skill_tags=${textArray(courseModule?.skills ?? java.skills)},updated_at=now()
where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived';
insert into public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,content_version,reviewed_at,approved_at,published_at,skill_tags)
select ${q(item.course)},${q(item.module)},${q(item.topic)},${q(item.subtopic)},${q(content.identity.title)},${q(content.identity.slug)},${q(content.identity.difficulty)},'published',${q(JSON.stringify(content))}::jsonb,1,now(),now(),now(),${textArray(courseModule?.skills ?? java.skills)}
where not exists(select 1 from public.taksh_content_assets where course=${q(item.course)} and module=${q(item.module)} and topic=${q(item.topic)} and subtopic=${q(item.subtopic)} and status<>'archived');`);
  sql.push(`insert into public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
select id,content_version,'authored','Validated Java Full Stack curriculum publication',content from public.taksh_content_assets where slug=${q(content.identity.slug)}
on conflict(asset_id,version_number) do nothing;`);
}

sql.push(`insert into public.product_courses(product_id,course,display_order)
select id,'Java Full Stack',1 from public.products where code='java-full-stack'
on conflict(product_id,course) do update set display_order=excluded.display_order;
insert into public.product_courses(product_id,course,display_order)
select id,'Java Full Stack',4 from public.products where code='complete-placement-bundle'
on conflict(product_id,course) do update set display_order=excluded.display_order;

commit;`);

writeFileSync(output, `${sql.join("\n\n")}\n`);
const batchDirectory = resolve(process.cwd(), ".tmp/java-uiux-repair-batches");
mkdirSync(batchDirectory, { recursive: true });
writeFileSync(resolve(batchDirectory, "00-setup.sql"), `${sql.slice(0, 9).join("\n\n")}\ncommit;\n`);
for (let index = 0; index < lessons.length; index += 1) {
  const offset = 9 + index * 5;
  writeFileSync(resolve(batchDirectory, `${String(index + 1).padStart(2, "0")}-lesson.sql`), `begin;\n${sql.slice(offset, offset + 5).join("\n\n")}\ncommit;\n`);
}
writeFileSync(resolve(batchDirectory, "26-mappings.sql"), `begin;\n${sql.at(-1)}\n`);
console.log(JSON.stringify({ output, javaLessons: lessons.length, uiuxLessonsReviewed: 20, archivedCourse: "Intermediate Physics – EAPCET, JEE Main and JEE Advanced" }));
