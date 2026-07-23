"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

export async function saveFacultyFeedback(formData: FormData) {
  const { session, institutionId } = await requireFaculty();
  const studentId = String(formData.get("studentId") ?? "");
  const course = String(formData.get("course") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 3) throw new Error("Feedback is required.");
  const allowed = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT membership.id FROM public.user_academic_memberships membership
    JOIN public.faculty_assignments assignment ON assignment.faculty_id=${session.user.id}::uuid
      AND assignment.institution_id=membership.institution_id AND assignment.active
      AND (assignment.batch_id IS NULL OR assignment.batch_id=membership.batch_id)
      AND (assignment.cohort_id IS NULL OR assignment.cohort_id=membership.cohort_id)
    WHERE membership.user_id=${studentId}::uuid AND membership.institution_id=${institutionId}::uuid
      AND membership.membership_type='STUDENT' AND membership.active
  `;
  if (!allowed[0]) throw new Error("This learner is not assigned to you.");
  await prisma.$executeRaw`
    INSERT INTO public.faculty_feedback(institution_id,faculty_id,student_id,course,topic,body)
    VALUES(${institutionId}::uuid,${session.user.id}::uuid,${studentId}::uuid,${course || null},${topic || null},${body})
  `;
  revalidatePath(`/admin/faculty/learners/${studentId}`);
}
