import { prisma } from "@/lib/prisma";
import { publishedJuniorsLessons } from "@/lib/juniors-curriculum";

export type JuniorsProgress = { lesson_slug: string; status: string; progress_percent: number; updated_at: Date };

export async function getJuniorsProgress(userId: string) {
  return prisma.$queryRaw<JuniorsProgress[]>`
    select lesson_slug, status, progress_percent, updated_at
    from public.juniors_learning_progress
    where user_id = ${userId}::uuid
    order by updated_at desc
  `;
}

export function juniorsSummary(progress: JuniorsProgress[]) {
  const completed = new Set(progress.filter(item => item.status === "completed").map(item => item.lesson_slug));
  const total = publishedJuniorsLessons.length;
  const subjects = ["mathematics", "physics", "chemistry"].map(slug => {
    const lessons = publishedJuniorsLessons.filter(item => item.subject.slug === slug);
    const done = lessons.filter(item => completed.has(item.lesson.slug)).length;
    return { slug, done, total: lessons.length, percent: lessons.length ? Math.round(done / lessons.length * 100) : 0 };
  });
  return { completed, total, percent: total ? Math.round((completed.size / total) * 100) : 0, subjects };
}
