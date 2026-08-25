import { prisma } from "@/lib/prisma";

export const CAREER_STARTER_PLAN_CODE="career_starter";
export const CAREER_STARTER_COURSES=["Python Fundamentals","Prompt Engineering Fundamentals","UI/UX Fundamentals","ServiceNow ITSM, Development & GenAI Career Program","Logical Reasoning","English Proficiency"] as const;

export async function hasCareerStarterAccess(userId:string){
  const rows=await prisma.$queryRaw<Array<{allowed:boolean}>>`select exists(
    select 1 from public.entitlements e join public.plan_course_entitlements m on m.plan_id=e.plan_id
    where e.user_id=${userId}::uuid and e.status='active' and e.expires_at>now()
  ) allowed`;
  return Boolean(rows[0]?.allowed);
}

export async function setCareerStarterTestAccess(userId:string,enabled:boolean,adminId:string){
  return prisma.$transaction(async tx=>{
    const plans=await tx.$queryRaw<Array<{id:string;duration_days:number}>>`select id,duration_days from public.plans where code=${CAREER_STARTER_PLAN_CODE} limit 1`;
    const plan=plans[0]; if(!plan) throw new Error("Career Starter plan is not configured");
    if(enabled){
      await tx.$executeRaw`insert into public.entitlements(user_id,plan_id,payment_id,starts_at,expires_at,status,grant_source,granted_by)
        values(${userId}::uuid,${plan.id}::uuid,null,now(),now()+(${plan.duration_days}||' days')::interval,'active','admin_test',${adminId}::uuid)
        on conflict(user_id,plan_id) where status='active' do update set expires_at=excluded.expires_at,grant_source='admin_test',granted_by=excluded.granted_by`;
    }else{
      await tx.$executeRaw`update public.entitlements set status='revoked' where user_id=${userId}::uuid and plan_id=${plan.id}::uuid and status='active' and grant_source='admin_test'`;
      await tx.$executeRaw`update public.student_course_assignments a set active=false,revoked_at=now()
        where a.student_id=${userId}::uuid and a.course in (select course from public.plan_course_entitlements where plan_id=${plan.id}::uuid)
        and not exists(select 1 from public.entitlements e join public.plan_course_entitlements m on m.plan_id=e.plan_id where e.user_id=a.student_id and m.course=a.course and e.status='active' and e.expires_at>now())`;
    }
  });
}
