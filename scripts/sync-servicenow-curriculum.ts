import { prisma } from "../src/lib/prisma";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { serviceNowCurriculum } from "../src/lib/content-factory/servicenow-curriculum";

async function main() {
  let created = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const [index, row] of serviceNowCurriculum.entries()) {
      await tx.$executeRaw`
        INSERT INTO public.taksh_curriculum(course,module,topic,subtopic,display_order,active)
        VALUES(${row.course},${row.module},${row.topic},${row.subtopic},${index + 1},true)
        ON CONFLICT(course,module,topic,subtopic)
        DO UPDATE SET display_order=excluded.display_order,active=true
      `;
      const content = buildAuthoredLesson(row);
      const serialized = JSON.stringify(content);
      const existing = await tx.$queryRaw<Array<{ id: string; content_version: number }>>`
        SELECT id,content_version FROM public.taksh_content_assets
        WHERE course=${row.course} AND module=${row.module} AND topic=${row.topic}
          AND subtopic=${row.subtopic} AND status<>'archived'
        ORDER BY updated_at DESC LIMIT 1
      `;
      if (existing[0]) {
        const nextVersion = existing[0].content_version + 1;
        await tx.$executeRaw`
          UPDATE public.taksh_content_assets SET title=${content.identity.title},slug=${content.identity.slug},
            difficulty=${content.identity.difficulty},status='published',content=${serialized}::jsonb,
            content_version=${nextVersion},reviewed_at=now(),approved_at=now(),published_at=now(),updated_at=now()
          WHERE id=${existing[0].id}::uuid
        `;
        await tx.$executeRaw`
          INSERT INTO public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
          VALUES(${existing[0].id}::uuid,${nextVersion},'authored','ServiceNow career program source refresh',${serialized}::jsonb)
          ON CONFLICT(asset_id,version_number) DO NOTHING
        `;
        updated++;
      } else {
        const assets = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,reviewed_at,approved_at,published_at)
          VALUES(${row.course},${row.module},${row.topic},${row.subtopic},${content.identity.title},${content.identity.slug},
            ${content.identity.difficulty},'published',${serialized}::jsonb,now(),now(),now()) RETURNING id
        `;
        await tx.$executeRaw`
          INSERT INTO public.taksh_content_versions(asset_id,version_number,change_type,change_note,content)
          VALUES(${assets[0].id}::uuid,1,'authored','Initial ServiceNow career program lesson',${serialized}::jsonb)
        `;
        created++;
      }
    }
  }, { maxWait: 10_000, timeout: 120_000 });
  console.log(JSON.stringify({ synced: serviceNowCurriculum.length, created, updated }));
}

main().finally(() => prisma.$disconnect());
