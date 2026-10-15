import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type Result = { score: number; total_questions: number; subject: string | null; exam_code: string | null; session_type: string; correct_answers: number | null; incorrect_answers: number | null; unanswered_questions: number | null; marks_awarded: string | null; maximum_marks: string | null };
type Review = { id: string; prompt: string; options: unknown; question_type: "mcq" | "numerical"; correct_option: number; numerical_answer: string | null; selected_option: number | null; numerical_response: string | null; is_correct: boolean | null; explanation: string };

export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await auth();
  const result = (await prisma.$queryRaw<Result[]>`
    select score,total_questions,subject,exam_code,session_type,correct_answers,incorrect_answers,unanswered_questions,marks_awarded,maximum_marks
    from public.juniors_practice_sessions where id=${attemptId}::uuid and user_id=${user!.user.id}::uuid and status='submitted'`)[0];
  if (!result) notFound();
  const review = await prisma.$queryRaw<Review[]>`
    select q.id,q.prompt,q.options,q.question_type,q.correct_option,q.numerical_answer::text,r.selected_option,r.numerical_response::text,r.is_correct,q.explanation
    from public.juniors_practice_session_questions sq join public.juniors_questions q on q.id=sq.question_id
    left join public.juniors_responses r on r.session_id=sq.session_id and r.question_id=q.id
    where sq.session_id=${attemptId}::uuid order by sq.display_order`;
  const correct = result.correct_answers ?? result.score;
  const incorrect = result.incorrect_answers ?? review.filter((item) => item.is_correct === false).length;
  const unanswered = result.unanswered_questions ?? Math.max(0, result.total_questions - correct - incorrect);
  const attempted = correct + incorrect;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  const isMock = result.session_type === "mock";

  return <div className="js-content"><header className="jr-score"><span className="j-eyebrow">{isMock ? "Mock result" : "Practice result"}</span><strong>{isMock && result.marks_awarded !== null ? `${Number(result.marks_awarded)}/${Number(result.maximum_marks)}` : `${correct}/${result.total_questions}`}</strong><h1>{accuracy}% attempted accuracy</h1><p>{correct} correct · {incorrect} incorrect · {unanswered} unanswered</p><p>{result.subject ?? "Mixed MPC"} · {result.exam_code?.replaceAll("-", " ") ?? "All exams"}</p><Link className="j-btn" href={isMock ? "/juniors/mocks" : "/juniors/practice"}>{isMock ? "Take another mock" : "Practice again"}</Link></header><section className="jr-review"><h2>Answer review</h2>{review.map((item, i) => { const options = Array.isArray(item.options) ? item.options.map(String) : []; const yourAnswer = item.question_type === "numerical" ? item.numerical_response : item.selected_option === null ? null : options[item.selected_option]; const correctAnswer = item.question_type === "numerical" ? item.numerical_answer : options[item.correct_option]; return <details key={item.id}><summary><span>{i + 1}. {item.prompt}</span><b className={item.is_correct ? "correct" : "incorrect"}>{item.is_correct ? "Correct" : "Review"}</b></summary><p>Your answer: {yourAnswer ?? "Not answered"}</p><p>Correct answer: {correctAnswer}</p><small>{item.explanation}</small></details>; })}</section></div>;
}
