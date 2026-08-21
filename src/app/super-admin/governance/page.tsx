import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

const permissions = [
  ["Super Admin", "All institutions, users, roles, governance, content generation and publishing"],
  ["College Admin", "Assigned institution, faculty, students, course assignments and college reports"],
  ["Faculty", "Assigned learners, approved teaching content, assessments and progress"],
  ["Student", "Own profile, assigned lessons, assessments and gamified progress"],
];

const categoryNames: Record<string, string> = {
  logical_reasoning: "Logic",
  quantitative_aptitude: "Quant",
  english_verbal: "English",
  database_technical: "Technical",
};

type CategoryScore = { correct: number; total: number };
type AttemptRow = {
  id: string;
  email: string;
  name: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "TIME_EXPIRED";
  score: number | null;
  answered: number;
  time_taken_seconds: number | null;
  category_scores: Record<string, CategoryScore> | null;
  started_at: Date;
  submitted_at: Date | null;
};

function formatTime(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export default async function GovernancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login?callbackUrl=/super-admin/governance");

  const [attempts, summary] = await Promise.all([
    prisma.$queryRaw<AttemptRow[]>`
      select attempt.id, account.email,
        coalesce(account.raw_user_meta_data->>'full_name', account.raw_user_meta_data->>'name') as name,
        attempt.status, attempt.score, (select count(*) from jsonb_object_keys(attempt.answers))::int as answered,
        attempt.time_taken_seconds, attempt.category_scores, attempt.started_at, attempt.submitted_at
      from public.diagnostic_attempts attempt
      join auth.users account on account.id = attempt.student_id
      order by attempt.started_at desc
      limit 100`,
    prisma.$queryRaw<Array<{ attempts: bigint; completed: bigint; average_score: number | null; average_time: number | null }>>`
      select count(*)::bigint as attempts,
        count(*) filter (where status in ('COMPLETED','TIME_EXPIRED'))::bigint as completed,
        round(avg(score) filter (where score is not null), 1)::float as average_score,
        round(avg(time_taken_seconds) filter (where time_taken_seconds is not null))::float as average_time
      from public.diagnostic_attempts`,
  ]);
  const totals = summary[0];

  return (
    <DashboardShell {...session.user}>
      <div className="space-y-6">
        <section className="glass-card">
          <h2 className="text-2xl font-semibold">Access governance</h2>
          <p className="mt-2 text-sm text-zinc-400">Server-enforced role boundaries currently active across Taksh AI.</p>
          <div className="mt-6 divide-y divide-white/10">{permissions.map(([role, access]) => <div className="grid gap-2 py-5 md:grid-cols-[180px_1fr]" key={role}><b>{role}</b><p className="text-sm leading-6 text-zinc-400">{access}</p></div>)}</div>
        </section>

        <section className="glass-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Assessment oversight</p><h2 className="mt-3 text-2xl font-semibold">10-minute diagnostic results</h2><p className="mt-2 text-sm text-zinc-400">Latest 100 attempts across all students. Scores are calculated securely on the server.</p></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Attempts" value={Number(totals?.attempts ?? 0)} />
            <Metric label="Submitted" value={Number(totals?.completed ?? 0)} />
            <Metric label="Average score" value={totals?.average_score === null ? "—" : `${totals?.average_score ?? 0}/10`} />
            <Metric label="Average time" value={formatTime(totals?.average_time ?? null)} />
          </div>

          {attempts.length === 0 ? <div className="mt-6 rounded-2xl border border-white/10 p-6 text-sm text-zinc-400">No diagnostic attempts have been recorded yet.</div> :
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white/[.04] text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-4">Student</th><th className="p-4">Result</th><th className="p-4">Category breakdown</th><th className="p-4">Time</th><th className="p-4">Status</th><th className="p-4">Attempted</th></tr></thead>
                <tbody className="divide-y divide-white/10">{attempts.map((attempt) => <tr key={attempt.id} className="align-top">
                  <td className="p-4"><b className="block text-white">{attempt.name || attempt.email.split("@")[0]}</b><span className="mt-1 block text-xs text-zinc-500">{attempt.email}</span></td>
                  <td className="p-4"><b className="text-lg text-violet-300">{attempt.score === null ? "—" : `${attempt.score}/10`}</b><span className="mt-1 block text-xs text-zinc-500">{attempt.answered}/10 answered</span></td>
                  <td className="p-4"><div className="flex flex-wrap gap-2">{attempt.category_scores ? Object.entries(attempt.category_scores).map(([category, score]) => <span className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-1 text-xs" key={category}>{categoryNames[category] ?? category}: <b>{score.correct}/{score.total}</b></span>) : <span className="text-zinc-600">Pending submission</span>}</div></td>
                  <td className="p-4">{formatTime(attempt.time_taken_seconds)}</td>
                  <td className="p-4"><Status value={attempt.status} /></td>
                  <td className="p-4"><span className="block">{attempt.started_at.toLocaleDateString()}</span><span className="mt-1 block text-xs text-zinc-500">{attempt.started_at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td>
                </tr>)}</tbody>
              </table>
            </div>}
        </section>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Status({ value }: { value: AttemptRow["status"] }) {
  const style = value === "COMPLETED" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : value === "TIME_EXPIRED" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{value.replaceAll("_", " ")}</span>;
}
