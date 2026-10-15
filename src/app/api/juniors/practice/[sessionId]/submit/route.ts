import { auth } from "@/auth";
import type { JuniorsExamCode } from "@/lib/juniors-exam-config";
import { prisma } from "@/lib/prisma";
import { calculateJuniorsScore } from "@/lib/juniors-scoring";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), selectedOption: z.number().int().min(0).max(3) })).max(200) });

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await auth();
  if (!user?.user || user.user.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });

  const owner = await prisma.$queryRaw<{ status: string; exam_code: JuniorsExamCode | null; session_type: "practice" | "mock" }[]>`
    select status, exam_code, session_type from public.juniors_practice_sessions where id=${sessionId}::uuid and user_id=${user.user.id}::uuid`;
  if (!owner.length || owner[0].status !== "active") return NextResponse.json({ error: "Session unavailable" }, { status: 409 });

  const allowed = await prisma.$queryRaw<{ id: string; correct_option: number }[]>`
    select q.id,q.correct_option from public.juniors_practice_session_questions sq join public.juniors_questions q on q.id=sq.question_id where sq.session_id=${sessionId}::uuid`;
  const correctOptions = new Map(allowed.map((question) => [question.id, question.correct_option]));
  const answers = parsed.data.answers.filter((answer, index, list) => correctOptions.has(answer.questionId) && list.findIndex((item) => item.questionId === answer.questionId) === index);
  const correct = answers.filter((answer) => correctOptions.get(answer.questionId) === answer.selectedOption).length;
  const incorrect = answers.length - correct;
  const unanswered = allowed.length - answers.length;
  const score = calculateJuniorsScore({ correct, incorrect, unanswered, exam: owner[0].exam_code, sessionType: owner[0].session_type });

  await prisma.$transaction(async (tx) => {
    for (const answer of answers) await tx.$executeRaw`
      insert into public.juniors_responses(session_id,question_id,selected_option,is_correct)
      values(${sessionId}::uuid,${answer.questionId}::uuid,${answer.selectedOption},${correctOptions.get(answer.questionId)===answer.selectedOption})
      on conflict(session_id,question_id) do update set selected_option=excluded.selected_option,is_correct=excluded.is_correct,updated_at=now()`;
    await tx.$executeRaw`
      update public.juniors_practice_sessions set status='submitted',score=${correct},correct_answers=${correct},incorrect_answers=${incorrect},
      unanswered_questions=${unanswered},marks_awarded=${score.marks},maximum_marks=${score.maximum},submitted_at=now()
      where id=${sessionId}::uuid and user_id=${user.user.id}::uuid`;
  });
  return NextResponse.json({ resultUrl: `/juniors/results/${sessionId}` });
}
