import { auth } from "@/auth";
import { PracticeEngine } from "@/components/juniors/practice-engine";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type Row = { id: string; subject: string; topic: string; prompt: string; options: unknown; question_type: "mcq" | "numerical"; status: string; selected_option: number | null; numerical_response: string | null; marked_for_review: boolean; expires_at: Date | null };

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await auth();
  const rows = await prisma.$queryRaw<Row[]>`
    select q.id,q.subject,q.topic,q.prompt,q.options,q.question_type,s.status,s.expires_at,r.selected_option,
    r.numerical_response::text,sq.marked_for_review
    from public.juniors_practice_sessions s join public.juniors_practice_session_questions sq on sq.session_id=s.id
    join public.juniors_questions q on q.id=sq.question_id left join public.juniors_responses r on r.session_id=s.id and r.question_id=q.id
    where s.id=${sessionId}::uuid and s.user_id=${user!.user.id}::uuid order by sq.display_order`;
  if (!rows.length) notFound();
  if (rows[0].status === "submitted") redirect(`/juniors/results/${sessionId}`);
  return <div className="js-content"><PracticeEngine sessionId={sessionId} expiresAt={rows[0].expires_at?.toISOString() ?? null} questions={rows.map(({ status: _, expires_at: __, selected_option, numerical_response, marked_for_review, ...question }) => ({ ...question, options: Array.isArray(question.options) ? question.options.map(String) : [], selectedOption: selected_option, numericalAnswer: numerical_response, markedForReview: marked_for_review }))} /></div>;
}
