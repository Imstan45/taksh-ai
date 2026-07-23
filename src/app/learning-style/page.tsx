import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { LearningStyleQuiz } from "@/components/learning-style/learning-style-quiz";
import type { LearningStyle } from "@/lib/learning-style/quiz";

export default async function LearningStylePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login?callbackUrl=/learning-style");
  const rows = await prisma.$queryRaw<Array<{ learning_style: string | null }>>`
    SELECT learning_style FROM public.student_profiles
    WHERE student_id = ${session.user.id}::uuid
    ORDER BY created_at DESC LIMIT 1
  `;
  return (
    <DashboardShell {...session.user}>
      <LearningStyleQuiz initialLearningStyle={rows[0]?.learning_style as LearningStyle | null} />
    </DashboardShell>
  );
}
