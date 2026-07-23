import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEARNING_STYLE_QUESTIONS, scoreLearningStyle } from "@/lib/learning-style/quiz";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.number().int().min(0).max(3).nullable(),
      timeTakenSeconds: z.number().min(0).max(3600),
    })
  ).length(LEARNING_STYLE_QUESTIONS.length),
});

type ExistingProfile = {
  id: string;
  profile_json: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid learning style submission" }, { status: 400 });
  }

  const validIds = new Set(LEARNING_STYLE_QUESTIONS.map((question) => question.id));
  if (parsed.data.answers.some((answer) => !validIds.has(answer.questionId))) {
    return NextResponse.json({ error: "Invalid learning style question" }, { status: 400 });
  }

  const result = scoreLearningStyle(parsed.data.answers);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<ExistingProfile[]>`
      SELECT id, profile_json
      FROM public.student_profiles
      WHERE student_id = ${session.user.id}::uuid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1
    `;

    const previousJson = existing[0]?.profile_json ?? {};
    const nextJson = {
      ...previousJson,
      learningStyleAssessment: result,
    };

    if (existing[0]) {
      await tx.$executeRaw`
        UPDATE public.student_profiles
        SET learning_style = ${result.learningStyle}, profile_json = ${JSON.stringify(nextJson)}::jsonb
        WHERE id = ${existing[0].id}::uuid
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO public.student_profiles (id, student_id, learning_style, profile_json)
        VALUES (gen_random_uuid(), ${session.user.id}::uuid, ${result.learningStyle}, ${JSON.stringify(nextJson)}::jsonb)
      `;
    }
  });

  return NextResponse.json({ result });
}
