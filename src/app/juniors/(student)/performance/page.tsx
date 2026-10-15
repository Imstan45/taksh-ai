import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Stat = { subject: string; topic: string; answered: bigint; correct: bigint };
type Attempt = { id: string; subject: string | null; exam_code: string | null; session_type: string; total_questions: number; correct_answers: number | null; score: number; marks_awarded: string | null; maximum_marks: string | null; submitted_at: Date };

export default async function Page() {
  const user = await auth();
  const stats = await prisma.$queryRaw<Stat[]>`
    select q.subject,q.topic,count(*) answered,count(*) filter(where r.is_correct) correct
    from public.juniors_responses r join public.juniors_practice_sessions s on s.id=r.session_id join public.juniors_questions q on q.id=r.question_id
    where s.user_id=${user!.user.id}::uuid and s.status='submitted' group by q.subject,q.topic order by q.subject,q.topic`;
  const attempts = await prisma.$queryRaw<Attempt[]>`
    select id,subject,exam_code,session_type,total_questions,correct_answers,score,marks_awarded,maximum_marks,submitted_at
    from public.juniors_practice_sessions where user_id=${user!.user.id}::uuid and status='submitted' order by submitted_at desc limit 12`;
  const answered = stats.reduce((sum, stat) => sum + Number(stat.answered), 0);
  const correct = stats.reduce((sum, stat) => sum + Number(stat.correct), 0);
  const subjects = ["mathematics", "physics", "chemistry"].map((subject) => {
    const rows = stats.filter((stat) => stat.subject === subject);
    return { subject, answered: rows.reduce((sum, row) => sum + Number(row.answered), 0), correct: rows.reduce((sum, row) => sum + Number(row.correct), 0) };
  }).filter((stat) => stat.answered);
  const weakestTopic = stats.length ? [...stats].sort((a, b) => Number(a.correct) / Number(a.answered) - Number(b.correct) / Number(b.answered) || Number(b.answered) - Number(a.answered))[0] : null;

  return <div className="js-content"><header className="js-page-head"><span className="j-eyebrow">Performance</span><h1>Your progress, from every submitted answer</h1><p>Subject and topic insights update after each practice or mock.</p></header><section className="js-stat-grid"><article className="js-stat"><small>Questions answered</small><strong>{answered}</strong></article><article className="js-stat"><small>Correct answers</small><strong>{correct}</strong></article><article className="js-stat"><small>Overall accuracy</small><strong>{answered ? Math.round(correct / answered * 100) : 0}%</strong></article><article className="js-stat"><small>Recommended focus</small><strong>{weakestTopic ? `${weakestTopic.subject}: ${weakestTopic.topic}` : "Start practising"}</strong></article></section>
    <section className="js-panel"><h2>Subject accuracy</h2><div className="js-subject-progress">{subjects.map((stat) => { const percent = Math.round(stat.correct / stat.answered * 100); return <div key={stat.subject}><p><b>{stat.subject}</b><span>{stat.correct}/{stat.answered} correct · {percent}%</span></p><i><em style={{ width: `${percent}%` }} /></i></div>; })}</div>{!stats.length && <p>No activity yet. <Link href="/juniors/practice">Start practice</Link>.</p>}</section>
    {stats.length > 0 && <section className="js-panel"><h2>Topic mastery</h2><div className="js-subject-progress">{[...stats].sort((a, b) => Number(a.correct) / Number(a.answered) - Number(b.correct) / Number(b.answered)).map((stat) => { const total = Number(stat.answered); const right = Number(stat.correct); const percent = Math.round(right / total * 100); return <div key={`${stat.subject}-${stat.topic}`}><p><b>{stat.topic}</b><span>{stat.subject} · {right}/{total} · {percent}%</span></p><i><em style={{ width: `${percent}%` }} /></i></div>; })}</div></section>}
    <section className="js-panel"><h2>Recent attempt history</h2>{attempts.length ? <div className="jr-review">{attempts.map((attempt) => { const correctCount = attempt.correct_answers ?? attempt.score; const score = attempt.session_type === "mock" && attempt.marks_awarded !== null ? `${Number(attempt.marks_awarded)}/${Number(attempt.maximum_marks)} marks` : `${correctCount}/${attempt.total_questions} correct`; return <Link key={attempt.id} href={`/juniors/results/${attempt.id}`}><b>{attempt.session_type === "mock" ? "Mock" : "Practice"} · {attempt.subject ?? attempt.exam_code?.replaceAll("-", " ") ?? "Mixed MPC"}</b><span>{score} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(attempt.submitted_at)}</span></Link>; })}</div> : <p>Your submitted attempts will appear here.</p>}</section>
  </div>;
}
