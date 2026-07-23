import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const permissions = [
  ["Super Admin", "All institutions, users, roles, governance, content generation and publishing"],
  ["College Admin", "Assigned institution, faculty, students, course assignments and college reports"],
  ["Faculty", "Assigned learners, approved teaching content, assessments and progress"],
  ["Student", "Own profile, assigned lessons, assessments and gamified progress"],
];

export default async function GovernancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  return (
    <DashboardShell {...session.user}>
      <section className="glass-card">
        <h2 className="text-2xl font-semibold">Access governance</h2>
        <p className="mt-2 text-sm text-zinc-400">Server-enforced role boundaries currently active across Taksh AI.</p>
        <div className="mt-6 divide-y divide-white/10">{permissions.map(([role, access]) => <div className="grid gap-2 py-5 md:grid-cols-[180px_1fr]" key={role}><b>{role}</b><p className="text-sm leading-6 text-zinc-400">{access}</p></div>)}</div>
      </section>
    </DashboardShell>
  );
}
