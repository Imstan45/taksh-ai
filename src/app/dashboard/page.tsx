import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";

type Row = {
  profile_json: {
    profiling?: {
      readinessScore?: number;
      level?: string;
      weakAreas?: string[];
      strongAreas?: string[];
      categoryScores?: Array<{ category: string; score: number; level: string }>;
    };
  } | null;
};

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT profile_json
    FROM public.student_profiles
    WHERE student_id = ${session.user.id}::uuid
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  `;

  const profiling = rows[0]?.profile_json?.profiling;

  return (
    <DashboardShell {...session.user}>
      {!profiling ? (
        <div className="glass-card">
          <p className="eyebrow">First step</p>
          <h2 className="mt-5 text-2xl font-semibold">Take your placement profiling test</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Answer 20 static questions across aptitude, logical reasoning, directions, English and reading comprehension. Taksh AI will score you using both accuracy and time.
          </p>
          <Link className="btn-primary mt-6" href="/profiling">Start profiling test</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="glass-card">
            <p className="eyebrow">Learner profile</p>
            <h2 className="mt-5 text-3xl font-semibold">Readiness score: {profiling.readinessScore ?? 0}%</h2>
            <p className="mt-2 text-sm text-zinc-400">Current level: {label(profiling.level ?? "beginner")}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {profiling.categoryScores?.map((item) => (
                <div key={item.category} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex justify-between text-sm"><span>{label(item.category)}</span><strong>{item.score}%</strong></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${item.score}%` }} /></div>
                  <p className="mt-2 text-xs text-zinc-500">{label(item.level)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/continue-learning">Continue learning</Link>
            </div>
          </section>

          <aside className="glass-card h-fit">
            <h3 className="font-medium">Focus areas</h3>
            <p className="mt-3 text-sm text-zinc-500">Weak areas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profiling.weakAreas?.length ? profiling.weakAreas : ["No major weak area yet"]).map((item) => <span key={item} className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-200">{label(item)}</span>)}
            </div>
            <p className="mt-5 text-sm text-zinc-500">Strong areas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profiling.strongAreas?.length ? profiling.strongAreas : ["Build more consistency"]).map((item) => <span key={item} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">{label(item)}</span>)}
            </div>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
