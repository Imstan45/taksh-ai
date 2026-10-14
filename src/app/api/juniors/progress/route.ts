import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishedJuniorsLessons } from "@/lib/juniors-curriculum";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema=z.object({lessonSlug:z.string().min(1).max(120),status:z.enum(["started","completed"]),progressPercent:z.number().int().min(0).max(100)});
const allowed=new Set(publishedJuniorsLessons.map(item=>item.lesson.slug));

export async function POST(request:Request){const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success||!allowed.has(parsed.data?.lessonSlug??""))return NextResponse.json({error:"Invalid lesson progress"},{status:400});const {lessonSlug,status,progressPercent}=parsed.data;await prisma.$executeRaw`insert into public.juniors_learning_progress(user_id,lesson_slug,status,progress_percent,started_at,completed_at,updated_at) values(${session.user.id}::uuid,${lessonSlug},${status},${progressPercent},now(),case when ${status}='completed' then now() else null end,now()) on conflict(user_id,lesson_slug) do update set status=excluded.status,progress_percent=excluded.progress_percent,completed_at=case when excluded.status='completed' then coalesce(juniors_learning_progress.completed_at,now()) else juniors_learning_progress.completed_at end,updated_at=now()`;return NextResponse.json({ok:true});}
