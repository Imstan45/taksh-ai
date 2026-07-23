import { prisma } from "@/lib/prisma";
import { publishedLessonSchema, type PublishedLessonContent } from "./schema";
import { applySequentialLocks, slugify } from "./logic";
export { applySequentialLocks, slugify } from "./logic";

type OverviewRow = {
  course: string;
  module_count: bigint;
  lesson_count: bigint;
  completed_count: bigint;
  last_subtopic: string | null;
  last_slug: string | null;
  last_viewed_at: Date | null;
};

export type LearningCourse = {
  course: string;
  slug: string;
  moduleCount: number;
  lessonCount: number;
  completedCount: number;
  progress: number;
  lastSubtopic: string | null;
  lastSlug: string | null;
  lastViewedAt: Date | null;
};

export async function getStudentLearningOverview(studentId: string): Promise<LearningCourse[]> {
  const rows = await prisma.$queryRaw<OverviewRow[]>`
    SELECT
      a.course,
      COUNT(DISTINCT a.module) AS module_count,
      COUNT(DISTINCT a.subtopic) AS lesson_count,
      COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN a.subtopic END) AS completed_count,
      (
        SELECT p2.subtopic FROM public.student_content_progress p2
        WHERE p2.student_id = ${studentId}::uuid AND p2.course = a.course
        ORDER BY p2.last_viewed_at DESC NULLS LAST LIMIT 1
      ) AS last_subtopic,
      (
        SELECT ca2.slug FROM public.student_content_progress p2
        JOIN public.taksh_content_assets ca2 ON ca2.id = p2.content_id
        WHERE p2.student_id = ${studentId}::uuid AND p2.course = a.course
        ORDER BY p2.last_viewed_at DESC NULLS LAST LIMIT 1
      ) AS last_slug,
      (
        SELECT p2.last_viewed_at FROM public.student_content_progress p2
        WHERE p2.student_id = ${studentId}::uuid AND p2.course = a.course
        ORDER BY p2.last_viewed_at DESC NULLS LAST LIMIT 1
      ) AS last_viewed_at
    FROM public.taksh_content_assets a
    JOIN public.student_course_assignments sca
      ON sca.student_id = ${studentId}::uuid AND sca.course = a.course AND sca.active = true
    LEFT JOIN public.student_content_progress p
      ON p.student_id = ${studentId}::uuid AND p.subtopic = a.subtopic
    WHERE a.status = 'published'
    GROUP BY a.course
    ORDER BY a.course
  `;

  return rows.map((row) => {
    const lessonCount = Number(row.lesson_count);
    const completedCount = Number(row.completed_count);
    return {
      course: row.course,
      slug: slugify(row.course),
      moduleCount: Number(row.module_count),
      lessonCount,
      completedCount,
      progress: lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0,
      lastSubtopic: row.last_subtopic,
      lastSlug: row.last_slug,
      lastViewedAt: row.last_viewed_at,
    };
  });
}

type CurriculumLessonRow = {
  id: string;
  course: string;
  module: string;
  topic: string;
  subtopic: string;
  title: string;
  slug: string;
  difficulty: string;
  display_order: number;
  progress_status: "not_started" | "in_progress" | "completed" | null;
  progress_percentage: number | null;
};

export type CurriculumLesson = CurriculumLessonRow & { locked: boolean };

export async function getAssignedCourseLessons(studentId: string, courseSlug: string) {
  const assigned = await prisma.$queryRaw<Array<{ course: string }>>`
    SELECT course FROM public.student_course_assignments
    WHERE student_id = ${studentId}::uuid AND active = true
  `;
  const course = assigned.find((item) => slugify(item.course) === courseSlug)?.course;
  if (!course) return null;

  const rows = await prisma.$queryRaw<CurriculumLessonRow[]>`
    SELECT
      a.id, a.course, a.module, a.topic, a.subtopic, a.title, a.slug, a.difficulty,
      COALESCE(c.display_order, 0) AS display_order,
      p.status AS progress_status,
      p.progress_percentage
    FROM public.taksh_content_assets a
    LEFT JOIN public.taksh_curriculum c
      ON c.course = a.course AND c.module = a.module AND c.topic = a.topic AND c.subtopic = a.subtopic
    LEFT JOIN public.student_content_progress p
      ON p.student_id = ${studentId}::uuid AND p.subtopic = a.subtopic
    WHERE a.course = ${course} AND a.status = 'published'
    ORDER BY COALESCE(c.display_order, 0), a.module, a.topic, a.subtopic
  `;

  const lessons = applySequentialLocks(rows);
  return { course, lessons };
}

type PublishedRow = {
  id: string;
  course: string;
  module: string;
  topic: string;
  subtopic: string;
  title: string;
  slug: string;
  difficulty: string;
  content_version: number;
  content: unknown;
  progress_status: "not_started" | "in_progress" | "completed" | null;
  progress_percentage: number | null;
  last_section: string | null;
};

export type PublishedLesson = Omit<PublishedRow, "content"> & { content: PublishedLessonContent };

export async function getPublishedLessonBySubtopic(
  studentId: string,
  subtopicSlug: string,
): Promise<{ lesson: PublishedLesson; nextSlug: string | null } | null> {
  const rows = await prisma.$queryRaw<PublishedRow[]>`
    SELECT
      a.id, a.course, a.module, a.topic, a.subtopic, a.title, a.slug, a.difficulty,
      COALESCE(a.content_version, 1) AS content_version, a.content,
      p.status AS progress_status, p.progress_percentage, p.last_section
    FROM public.taksh_content_assets a
    JOIN public.student_course_assignments sca
      ON sca.student_id = ${studentId}::uuid AND sca.course = a.course AND sca.active = true
    LEFT JOIN public.student_content_progress p
      ON p.student_id = ${studentId}::uuid AND p.subtopic = a.subtopic
    WHERE a.slug = ${subtopicSlug} AND a.status = 'published'
    ORDER BY COALESCE(a.content_version, 1) DESC, a.published_at DESC NULLS LAST, a.updated_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const validation = publishedLessonSchema.safeParse(row.content);
  if (!validation.success) {
    console.error("Published lesson validation failed", row.id, validation.error.flatten());
    return null;
  }

  const course = await getAssignedCourseLessons(studentId, slugify(row.course));
  const index = course?.lessons.findIndex((item) => item.id === row.id) ?? -1;
  const current = course?.lessons[index];
  if (current?.locked) return null;
  const next = index >= 0 ? course?.lessons[index + 1] : null;
  return { lesson: { ...row, content: validation.data }, nextSlug: next?.slug ?? null };
}

export async function getGamification(studentId: string) {
  const rows = await prisma.$queryRaw<Array<{ xp: bigint; streak: number; completed: bigint }>>`
    SELECT
      COALESCE((SELECT SUM(points) FROM public.student_xp_ledger WHERE student_id = ${studentId}::uuid), 0) AS xp,
      COALESCE((SELECT current_streak FROM public.student_streaks WHERE student_id = ${studentId}::uuid), 0) AS streak,
      (SELECT COUNT(*) FROM public.student_content_progress WHERE student_id = ${studentId}::uuid AND status = 'completed') AS completed
  `;
  const xp = Number(rows[0]?.xp ?? 0);
  return { xp, level: Math.floor(xp / 250) + 1, streak: rows[0]?.streak ?? 0, completed: Number(rows[0]?.completed ?? 0) };
}
