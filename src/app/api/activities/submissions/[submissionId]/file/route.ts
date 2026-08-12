import { getDownloadUrl } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await auth(); if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { submissionId } = await params;
  const rows = await prisma.$queryRaw<Array<{ file_url: string | null }>>`
    SELECT submission.file_url FROM public.activity_submissions submission
    JOIN public.learning_activities activity ON activity.id=submission.activity_id
    WHERE submission.id=${submissionId}::uuid AND submission.file_url IS NOT NULL AND (
      submission.student_id=${session.user.id}::uuid OR activity.faculty_id=${session.user.id}::uuid OR
      (${session.user.role}='COLLEGE_ADMIN' AND activity.institution_id IN (SELECT institution_id FROM public.user_roles WHERE user_id=${session.user.id}::uuid)) OR
      ${session.user.role}='SUPER_ADMIN') LIMIT 1
  `;
  if (!rows[0]?.file_url) return Response.json({ error: "File not found." }, { status: 404 });
  return Response.redirect(getDownloadUrl(rows[0].file_url));
}
