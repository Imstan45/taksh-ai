import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
import { BookOpenCheck, Building2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const metrics=await prisma.$queryRaw<Array<{institutions:bigint;active_institutions:bigint;students:bigint;faculty:bigint;published_lessons:bigint;attempts:bigint;assignments:bigint}>>`SELECT
    (SELECT count(*) FROM public.institutions)::bigint institutions,
    (SELECT count(*) FROM public.institutions WHERE status='active')::bigint active_institutions,
    (SELECT count(*) FROM public.user_roles WHERE role='STUDENT' AND account_status='active')::bigint students,
    (SELECT count(*) FROM public.user_roles WHERE role='FACULTY' AND account_status='active')::bigint faculty,
    (SELECT count(*) FROM public.taksh_content_assets WHERE status='published')::bigint published_lessons,
    (SELECT count(*) FROM public.assessment_attempts)::bigint attempts,
    (SELECT count(*) FROM public.student_course_assignments WHERE active)::bigint assignments`;
  return (
    <DashboardShell {...session.user}>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(metrics[0]).map(([key,value])=><section className="glass-card" key={key}><p className="text-sm capitalize text-zinc-400">{key.replaceAll("_"," ")}</p><b className="mt-2 block text-3xl">{Number(value)}</b></section>)}</div>
      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/super-admin/content-factory" className="glass-card transition hover:border-violet-500/40">
          <Sparkles className="size-7 text-violet-400" />
          <h2 className="mt-6 text-2xl font-semibold">Content Factory</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Generate, review, approve and publish curriculum content.</p>
        </Link>
        {[
          [Building2, "Institutions", "Manage colleges and their administrators.", "/super-admin/institutions"],
          [Users, "Platform users", "Manage roles and account access across Taksh AI.", "/super-admin/users"],
          [BookOpenCheck, "Course operations", "Grant and assign published courses without SQL.", "/super-admin/courses"],
          [ShieldCheck, "Governance", "Review permissions, publishing and platform activity.", "/super-admin/governance"],
        ].map(([Icon, title, description, href]) => (
          <Link href={String(href)} className="glass-card transition hover:border-violet-500/40" key={String(title)}>
            <Icon className="size-6 text-violet-400" />
            <h2 className="mt-6 text-xl font-semibold">{String(title)}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{String(description)}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
