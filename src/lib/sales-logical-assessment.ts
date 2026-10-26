import { prisma } from "@/lib/prisma";

export const assessmentOptionKeys = ["A", "B", "C", "D"] as const;
export type AssessmentOptionKey = (typeof assessmentOptionKeys)[number];

type QuestionRow = { id: string; question_text: string; options: Record<AssessmentOptionKey, string>; category: string; difficulty: string };
type AttemptRow = { id: string; status: "IN_PROGRESS" | "COMPLETED"; started_at: Date; submitted_at: Date | null; score: number | null };
type ItemRow = { question_id: string; position: number; option_order: AssessmentOptionKey[]; submitted_option: AssessmentOptionKey | null; question_snapshot: QuestionRow };

function shuffled<T>(items: readonly T[]) { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }

export type RepAssessmentPayload = {
  attemptId: string; status: "IN_PROGRESS" | "COMPLETED"; startedAt: Date; submittedAt: Date | null; score: number | null; total: 10;
  questions?: Array<{ id: string; number: number; question: string; category: string; difficulty: string; options: Record<AssessmentOptionKey, string>; answer: AssessmentOptionKey | null }>;
};

async function payloadForAttempt(attempt: AttemptRow): Promise<RepAssessmentPayload> {
  const items = await prisma.$queryRaw<ItemRow[]>`select question_id,position,option_order,submitted_option,question_snapshot from public.sales_logical_attempt_items where attempt_id=${attempt.id}::uuid order by position`;
  if (attempt.status === "COMPLETED") return { attemptId: attempt.id, status: attempt.status, startedAt: attempt.started_at, submittedAt: attempt.submitted_at, score: attempt.score, total: 10 };
  if (items.length !== 10) throw new Error("Assessment paper is unavailable.");
  return { attemptId: attempt.id, status: attempt.status, startedAt: attempt.started_at, submittedAt: null, score: null, total: 10, questions: items.map(item => {
    const question = item.question_snapshot;
    const options = Object.fromEntries(assessmentOptionKeys.map((display, index) => [display, question.options[item.option_order[index]]])) as Record<AssessmentOptionKey, string>;
    return { id: question.id, number: item.position, question: question.question_text, category: question.category, difficulty: question.difficulty, options, answer: item.submitted_option };
  }) };
}

export async function getRepAssessment(userId: string) {
  const attempt = (await prisma.$queryRaw<AttemptRow[]>`select attempt.id,attempt.status,attempt.started_at,attempt.submitted_at,attempt.score from public.sales_logical_attempts attempt join public.sales_reps rep on rep.id=attempt.sales_rep_id where rep.user_id=${userId}::uuid limit 1`)[0];
  return attempt ? payloadForAttempt(attempt) : null;
}

export async function startRepAssessment(userId: string) {
  const attempt = await prisma.$transaction(async tx => {
    const rep = (await tx.$queryRaw<Array<{ id: string; status: string }>>`select id,status from public.sales_reps where user_id=${userId}::uuid for update`)[0];
    if (!rep || rep.status !== "active") return { ineligible: true as const };
    const existing = (await tx.$queryRaw<AttemptRow[]>`select id,status,started_at,submitted_at,score from public.sales_logical_attempts where sales_rep_id=${rep.id}::uuid limit 1`)[0];
    if (existing) return { attempt: existing };
    const selected = await tx.$queryRaw<Array<{ id: string }>>`
      select question.id from public.sales_logical_questions question
      left join public.sales_logical_attempt_items item on item.question_id=question.id
      where question.approved
      group by question.id
      order by count(item.question_id) asc, md5(question.id::text || ${rep.id}) asc
      limit 10`;
    if (selected.length !== 10) throw new Error("The approved assessment bank is not ready.");
    const created = (await tx.$queryRaw<AttemptRow[]>`insert into public.sales_logical_attempts(sales_rep_id) values(${rep.id}::uuid) returning id,status,started_at,submitted_at,score`)[0];
    for (const [index, question] of selected.entries()) await tx.$executeRaw`insert into public.sales_logical_attempt_items(attempt_id,question_id,position,option_order,question_snapshot) select ${created.id}::uuid,bank.id,${index + 1},${shuffled(assessmentOptionKeys)}::text[],jsonb_build_object('id',bank.id,'question_text',bank.question_text,'options',bank.options,'category',bank.category,'difficulty',bank.difficulty,'correct_option',bank.correct_option,'explanation',bank.explanation) from public.sales_logical_questions bank where bank.id=${question.id}::uuid`;
    return { attempt: created };
  });
  if (attempt.ineligible) return attempt;
  return { attempt: await payloadForAttempt(attempt.attempt) };
}

export async function saveRepAssessmentAnswer(userId: string, attemptId: string, questionId: string, answer: AssessmentOptionKey) {
  const updated = await prisma.$executeRaw`
    update public.sales_logical_attempt_items item set submitted_option=${answer},answered_at=now()
    from public.sales_logical_attempts attempt join public.sales_reps rep on rep.id=attempt.sales_rep_id
    where item.attempt_id=attempt.id and item.attempt_id=${attemptId}::uuid and item.question_id=${questionId}::uuid
      and rep.user_id=${userId}::uuid and rep.status='active' and attempt.status='IN_PROGRESS'`;
  return updated > 0;
}

export async function submitRepAssessment(userId: string, attemptId: string) {
  return prisma.$transaction(async tx => {
    const attempt = (await tx.$queryRaw<Array<AttemptRow & { rep_status: string }>>`
      select attempt.id,attempt.status,attempt.started_at,attempt.submitted_at,attempt.score,rep.status rep_status
      from public.sales_logical_attempts attempt join public.sales_reps rep on rep.id=attempt.sales_rep_id
      where attempt.id=${attemptId}::uuid and rep.user_id=${userId}::uuid for update`)[0];
    if (!attempt) return { error: "Attempt not found", status: 404 };
    if (attempt.status === "COMPLETED") return { error: "This assessment was already submitted.", status: 409 };
    if (attempt.rep_status !== "active") return { error: "Only active Sales Reps can submit an assessment.", status: 403 };
    const score = (await tx.$queryRaw<Array<{ score: number }>>`
      select count(*) filter (where item.submitted_option is not null and item.option_order[array_position(array['A','B','C','D'],item.submitted_option)] = item.question_snapshot->>'correct_option')::int score
      from public.sales_logical_attempt_items item
      where item.attempt_id=${attempt.id}::uuid and item.question_snapshot->>'correct_option' is not null`)[0]?.score ?? 0;
    await tx.$executeRaw`update public.sales_logical_attempts set status='COMPLETED',score=${score},submitted_at=now(),updated_at=now() where id=${attempt.id}::uuid and status='IN_PROGRESS'`;
    return { score, total: 10, percentage: score * 10, submittedAt: new Date() };
  });
}
