import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateProfiling } from "@/lib/profiling/scoring";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.number().int().min(0).max(3).nullable(),
      timeTakenSeconds: z.number().min(0).max(3600),
    })
  ),
});

type ExistingProfile = {
  id: string;
  profile_json: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profiling submission" }, { status: 400 });
  }

  const result = evaluateProfiling(parsed.data.answers);

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
      profiling: result,
      onboardingStatus: "PROFILE_TEST_COMPLETED",
    };

    const aptitude = result.categoryScores.find((item) => item.category === "aptitude")?.level ?? null;
    const english = result.categoryScores.find((item) => item.category === "english")?.level ?? null;
    const communication = result.categoryScores.find((item) => item.category === "reading_comprehension")?.level ?? null;

    if (existing[0]) {
      await tx.$executeRaw`
        UPDATE public.student_profiles
        SET
          profile_json = ${JSON.stringify(nextJson)}::jsonb,
          aptitude_level = ${aptitude},
          english_level = ${english},
          communication_level = ${communication},
          confidence_score = ${result.readinessScore}
        WHERE id = ${existing[0].id}::uuid
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO public.student_profiles (
          id,
          student_id,
          profile_json,
          aptitude_level,
          english_level,
          communication_level,
          confidence_score
        ) VALUES (
          gen_random_uuid(),
          ${session.user.id}::uuid,
          ${JSON.stringify(nextJson)}::jsonb,
          ${aptitude},
          ${english},
          ${communication},
          ${result.readinessScore}
        )
      `;
    }
  });

  return NextResponse.json({ result });
}
