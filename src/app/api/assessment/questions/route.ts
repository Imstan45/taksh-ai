import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type QuestionRow = {
  id: string;
  topic_id: string;
  difficulty: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  explanation: string | null;
  time_limit: number | null;
  module: string | null;
  subject: string | null;
  topic_name: string | null;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<QuestionRow[]>`
    SELECT
      qb.id,
      qb.topic_id,
      qb.difficulty,
      qb.question,
      qb.option_a,
      qb.option_b,
      qb.option_c,
      qb.option_d,
      qb.correct_answer,
      qb.explanation,
      qb.time_limit,
      qt.module,
      qt.subject,
      qt.topic_name
    FROM public.question_bank qb
    LEFT JOIN public.question_topics qt ON qt.id = qb.topic_id
    WHERE
      COALESCE(qt.module, '') = 'Aptitude'
      AND qb.question IS NOT NULL
      AND qb.option_a IS NOT NULL
      AND qb.option_b IS NOT NULL
      AND qb.option_c IS NOT NULL
      AND qb.option_d IS NOT NULL
      AND qb.correct_answer IS NOT NULL
    ORDER BY random()
    LIMIT 30
  `;

  return NextResponse.json({
    durationMinutes: 30,
    count: rows.length,
    questions: rows.map((row, index) => ({
      number: index + 1,
      id: row.id,
      topicId: row.topic_id,
      module: row.module ?? "Aptitude",
      subject: row.subject ?? "Aptitude",
      topicName: row.topic_name ?? "Aptitude",
      difficulty: row.difficulty ?? "Mixed",
      question: row.question,
      options: {
        A: row.option_a ?? "",
        B: row.option_b ?? "",
        C: row.option_c ?? "",
        D: row.option_d ?? "",
      },
      correctAnswer: String(row.correct_answer ?? "").trim().toUpperCase(),
      explanation: row.explanation ?? "Explanation is not available yet.",
      timeLimit: row.time_limit ?? 60,
    })),
  });
}
