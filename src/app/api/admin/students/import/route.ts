import { requireCollegeAdmin } from "@/lib/admin-scope";
import { parseCsv, studentCsvHeaders } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createToken, hashToken } from "@/lib/security/tokens";
import { mainEnvironment } from "@/lib/env";

type Result={row:number;email:string;ok:boolean;reason?:string};
export async function POST(request:Request){
  const{session,institutionId}=await requireCollegeAdmin();const data=await request.formData();const file=data.get("file");
  if(!(file instanceof File)||file.size>2_000_000)return Response.json({error:"A CSV file under 2 MB is required."},{status:400});
  const rows=parseCsv(await file.text());const headers=(rows.shift()??[]).map(value=>value.toLowerCase().trim());
  if(studentCsvHeaders.some(header=>!headers.includes(header)))return Response.json({error:`Required columns: ${studentCsvHeaders.join(", ")}`},{status:400});
  const seen=new Set<string>();const results:Result[]=[];
  for(const[index,row]of rows.entries()){
    const get=(name:string)=>row[headers.indexOf(name)]?.trim()??"";const name=get("name"),email=get("email").toLowerCase(),studentId=get("student_id"),department=get("department"),academicYear=get("academic_year"),semester=get("semester"),section=get("section"),number=index+2;
    try{
      if(name.length<2||!email.includes("@")||!studentId||!department||!academicYear||!semester||!section)throw new Error("All seven fields are required.");
      if(seen.has(email)||seen.has(`id:${studentId.toLowerCase()}`))throw new Error("Duplicate email or student ID in this file.");seen.add(email);seen.add(`id:${studentId.toLowerCase()}`);
      const scope=await prisma.$queryRaw<Array<{department_id:string;batch_id:string}>>`
        SELECT department.id department_id,batch.id batch_id FROM public.departments department
        JOIN public.academic_batches batch ON batch.department_id=department.id AND batch.institution_id=department.institution_id
        JOIN public.academic_years year ON year.id=batch.academic_year_id JOIN public.semesters term ON term.id=batch.semester_id
        WHERE department.institution_id=${institutionId}::uuid AND lower(department.code)=lower(${department})
          AND lower(year.name)=lower(${academicYear}) AND lower(term.name)=lower(${semester}) AND lower(batch.name)=lower(${section})
          AND department.status='active' AND year.status='active' AND term.status='active' AND batch.status='active' LIMIT 1`;
      if(!scope[0])throw new Error("Department, academic year, semester or section was not found.");
      const duplicate=await prisma.$queryRaw<Array<{id:string}>>`
        SELECT invitation.id FROM public.invitations invitation WHERE lower(invitation.email)=${email} AND invitation.status='pending' AND invitation.expires_at>now()
        UNION ALL SELECT role.user_id FROM public.user_roles role JOIN auth.users account ON account.id=role.user_id WHERE lower(account.email)=${email}
        UNION ALL SELECT membership.user_id FROM public.user_academic_memberships membership WHERE membership.institution_id=${institutionId}::uuid AND lower(membership.roll_number)=lower(${studentId}) LIMIT 1`;
      if(duplicate[0])throw new Error("User, student ID or pending invitation already exists.");
      const invitationId=crypto.randomUUID(),token=createToken(),redirectTo=`${mainEnvironment().NEXT_PUBLIC_APP_URL}/accept-invitation?invitation=${invitationId}&invitation_token=${encodeURIComponent(token)}`;
      const{data:invited,error}=await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:name,invitation_id:invitationId}});
      if(error||!invited.user)throw new Error(error?.message??"Invitation email failed.");
      await prisma.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO public.invitations(id,email,role,institution_id,department_id,batch_id,token_hash,invited_by,expires_at) VALUES(${invitationId}::uuid,${email},'STUDENT',${institutionId}::uuid,${scope[0].department_id}::uuid,${scope[0].batch_id}::uuid,${hashToken(token)},${session.user.id}::uuid,now()+interval '7 days')`;await tx.$executeRaw`INSERT INTO public.user_roles(user_id,role,institution_id,account_status) VALUES(${invited.user.id}::uuid,'STUDENT',${institutionId}::uuid,'invited')`;await tx.$executeRaw`INSERT INTO public.user_academic_memberships(user_id,institution_id,department_id,batch_id,membership_type,roll_number,active) VALUES(${invited.user.id}::uuid,${institutionId}::uuid,${scope[0].department_id}::uuid,${scope[0].batch_id}::uuid,'STUDENT',${studentId},true)`});
      results.push({row:number,email,ok:true});
    }catch(error){results.push({row:number,email,ok:false,reason:error instanceof Error?error.message:"Import failed."})}
  }
  return Response.json({total:results.length,successful:results.filter(item=>item.ok).length,failed:results.filter(item=>!item.ok).length,results});
}
