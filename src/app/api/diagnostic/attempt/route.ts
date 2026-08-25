import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasCareerStarterAccess } from "@/lib/entitlements/career-starter";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];
type Attempt = {
  id: string;
  question_ids: string[];
  option_orders: Record<string, OptionKey[]>;
  answers: Record<string, string>;
  started_at: Date;
  expires_at: Date;
  status: string;
};
type Question = {
  id: string;
  question_text: string;
  category: string;
  subcategory: string;
  difficulty: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

function shuffledOptionKeys(): OptionKey[] {
  const keys = [...OPTION_KEYS];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let attempts = await prisma.$queryRaw<Attempt[]>`
    select id, question_ids, option_orders, answers, started_at, expires_at, status
    from public.diagnostic_attempts
    where student_id=${session.user.id}::uuid
      and assessment_id='taksh-skill-diagnostic-v1'
      and status='IN_PROGRESS'
    order by created_at desc limit 1`;

  if (!attempts[0]) {
    const completed=await prisma.$queryRaw<Array<{count:bigint}>>`select count(*)::bigint count from public.diagnostic_attempts where student_id=${session.user.id}::uuid and assessment_id='taksh-skill-diagnostic-v1' and status='COMPLETED'`;
    if(Number(completed[0]?.count??0)>0 && !(await hasCareerStarterAccess(session.user.id))){
      return Response.json({error:"Your free Placement Readiness Test is complete. Upgrade to Career Starter to retest and improve your score.",upgradeRequired:true},{status:403});
    }
    const selected = await prisma.$queryRaw<Array<{ id: string }>>`
      (select id from public.diagnostic_questions where active and category='logical_reasoning' order by md5(id||${session.user.id}) limit 3)
      union all
      (select id from public.diagnostic_questions where active and category='english_verbal' order by md5(id||${session.user.id}) limit 3)
      union all
      (select id from public.diagnostic_questions where active and category='quantitative_aptitude' order by md5(id||${session.user.id}) limit 2)
      union all
      (select id from public.diagnostic_questions where active and category='database_technical' order by md5(id||${session.user.id}) limit 2)`;
    if (selected.length !== 10) {
      return Response.json({ error: "Diagnostic question bank is incomplete" }, { status: 503 });
    }
    const ids = selected.map(({ id }) => id).sort(() => Math.random() - 0.5);
    const orders = Object.fromEntries(ids.map((id) => [id, shuffledOptionKeys()]));
    attempts = await prisma.$queryRaw<Attempt[]>`
      insert into public.diagnostic_attempts(student_id, question_ids, option_orders, status)
      values(${session.user.id}::uuid, ${ids}::text[], ${JSON.stringify(orders)}::jsonb, 'IN_PROGRESS')
      returning id, question_ids, option_orders, answers, started_at, expires_at, status`;
  }

  const attempt = attempts[0];
  const questions = await prisma.$queryRaw<Question[]>`
    select id, question_text, category, subcategory, difficulty, option_a, option_b, option_c, option_d
    from public.diagnostic_questions where id=any(${attempt.question_ids}::text[])`;
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return Response.json({
    attemptId: attempt.id,
    startedAt: attempt.started_at,
    expiresAt: attempt.expires_at,
    serverNow: new Date(),
    answers: attempt.answers,
    questions: attempt.question_ids.map((id, index) => {
      const question = questionMap.get(id)!;
      const originalOptions: Record<OptionKey, string> = {
        A: question.option_a,
        B: question.option_b,
        C: question.option_c,
        D: question.option_d,
      };
      const order = attempt.option_orders[id] ?? [...OPTION_KEYS];
      return {
        number: index + 1,
        id: question.id,
        question: question.question_text,
        category: question.category,
        subcategory: question.subcategory,
        difficulty: Number(question.difficulty),
        options: Object.fromEntries(OPTION_KEYS.map((key, i) => [key, originalOptions[order[i]]])),
      };
    }),
  });
}
