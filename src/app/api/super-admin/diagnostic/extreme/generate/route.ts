import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateValidatedExtremeBank } from "@/lib/readiness/extreme-question-generation";

export const runtime="nodejs";
export const maxDuration=300;

export async function POST(){
  const session=await auth();if(!session?.user||session.user.role!=="SUPER_ADMIN")return Response.json({error:"Forbidden"},{status:403});
  try{
    const existing=await prisma.$queryRaw<Array<{question_text:string}>>`select question_text from public.diagnostic_questions where difficulty_label<>'extreme'`;
    const questions=await generateValidatedExtremeBank(existing.map(item=>item.question_text));
    await prisma.$transaction(async tx=>{
      await tx.$executeRaw`update public.diagnostic_questions set active=false where difficulty_label='extreme'`;
      await tx.$executeRaw`delete from public.diagnostic_questions where difficulty_label='extreme' and not exists(select 1 from public.diagnostic_attempts where question_ids @> array[diagnostic_questions.id]::text[])`;
      for(const [index,question] of questions.entries()){
        const options=[...question.options.slice(index%4),...question.options.slice(0,index%4)],correct="ABCD"[options.indexOf(question.options[question.correctIndex])];
        await tx.$executeRaw`insert into public.diagnostic_questions(id,question_text,category,subcategory,difficulty,difficulty_label,option_a,option_b,option_c,option_d,correct_answer,explanation,estimated_time_seconds,active,technical_track,pool_type,competency,approved) values(${`extreme-${crypto.randomUUID()}`},${question.question},${question.category},${question.subcategory},4,'extreme',${options[0]},${options[1]},${options[2]},${options[3]},${correct},${question.explanation},${question.estimatedTimeSeconds},true,${question.category==="database_technical"?"general-it":null},'primary',${question.competency},true)`;
      }
      await tx.$executeRaw`insert into public.audit_logs(actor_id,action,target_type,target_id,new_values) values(${session.user.id}::uuid,'diagnostic.extreme_bank_generated','diagnostic_question_bank','extreme',${JSON.stringify({count:questions.length,validated:true,modelReview:true})}::jsonb)`;
    },{timeout:120000});
    return Response.json({ok:true,inserted:questions.length,distribution:Object.fromEntries(["quantitative_aptitude","logical_reasoning","english_verbal","database_technical"].map(category=>[category,questions.filter(question=>question.category===category).length]))});
  }catch(error){console.error("Extreme diagnostic generation failed",error);return Response.json({error:error instanceof Error?error.message:"Generation failed."},{status:422})}
}
