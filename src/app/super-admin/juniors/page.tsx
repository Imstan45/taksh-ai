import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { juniorsExamConfigs, type JuniorsExamCode } from "@/lib/juniors-exam-config";
import { buildMockQuestionSet, type MockCandidate } from "@/lib/juniors-mock-builder";
import { auditQuestionCoverage, type CoveredQuestion } from "@/lib/juniors-question-coverage";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login?callbackUrl=/super-admin/juniors");
  const questions = await prisma.$queryRaw<(CoveredQuestion & MockCandidate & { exam_tags: string[] })[]>`
    select id,subject,chapter_slug,topic,subtopic,status,question_type,exam_tags from public.juniors_questions`;
  const coverage = auditQuestionCoverage(questions);
  const mockReadiness = (Object.keys(juniorsExamConfigs) as JuniorsExamCode[]).map((exam) => {
    const result = buildMockQuestionSet(exam, questions.filter((question) => question.status === "published" && question.exam_tags.includes(exam)));
    return { exam, ready: result.shortages.length === 0, shortages: result.shortages };
  });

  return <DashboardShell {...session.user}><header className="mb-6"><p className="text-sm font-semibold uppercase tracking-[.18em] text-violet-300">Taksh Juniors</p><h1 className="mt-2 text-3xl font-semibold">Phase 3 content operations</h1><p className="mt-2 text-sm text-zinc-400">Authoritative curriculum coverage and full-mock readiness.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><section className="glass-card"><p className="text-sm text-zinc-400">Validated subtopics</p><b className="mt-2 block text-3xl">{coverage.covered}/{coverage.total}</b></section>{coverage.bySubject.map((row) => <section className="glass-card" key={row.subject}><p className="text-sm capitalize text-zinc-400">{row.subject}</p><b className="mt-2 block text-3xl">{row.covered}/{row.total}</b></section>)}</div>
    <section className="glass-card mt-5"><h2 className="text-xl font-semibold">Full mock readiness</h2><div className="mt-4 grid gap-3">{mockReadiness.map((row) => <article className="rounded-xl border border-white/10 p-4" key={row.exam}><div className="flex items-center justify-between gap-4"><b>{juniorsExamConfigs[row.exam].title}</b><span className={row.ready ? "text-emerald-300" : "text-amber-300"}>{row.ready ? "Ready" : "Bank incomplete"}</span></div>{row.shortages.length > 0 && <p className="mt-2 text-sm text-zinc-400">{row.shortages.join(" · ")}</p>}</article>)}</div></section>
    <section className="glass-card mt-5"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Next uncovered subtopics</h2><p className="mt-1 text-sm text-zinc-400">The queue is generated directly from the mapped 440-subtopic curriculum.</p></div><Link className="btn-ghost" href="/juniors">Open student site</Link></div><div className="mt-4 grid gap-2">{coverage.missing.slice(0, 30).map((row) => <p className="rounded-lg bg-white/[.035] px-3 py-2 text-sm" key={`${row.subject}-${row.chapter}-${row.topic}-${row.subtopic}`}><span className="capitalize text-violet-300">{row.subject}</span> · {row.topic} · <b>{row.subtopic}</b></p>)}</div></section>
  </DashboardShell>;
}
