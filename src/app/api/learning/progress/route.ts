import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  contentId: z.string().uuid(),
  contentVersion: z.number().int().positive(),
  course: z.string().min(1),
  module: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().min(1),
  lastSection: z.string().min(1),
  progressPercentage: z.number().int().min(0).max(100),
  complete: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid progress update" }, { status: 400 });
  const input = parsed.data;

  const access = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM public.taksh_content_assets a
      JOIN public.student_course_assignments sca
        ON sca.course = a.course AND sca.student_id = ${session.user.id}::uuid AND sca.active = true
      WHERE a.id = ${input.contentId}::uuid AND a.status = 'published'
    ) AS allowed
  `;
  if (!access[0]?.allowed) return Response.json({ error: "Lesson unavailable" }, { status: 403 });

  const complete = input.complete === true;
  await prisma.$executeRaw`
    INSERT INTO public.student_content_progress (
      student_id, course, module, topic, subtopic, content_id, content_version,
      status, progress_percentage, last_section, started_at, last_viewed_at, completed_at, updated_at
    ) VALUES (
      ${session.user.id}::uuid, ${input.course}, ${input.module}, ${input.topic}, ${input.subtopic},
      ${input.contentId}::uuid, ${input.contentVersion},
      ${complete ? "completed" : "in_progress"},
      ${complete ? 100 : input.progressPercentage}, ${input.lastSection},
      now(), now(), ${complete ? new Date() : null}, now()
    )
    ON CONFLICT (student_id, subtopic) DO UPDATE SET
      content_id = EXCLUDED.content_id,
      content_version = EXCLUDED.content_version,
      status = CASE WHEN student_content_progress.status = 'completed' THEN 'completed' ELSE EXCLUDED.status END,
      progress_percentage = GREATEST(student_content_progress.progress_percentage, EXCLUDED.progress_percentage),
      last_section = EXCLUDED.last_section,
      last_viewed_at = now(),
      completed_at = COALESCE(student_content_progress.completed_at, EXCLUDED.completed_at),
      updated_at = now()
  `;

  if (complete) {
    await prisma.$executeRaw`
      INSERT INTO public.student_xp_ledger (student_id, event_key, points, reason)
      VALUES (${session.user.id}::uuid, ${`lesson:${input.contentId}:v${input.contentVersion}`}, 50, 'lesson_completed')
      ON CONFLICT (student_id, event_key) DO NOTHING
    `;
    await prisma.$executeRaw`
      INSERT INTO public.student_streaks (student_id, current_streak, longest_streak, last_activity_date, updated_at)
      VALUES (${session.user.id}::uuid, 1, 1, CURRENT_DATE, now())
      ON CONFLICT (student_id) DO UPDATE SET
        current_streak = CASE
          WHEN student_streaks.last_activity_date = CURRENT_DATE THEN student_streaks.current_streak
          WHEN student_streaks.last_activity_date = CURRENT_DATE - 1 THEN student_streaks.current_streak + 1
          ELSE 1
        END,
        longest_streak = GREATEST(student_streaks.longest_streak,
          CASE
            WHEN student_streaks.last_activity_date = CURRENT_DATE THEN student_streaks.current_streak
            WHEN student_streaks.last_activity_date = CURRENT_DATE - 1 THEN student_streaks.current_streak + 1
            ELSE 1
          END),
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    `;
  }

  return Response.json({ ok: true, completed: complete });
}

