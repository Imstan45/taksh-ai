"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

export async function createAssessment(formData: FormData) {
  const { session,institutionId }=await requireFaculty();
  const title=String(formData.get("title")??"").trim(), course=String(formData.get("course")??"").trim();
  const batchId=String(formData.get("batchId")??""), studentId=String(formData.get("studentId")??"");
  const questionIds=formData.getAll("questionId").map(String);
  const duration=Number(formData.get("duration")??30),maxAttempts=Number(formData.get("maxAttempts")??1),pass=Number(formData.get("pass")??60);
  const from=String(formData.get("availableFrom")??""),until=String(formData.get("availableUntil")??"");
  if(!title||!course||!questionIds.length||(!batchId&&!studentId)) throw new Error("Title, course, questions and assignment target are required.");
  const scope=await prisma.$queryRaw<Array<{ok:boolean}>>`
    SELECT true ok FROM public.institution_course_access access
    WHERE access.institution_id=${institutionId}::uuid AND access.course=${course} AND access.active
      AND (${batchId}='' OR EXISTS(SELECT 1 FROM public.faculty_assignments assignment WHERE assignment.faculty_id=${session.user.id}::uuid AND assignment.batch_id=${batchId || null}::uuid AND assignment.active))
      AND (${studentId}='' OR EXISTS(SELECT 1 FROM public.user_roles role WHERE role.user_id=${studentId || null}::uuid AND role.institution_id=${institutionId}::uuid AND role.role='STUDENT'))
  `;
  if(!scope[0]) throw new Error("Assessment target or course is outside your assigned scope.");
  await prisma.$transaction(async tx=>{
    const created=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO public.assessments(institution_id,created_by,title,instructions,course,duration_minutes,max_attempts,pass_percentage,available_from,available_until)
      VALUES(${institutionId}::uuid,${session.user.id}::uuid,${title},${String(formData.get("instructions")??"")},${course},${duration},${maxAttempts},${pass},${from||null}::timestamptz,${until||null}::timestamptz) RETURNING id`;
    for(const [index,id] of questionIds.entries()) await tx.$executeRaw`INSERT INTO public.assessment_questions(assessment_id,question_id,display_order) VALUES(${created[0].id}::uuid,${id}::uuid,${index})`;
    await tx.$executeRaw`INSERT INTO public.assessment_assignments(assessment_id,institution_id,batch_id,student_id,assigned_by)
      VALUES(${created[0].id}::uuid,${institutionId}::uuid,${batchId||null}::uuid,${studentId||null}::uuid,${session.user.id}::uuid)`;
  });
  revalidatePath("/admin/faculty/assessments");
}

export async function setAssessmentStatus(formData:FormData){
  const {session,institutionId}=await requireFaculty(); const id=String(formData.get("id")??""),status=String(formData.get("status")??"");
  if(!["published","closed","archived"].includes(status)) throw new Error("Invalid assessment state.");
  const changed=await prisma.$executeRaw`UPDATE public.assessments SET status=${status},published_at=CASE WHEN ${status}='published' THEN now() ELSE published_at END,updated_at=now() WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid AND created_by=${session.user.id}::uuid`;
  if(!changed) throw new Error("Assessment not found.");
  revalidatePath("/admin/faculty/assessments");
}
