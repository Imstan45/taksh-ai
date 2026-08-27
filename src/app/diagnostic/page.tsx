import {redirect} from "next/navigation";
import {z} from "zod";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {SkillDiagnostic} from "@/components/diagnostic/skill-diagnostic";

export const metadata={title:"45-Minute Placement Readiness Assessment"};
const campaignIdSchema=z.string().uuid();

export default async function Page({searchParams}:{searchParams:Promise<{source?:string;medium?:string;campaign?:string;campaign_id?:string}>}){
  const session=await auth(),query=await searchParams;
  if(!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/diagnostic?${new URLSearchParams(query as Record<string,string>)}`)}`);
  if(session.user.role!=="STUDENT") redirect("/dashboard");
  const campaignId=campaignIdSchema.safeParse(query.campaign_id);
  if(campaignId.success){
    const eligible=await prisma.$queryRaw<Array<{id:string}>>`select id from public.campaigns where id=${campaignId.data}::uuid and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) limit 1`;
    if(eligible[0]) await prisma.$executeRaw`insert into public.campaign_attributions(user_id,campaign_id,source,medium,campaign_code,landing_page,diagnostic_started_at) values(${session.user.id}::uuid,${campaignId.data}::uuid,${query.source||null},${query.medium||null},${query.campaign||null},'/assessment/job-readiness',now()) on conflict(user_id,campaign_id) where user_id is not null and campaign_id is not null do update set diagnostic_started_at=coalesce(campaign_attributions.diagnostic_started_at,now())`;
  }
  return <main className="min-h-screen bg-[#08090e] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-6xl"><SkillDiagnostic/></div></main>;
}
