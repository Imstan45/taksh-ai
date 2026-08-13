import { prisma } from "@/lib/prisma";
import { requireFactorySession } from "@/lib/content-factory/auth";
import { authoredCurriculum, buildAuthoredLesson } from "@/lib/content-factory/authored-curriculum";

export async function POST(request:Request){
  const session=await requireFactorySession(request); if(!session)return Response.json({error:"Forbidden"},{status:403});
  const result=await prisma.$transaction(async(tx)=>{let created=0,preserved=0;for(let index=0;index<authoredCurriculum.length;index++){const row=authoredCurriculum[index];await tx.$executeRaw`
    INSERT INTO public.taksh_curriculum(course,module,topic,subtopic,display_order,active)
    VALUES(${row.course},${row.module},${row.topic},${row.subtopic},${index+1},true)
    ON CONFLICT(course,module,topic,subtopic) DO UPDATE SET display_order=excluded.display_order,active=true
  `;
    const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.taksh_content_assets WHERE course=${row.course} AND module=${row.module} AND topic=${row.topic} AND subtopic=${row.subtopic} AND status<>'archived' ORDER BY updated_at DESC LIMIT 1`;
    if(existing[0]){preserved++;continue}
    const content=buildAuthoredLesson(row), serialized=JSON.stringify(content);
    const assets=await tx.$queryRaw<Array<{id:string}>>`
      INSERT INTO public.taksh_content_assets(course,module,topic,subtopic,title,slug,difficulty,status,content,created_by,reviewed_by,approved_by,published_by,reviewed_at,approved_at,published_at)
      VALUES(${row.course},${row.module},${row.topic},${row.subtopic},${content.identity.title},${content.identity.slug},${content.identity.difficulty},'published',${serialized}::jsonb,${session.sub}::uuid,${session.sub}::uuid,${session.sub}::uuid,${session.sub}::uuid,now(),now(),now()) RETURNING id
    `;
    await tx.$executeRaw`INSERT INTO public.taksh_content_versions(asset_id,version_number,change_type,change_note,content,created_by) VALUES(${assets[0].id}::uuid,1,'authored','Initial deterministic Taksh lesson',${serialized}::jsonb,${session.sub}::uuid)`;
    created++;
  } return {created,preserved}});
  return Response.json({synced:authoredCurriculum.length,...result});
}
