import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";

const modulePlan = [
  { title: "Quantitative Aptitude", count: 50, href: "#", note: "Percentages, ratios, profit-loss, time-work" },
  { title: "Logical Reasoning", count: 50, href: "#", note: "Series, blood relations, syllogisms, coding-decoding" },
  { title: "Directions", count: 50, href: "#", note: "Direction sense, maps, turns and shortest path" },
  { title: "English", count: 50, href: "#", note: "Grammar, vocabulary, sentence correction" },
  { title: "Reading Comprehension", count: 50, href: "#", note: "Inference, tone, assumption and conclusion" },
];

type Row = { profile_json: { profiling?: { readinessScore?: number; level?: string; weakAreas?: string[]; strongAreas?: string[]; categoryScores?: Array<{ category: string; score: number; level: string }> } } | null };

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default async function ContinueLearningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/continue-learning");

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT profile_json
    FROM public.student_profiles
    WHERE student_id = ${session.user.id}::uuid
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  `;

  const profiling = rows[0]?.profile_json?.profiling;
  if (!profiling) redirect("/profiling");

  return (
    <DashboardShell {...session.user}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="glass-card h-fit">
          <p className="eyebrow">Profile saved</p>
          <h2 className="mt-5 text-4xl font-semibold">{profiling.readinessScore ?? 0}%</h2>
          <p className="mt-2 text-sm text-zinc-400">Placement readiness · {label(profiling.level ?? "beginner")}</p>

          <div className="mt-6 space-y-3">
            {profiling.categoryScores?.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex justify-between text-xs"><span>{label(item.category)}</span><span>{item.score}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${item.score}%` }} /></div>
              </div>
            ))}
          </div>
        </aside>

        <section>
          <div className="glass-card">
            <h1 className="text-2xl font-semibold">Continue learning</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Your static profile test is complete. Next, each module will have 50 standard questions. Today these can be static; tomorrow we can connect Grok to generate adaptive practice.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {modulePlan.map((module) => (
              <div key={module.title} className="glass-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{module.note}</p>
                  </div>
                  <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200">{module.count} Qs</span>
                </div>
                <Link href={module.href} className="btn-ghost mt-5 border border-white/10">Start module</Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
