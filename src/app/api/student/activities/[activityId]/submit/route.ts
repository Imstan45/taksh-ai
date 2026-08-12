import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteActivityFile, uploadActivityFile } from "@/lib/storage/activity";

export async function POST(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT" || session.user.accountStatus !== "active") return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { activityId } = await params;
  const form = await request.formData();
  const textContent = String(form.get("textContent") ?? "").trim();
  const file = form.get("file");
  const activities = await prisma.$queryRaw<Array<{ due_at: Date | null; allow_resubmission: boolean; existing_status: string | null; file_key: string | null }>>`
    SELECT activity.due_at,activity.allow_resubmission,submission.status existing_status,submission.file_key
    FROM public.learning_activities activity
    LEFT JOIN public.user_academic_memberships membership ON membership.user_id=${session.user.id}::uuid AND membership.active
    LEFT JOIN public.activity_submissions submission ON submission.activity_id=activity.id AND submission.student_id=${session.user.id}::uuid
    WHERE activity.id=${activityId}::uuid AND activity.status='published'
      AND (activity.student_id=${session.user.id}::uuid OR activity.batch_id=membership.batch_id) LIMIT 1
  `;
  const activity = activities[0];
  if (!activity) return Response.json({ error: "Activity is unavailable." }, { status: 403 });
  if (activity.existing_status === "graded") return Response.json({ error: "Graded work cannot be resubmitted." }, { status: 409 });
  if (activity.existing_status && !activity.allow_resubmission) return Response.json({ error: "Resubmission is disabled." }, { status: 409 });
  if (!textContent && !(file instanceof File && file.size > 0) && !activity.file_key) return Response.json({ error: "Enter an answer or attach a file." }, { status: 400 });
  let uploaded: { url: string; key: string; name: string } | null = null;
  try {
    if (file instanceof File && file.size > 0) uploaded = await uploadActivityFile(session.user.id, activityId, file);
    const status = activity.due_at && activity.due_at.getTime() < Date.now() ? "late" : "submitted";
    await prisma.$executeRaw`
      INSERT INTO public.activity_submissions(activity_id,student_id,text_content,file_url,file_key,file_name,status,submitted_at)
      VALUES(${activityId}::uuid,${session.user.id}::uuid,${textContent},${uploaded?.url ?? null},${uploaded?.key ?? null},${uploaded?.name ?? null},${status},now())
      ON CONFLICT(activity_id,student_id) DO UPDATE SET text_content=excluded.text_content,
        file_url=coalesce(excluded.file_url,activity_submissions.file_url),file_key=coalesce(excluded.file_key,activity_submissions.file_key),
        file_name=coalesce(excluded.file_name,activity_submissions.file_name),status=excluded.status,submitted_at=now(),updated_at=now()
    `;
    if (uploaded) await deleteActivityFile(activity.file_key);
    return Response.json({ ok: true, status });
  } catch (error) {
    if (uploaded) await deleteActivityFile(uploaded.key);
    console.error("Activity submission failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Submission failed." }, { status: 400 });
  }
}
