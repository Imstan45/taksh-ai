import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { diagnosticAnalysis, performanceLabel } from "@/lib/diagnostic/scoring";

const schema = z.object({ attemptId: z.string().uuid() });
const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid attempt" }, { status: 400 });

  return prisma.$transaction(async (tx) => {
    const attempts = await tx.$queryRaw<Array<{
      id: string;
      question_ids: string[];
      option_orders: Record<string, OptionKey[]>;
      answers: Record<string, OptionKey>;
      started_at: Date;
      expires_at: Date;
      status: string;
    }>>`select id,question_ids,option_orders,answers,started_at,expires_at,status from public.diagnostic_attempts where id=${parsed.data.attemptId}::uuid and student_id=${session.user.id}::uuid for update`;
    const attempt = attempts[0];
    if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status !== "IN_PROGRESS") return Response.json({ attemptId: attempt.id, completed: true });

    const questions = await tx.$queryRaw<Array<{ id: string; category: string; correct_answer: OptionKey; explanation: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string }>>`
      select id,category,correct_answer,explanation,question_text,option_a,option_b,option_c,option_d from public.diagnostic_questions where id=any(${attempt.question_ids}::text[])`;
    const scores: Record<string, { correct: number; total: number }> = {};
    let correct = 0;
    const originalSelections: Record<string, OptionKey | null> = {};
    for (const question of questions) {
      scores[question.category] ??= { correct: 0, total: 0 };
      scores[question.category].total++;
      const displaySelection = attempt.answers[question.id];
      const displayIndex = displaySelection ? OPTION_KEYS.indexOf(displaySelection) : -1;
      const originalSelection = displayIndex >= 0
        ? (attempt.option_orders[question.id] ?? OPTION_KEYS)[displayIndex]
        : null;
      originalSelections[question.id] = originalSelection;
      if (originalSelection === question.correct_answer) {
        scores[question.category].correct++;
        correct++;
      }
    }

    const expired = Date.now() >= attempt.expires_at.getTime();
    const time = Math.min(600, Math.max(0, Math.round((Date.now() - attempt.started_at.getTime()) / 1000)));
    await tx.$executeRaw`update public.diagnostic_attempts set submitted_at=now(),time_taken_seconds=${time},score=${correct},category_scores=${JSON.stringify(scores)}::jsonb,status=${expired ? "TIME_EXPIRED" : "COMPLETED"},updated_at=now() where id=${attempt.id}::uuid`;

    const unanswered = 10 - Object.keys(attempt.answers).length;
    const access=await tx.$queryRaw<Array<{paid:boolean}>>`select exists(select 1 from public.entitlements e join public.plan_course_entitlements m on m.plan_id=e.plan_id where e.user_id=${session.user.id}::uuid and e.status='active' and e.expires_at>now()) paid`;
    return Response.json({
      attemptId: attempt.id,
      score: correct,
      total: 10,
      incorrect: 10 - correct - unanswered,
      unanswered,
      timeTakenSeconds: time,
      status: expired ? "TIME_EXPIRED" : "COMPLETED",
      categories: Object.entries(scores).map(([category, value]) => ({ category, ...value, percentage: Math.round(value.correct / value.total * 100), label: performanceLabel(Math.round(value.correct / value.total * 100)) })),
      analysis: diagnosticAnalysis(scores),
      paidAccess:Boolean(access[0]?.paid),
      review: process.env.SHOW_DIAGNOSTIC_ANSWERS === "true" ? questions.map((question) => ({
        id: question.id,
        question: question.question_text,
        selected: originalSelections[question.id],
        correct: question.correct_answer,
        explanation: question.explanation,
        options: { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d },
      })) : undefined,
    });
  });
}
