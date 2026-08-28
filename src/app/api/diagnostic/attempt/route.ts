import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markSalesAttribution } from "@/lib/sales-challenge/attribution";

const beginSchema = z.object({ technicalTrack: z.enum(["python-full-stack", "java-full-stack", "servicenow", "general-it"]),mode:z.enum(["primary","verification"]).default("primary") });
const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];
type Attempt = {id:string;question_ids:string[];option_orders:Record<string,OptionKey[]>;answers:Record<string,OptionKey>;started_at:Date;expires_at:Date;status:string;technical_track:string;duration_seconds:number;stage:string;readiness_status:string|null};
type Question = {id:string;question_text:string;category:string;subcategory:string;difficulty:number;option_a:string;option_b:string;option_c:string;option_d:string};

function shuffledOptionKeys():OptionKey[]{const keys=[...OPTION_KEYS];for(let i=keys.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]]}return keys}

async function currentAttempt(userId:string){return (await prisma.$queryRaw<Attempt[]>`select id,question_ids,option_orders,answers,started_at,expires_at,status,technical_track,duration_seconds,stage,readiness_status from public.diagnostic_attempts where student_id=${userId}::uuid and config_code='placement-readiness-v1' and status='IN_PROGRESS' order by created_at desc limit 1`)[0]}

async function responseFor(attempt:Attempt){
  const questions=await prisma.$queryRaw<Question[]>`select id,question_text,category,subcategory,difficulty,option_a,option_b,option_c,option_d from public.diagnostic_questions where id=any(${attempt.question_ids}::text[])`;
  const map=new Map(questions.map(question=>[question.id,question]));
  if(questions.length!==attempt.question_ids.length)return Response.json({error:"This assessment paper is no longer available. Contact support."},{status:409});
  return Response.json({attemptId:attempt.id,startedAt:attempt.started_at,expiresAt:attempt.expires_at,serverNow:new Date(),answers:attempt.answers,technicalTrack:attempt.technical_track,durationSeconds:attempt.duration_seconds,stage:attempt.stage,questions:attempt.question_ids.map((id,index)=>{const question=map.get(id)!;const source:Record<OptionKey,string>={A:question.option_a,B:question.option_b,C:question.option_c,D:question.option_d};const order=attempt.option_orders[id]??OPTION_KEYS;return{number:index+1,id,question:question.question_text,category:question.category,subcategory:question.subcategory,difficulty:Number(question.difficulty),options:Object.fromEntries(OPTION_KEYS.map((key,i)=>[key,source[order[i]]]))}})});
}

export async function GET(){const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return Response.json({error:"Unauthorized"},{status:401});const attempt=await currentAttempt(session.user.id);if(attempt)return responseFor(attempt);const status=(await prisma.$queryRaw<Array<{readiness_status:string;technical_track:string|null}>>`select readiness_status,technical_track from public.candidate_readiness where user_id=${session.user.id}::uuid`)[0];return Response.json({attempt:null,verificationRequired:status?.readiness_status==="VERIFICATION_REQUIRED",technicalTrack:status?.technical_track})}

export async function POST(request:Request){
  const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return Response.json({error:"Unauthorized"},{status:401});
  const parsed=beginSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Choose a valid technical track."},{status:400});
  const existing=await currentAttempt(session.user.id);if(existing)return responseFor(existing);
  const config=(await prisma.$queryRaw<Array<{duration_seconds:number;verification_duration_seconds:number;question_count:number}>>`select duration_seconds,verification_duration_seconds,question_count from public.readiness_assessment_configs where code='placement-readiness-v1' and active limit 1`)[0];
  if(!config)return Response.json({error:"Placement assessment is not configured."},{status:503});
  const verification=parsed.data.mode==="verification";let parentId:string|null=null;if(verification){const parent=(await prisma.$queryRaw<Array<{latest_attempt_id:string;readiness_status:string;technical_track:string|null}>>`select latest_attempt_id,readiness_status,technical_track from public.candidate_readiness where user_id=${session.user.id}::uuid`)[0];if(!parent||parent.readiness_status!=="VERIFICATION_REQUIRED")return Response.json({error:"A verification assessment is not required for this account."},{status:409});parentId=parent.latest_attempt_id}
  if(!verification){const eligibility=(await prisma.$queryRaw<Array<{completed:boolean;retest:boolean}>>`select exists(select 1 from public.diagnostic_attempts where student_id=${session.user.id}::uuid and config_code='placement-readiness-v1' and stage='primary' and status in('COMPLETED','TIME_EXPIRED')) completed,exists(select 1 from public.entitlements entitlement join public.product_features feature on feature.product_id=entitlement.product_id where entitlement.user_id=${session.user.id}::uuid and entitlement.status='active' and (entitlement.expires_at is null or entitlement.expires_at>now()) and feature.feature_code='readiness_retests') retest`)[0];if(eligibility.completed&&!eligibility.retest)return Response.json({error:"Your assessment attempt is complete. Reassessment requires eligible learning progress or administrator authorization."},{status:403})}
  const salt=`${session.user.id}:${Date.now()}`;
  const selected=verification?await prisma.$queryRaw<Array<{id:string}>>`
    (select id from public.diagnostic_questions where active and approved and pool_type='verification' and category='quantitative_aptitude' order by md5(id||${salt}) limit 3) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='verification' and category='logical_reasoning' order by md5(id||${salt}) limit 2) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='verification' and category='english_verbal' order by md5(id||${salt}) limit 2) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='verification' and category='database_technical' and technical_track in (${parsed.data.technicalTrack},'general-it') order by (technical_track=${parsed.data.technicalTrack}) desc,md5(id||${salt}) limit 3)`:await prisma.$queryRaw<Array<{id:string}>>`
    (select id from public.diagnostic_questions where active and approved and pool_type='primary' and category='quantitative_aptitude' order by md5(id||${salt}) limit 10) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='primary' and category='logical_reasoning' order by md5(id||${salt}) limit 8) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='primary' and category='english_verbal' order by md5(id||${salt}) limit 8) union all
    (select id from public.diagnostic_questions where active and approved and pool_type='primary' and category='database_technical' and technical_track in (${parsed.data.technicalTrack},'general-it') order by (technical_track=${parsed.data.technicalTrack}) desc,md5(id||${salt}) limit 14)`;
  const expected=verification?10:config.question_count;if(selected.length!==expected)return Response.json({error:`Question bank is incomplete (${selected.length}/${expected} available).`},{status:503});
  const ids=selected.map(item=>item.id).sort(()=>Math.random()-.5),orders=Object.fromEntries(ids.map(id=>[id,shuffledOptionKeys()]));
  const duration=verification?config.verification_duration_seconds:config.duration_seconds,stage=verification?"verification":"primary",assessmentId=verification?"placement-verification-v1":"placement-readiness-v1";
  const attempt=(await prisma.$queryRaw<Attempt[]>`insert into public.diagnostic_attempts(student_id,assessment_id,config_code,technical_track,stage,parent_attempt_id,question_ids,option_orders,status,duration_seconds,expires_at) values(${session.user.id}::uuid,${assessmentId},'placement-readiness-v1',${parsed.data.technicalTrack},${stage},${parentId}::uuid,${ids}::text[],${JSON.stringify(orders)}::jsonb,'IN_PROGRESS',${duration},now()+make_interval(secs=>${duration})) returning id,question_ids,option_orders,answers,started_at,expires_at,status,technical_track,duration_seconds,stage,readiness_status`)[0];
  await prisma.$executeRaw`insert into public.product_events(user_id,event_name,properties) values(${session.user.id}::uuid,${verification?"verification_started":"diagnostic_started"},${JSON.stringify({assessment:assessmentId,technicalTrack:parsed.data.technicalTrack})}::jsonb)`;
  await markSalesAttribution(session.user.id,"assessment_started");
  return responseFor(attempt);
}
