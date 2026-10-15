import { auth } from "@/auth";
import { isNumericalAnswerCorrect } from "@/lib/juniors-answer-check";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const decimal = z.string().trim().regex(/^-?(?:\d+(?:\.\d*)?|\.\d+)$/).max(40);
const schema = z.object({
  questionId: z.string().uuid(),
  selectedOption: z.number().int().min(0).max(3).nullable().optional(),
  numericalAnswer: decimal.nullable().optional(),
  markedForReview: z.boolean(),
}).refine((value) => !(value.selectedOption != null && value.numericalAnswer != null), "Only one answer type is allowed");

type Question = { question_type: "mcq" | "numerical"; correct_option: number; numerical_answer: number | null; numerical_tolerance: number };

export async function PUT(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await auth();
  if (!user?.user || user.user.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid response" }, { status: 400 });
  const rows = await prisma.$queryRaw<Question[]>`
    select q.question_type,q.correct_option,q.numerical_answer::double precision numerical_answer,q.numerical_tolerance::double precision numerical_tolerance
    from public.juniors_practice_sessions s join public.juniors_practice_session_questions sq on sq.session_id=s.id
    join public.juniors_questions q on q.id=sq.question_id
    where s.id=${sessionId}::uuid and s.user_id=${user.user.id}::uuid and s.status='active' and sq.question_id=${parsed.data.questionId}::uuid`;
  if (!rows.length) return NextResponse.json({ error: "Session unavailable" }, { status: 409 });
  const question = rows[0];
  const selectedOption = parsed.data.selectedOption ?? null;
  const numericalAnswer = parsed.data.numericalAnswer ?? null;
  if (question.question_type === "mcq" && numericalAnswer !== null || question.question_type === "numerical" && selectedOption !== null) {
    return NextResponse.json({ error: "Answer type does not match question" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`update public.juniors_practice_session_questions set marked_for_review=${parsed.data.markedForReview} where session_id=${sessionId}::uuid and question_id=${parsed.data.questionId}::uuid`;
    if (selectedOption === null && numericalAnswer === null) {
      await tx.$executeRaw`delete from public.juniors_responses where session_id=${sessionId}::uuid and question_id=${parsed.data.questionId}::uuid`;
    } else if (question.question_type === "mcq") {
      await tx.$executeRaw`
        insert into public.juniors_responses(session_id,question_id,selected_option,numerical_response,is_correct)
        values(${sessionId}::uuid,${parsed.data.questionId}::uuid,${selectedOption},null,${question.correct_option === selectedOption})
        on conflict(session_id,question_id) do update set selected_option=excluded.selected_option,numerical_response=null,is_correct=excluded.is_correct,updated_at=now()`;
    } else {
      const isCorrect = question.numerical_answer !== null && isNumericalAnswerCorrect(numericalAnswer!, question.numerical_answer, question.numerical_tolerance);
      await tx.$executeRaw`
        insert into public.juniors_responses(session_id,question_id,selected_option,numerical_response,is_correct)
        values(${sessionId}::uuid,${parsed.data.questionId}::uuid,null,${numericalAnswer}::numeric,${isCorrect})
        on conflict(session_id,question_id) do update set selected_option=null,numerical_response=excluded.numerical_response,is_correct=excluded.is_correct,updated_at=now()`;
    }
  });
  return NextResponse.json({ saved: true });
}
