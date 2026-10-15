import { auth } from "@/auth";
import type { JuniorsExamCode } from "@/lib/juniors-exam-config";
import { prisma } from "@/lib/prisma";
import { calculateJuniorsScore } from "@/lib/juniors-scoring";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await auth();
  if (!user?.user || user.user.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  const owner = await prisma.$queryRaw<{ status: string; exam_code: JuniorsExamCode | null; session_type: "practice" | "mock"; total_questions: number }[]>`
    select status,exam_code,session_type,total_questions from public.juniors_practice_sessions
    where id=${sessionId}::uuid and user_id=${user.user.id}::uuid`;
  if (!owner.length || owner[0].status !== "active") return NextResponse.json({ error: "Session unavailable" }, { status: 409 });

  const counts = (await prisma.$queryRaw<{ attempted: bigint; correct: bigint }[]>`
    select count(*) attempted,count(*) filter(where is_correct) correct from public.juniors_responses where session_id=${sessionId}::uuid`)[0];
  const correct = Number(counts.correct);
  const attempted = Number(counts.attempted);
  const incorrect = attempted - correct;
  const unanswered = owner[0].total_questions - attempted;
  const score = calculateJuniorsScore({ correct, incorrect, unanswered, exam: owner[0].exam_code, sessionType: owner[0].session_type });

  await prisma.$executeRaw`
    update public.juniors_practice_sessions set status='submitted',score=${correct},correct_answers=${correct},incorrect_answers=${incorrect},
    unanswered_questions=${unanswered},marks_awarded=${score.marks},maximum_marks=${score.maximum},submitted_at=now()
    where id=${sessionId}::uuid and user_id=${user.user.id}::uuid and status='active'`;
  return NextResponse.json({ resultUrl: `/juniors/results/${sessionId}` });
}
