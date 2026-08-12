"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function createLearningActivity(formData: FormData) {
  const { session, institutionId } = await requireFaculty();
  const batchId = value(formData, "batchId");
  const course = value(formData, "course");
  const title = value(formData, "title");
  const description = value(formData, "description");
  const activityType = value(formData, "activityType");
  const dueAt = value(formData, "dueAt");
  const maxMarks = Number(value(formData, "maxMarks"));
  const status = value(formData, "status");
  if (!batchId || !course || title.length < 3 || !description || !["homework", "classwork", "assignment"].includes(activityType)) throw new Error("Complete all required activity fields.");
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) throw new Error("Maximum marks must be greater than zero.");
  if (!["draft", "published"].includes(status)) throw new Error("Invalid activity status.");
  const scope = await prisma.$queryRaw<Array<{ department_id: string | null }>>`
    SELECT batch.department_id FROM public.faculty_assignments assignment
    JOIN public.academic_batches batch ON batch.id=${batchId}::uuid AND batch.institution_id=assignment.institution_id AND batch.status='active'
    WHERE assignment.faculty_id=${session.user.id}::uuid AND assignment.institution_id=${institutionId}::uuid
      AND assignment.active AND (assignment.batch_id IS NULL OR assignment.batch_id=batch.id)
      AND (assignment.course IS NULL OR assignment.course=${course}) LIMIT 1
  `;
  if (!scope[0]) throw new Error("This class and course are not assigned to you.");
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO public.learning_activities(institution_id,faculty_id,department_id,batch_id,course,title,description,activity_type,due_at,max_marks,status,published_at)
    VALUES(${institutionId}::uuid,${session.user.id}::uuid,${scope[0].department_id}::uuid,${batchId}::uuid,${course},${title},${description},${activityType},${dueAt || null}::timestamptz,${maxMarks},${status},${status === "published" ? new Date() : null}) RETURNING id
  `;
  if (status === "published") {
    await prisma.$executeRaw`
      INSERT INTO public.notifications(user_id,institution_id,notification_type,title,message,href)
      SELECT membership.user_id,${institutionId}::uuid,'activity_assigned',${`New ${activityType}: ${title}`},${course},${`/student/activities/${rows[0].id}`}
      FROM public.user_academic_memberships membership JOIN public.user_roles role ON role.user_id=membership.user_id
      WHERE membership.institution_id=${institutionId}::uuid AND membership.batch_id=${batchId}::uuid
        AND membership.membership_type='STUDENT' AND membership.active AND role.account_status='active'
    `;
  }
  revalidatePath("/admin/faculty/activities");
  revalidatePath("/admin/faculty");
}

export async function setActivityStatus(formData: FormData) {
  const { session, institutionId } = await requireFaculty();
  const id = value(formData, "id");
  const status = value(formData, "status");
  if (!['published', 'closed', 'archived'].includes(status)) throw new Error("Invalid activity status.");
  const changed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ batch_id: string | null; student_id: string | null; activity_type: string; title: string; course: string; status: string }>>`
      SELECT batch_id,student_id,activity_type,title,course,status FROM public.learning_activities
      WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid AND faculty_id=${session.user.id}::uuid FOR UPDATE
    `;
    const activity = rows[0];
    if (!activity) return false;
    await tx.$executeRaw`
      UPDATE public.learning_activities SET status=${status},published_at=CASE WHEN ${status}='published' THEN coalesce(published_at,now()) ELSE published_at END,updated_at=now()
      WHERE id=${id}::uuid
    `;
    if (status === "published" && activity.status !== "published") {
      await tx.$executeRaw`
        INSERT INTO public.notifications(user_id,institution_id,notification_type,title,message,href)
        SELECT role.user_id,${institutionId}::uuid,'activity_assigned',${`New ${activity.activity_type}: ${activity.title}`},${activity.course},${`/student/activities/${id}`}
        FROM public.user_roles role
        LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
        WHERE role.institution_id=${institutionId}::uuid AND role.role='STUDENT' AND role.account_status='active'
          AND (role.user_id=activity.student_id OR (activity.student_id IS NULL AND membership.batch_id=activity.batch_id))
        GROUP BY role.user_id
      `;
    }
    return true;
  });
  if (!changed) throw new Error("Activity was not found in your teaching scope.");
  revalidatePath("/admin/faculty/activities");
  revalidatePath(`/admin/faculty/activities/${id}`);
}

export async function gradeSubmission(formData: FormData) {
  const { session, institutionId } = await requireFaculty();
  const submissionId = value(formData, "submissionId");
  const marks = Number(value(formData, "marks"));
  const grade = value(formData, "grade");
  const feedback = value(formData, "feedback");
  const rows = await prisma.$queryRaw<Array<{ activity_id: string; student_id: string; max_marks: number; title: string }>>`
    SELECT submission.activity_id,submission.student_id,activity.max_marks::float max_marks,activity.title
    FROM public.activity_submissions submission JOIN public.learning_activities activity ON activity.id=submission.activity_id
    WHERE submission.id=${submissionId}::uuid AND activity.institution_id=${institutionId}::uuid
      AND activity.faculty_id=${session.user.id}::uuid AND submission.status IN ('submitted','late','returned') FOR UPDATE OF submission
  `;
  const target = rows[0];
  if (!target) throw new Error("Submission is outside your teaching scope or cannot be graded.");
  if (!Number.isFinite(marks) || marks < 0 || marks > target.max_marks) throw new Error(`Marks must be between 0 and ${target.max_marks}.`);
  await prisma.$transaction([
    prisma.$executeRaw`UPDATE public.activity_submissions SET marks=${marks},grade=${grade || null},feedback=${feedback || null},status='graded',graded_by=${session.user.id}::uuid,graded_at=now(),updated_at=now() WHERE id=${submissionId}::uuid`,
    prisma.$executeRaw`INSERT INTO public.notifications(user_id,institution_id,notification_type,title,message,href) VALUES(${target.student_id}::uuid,${institutionId}::uuid,'submission_graded',${`Graded: ${target.title}`},${`${marks}/${target.max_marks}${grade ? ` · ${grade}` : ""}`},${`/student/activities/${target.activity_id}`})`,
  ]);
  revalidatePath(`/admin/faculty/activities/${target.activity_id}`);
  revalidatePath(`/student/activities/${target.activity_id}`);
}
