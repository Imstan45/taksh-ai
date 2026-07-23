import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { BookOpenCheck, ChartNoAxesCombined, Users } from "lucide-react";
export default async function Page() {
  const session = await auth();
  if (!session?.user || !["COLLEGE_ADMIN", "FACULTY"].includes(session.user.role)) redirect("/admin/login");
  const isCollegeAdmin = session.user.role === "COLLEGE_ADMIN";
  return (
    <DashboardShell {...session.user}>
      <div className="grid gap-5 md:grid-cols-3">
        {(isCollegeAdmin ? [
          [Users, "People", "Manage faculty and students in your institution."],
          [BookOpenCheck, "Assignments", "Assign approved courses to batches and learners."],
          [ChartNoAxesCombined, "College reports", "Review participation, completion and outcomes."],
        ] : [
          [Users, "Assigned learners", "View only students and batches assigned to you."],
          [BookOpenCheck, "Teaching", "Review approved content and manage assessments."],
          [ChartNoAxesCombined, "Progress", "Track performance and provide learner feedback."],
        ]).map(([Icon, title, description]) => (
          <section className="glass-card" key={String(title)}>
            <Icon className="size-6 text-violet-400" />
            <h2 className="mt-6 text-xl font-semibold">{String(title)}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{String(description)}</p>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
