import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";

type Metrics = {
  total_students: bigint; active_students: bigint; total_faculty: bigint; departments: bigint;
  batches: bigint; active_assignments: bigint; completion: number | null; assessment_participation: number | null;
};

export default async function Page() {
  const initial = await auth();
  if (!initial?.user || !["COLLEGE_ADMIN", "FACULTY"].includes(initial.user.role)) redirect("/admin/login");
  if (initial.user.role === "FACULTY") redirect("/admin/faculty");
  const { session, institutionId } = await requireCollegeAdmin();
  const rows = await prisma.$queryRaw<Metrics[]>`
    SELECT
      count(*) FILTER (WHERE role.role='STUDENT')::bigint total_students,
      count(*) FILTER (WHERE role.role='STUDENT' AND role.account_status='active')::bigint active_students,
      count(*) FILTER (WHERE role.role='FACULTY' AND role.account_status='active')::bigint total_faculty,
      (SELECT count(*) FROM public.departments WHERE institution_id=${institutionId}::uuid AND status='active')::bigint departments,
      (SELECT count(*) FROM public.academic_batches WHERE institution_id=${institutionId}::uuid AND status='active')::bigint batches,
      (SELECT count(*) FROM public.student_course_assignments WHERE institution_id=${institutionId}::uuid AND active)::bigint active_assignments,
      (SELECT round(avg(progress_percentage),1) FROM public.student_content_progress progress JOIN public.user_roles member ON member.user_id=progress.student_id WHERE member.institution_id=${institutionId}::uuid)::float completion,
      (SELECT round(100.0*count(DISTINCT attempt.student_id)/nullif(count(DISTINCT assignment.student_id),0),1) FROM public.assessment_assignments assignment LEFT JOIN public.assessment_attempts attempt ON attempt.assignment_id=assignment.id WHERE assignment.institution_id=${institutionId}::uuid)::float assessment_participation
    FROM public.user_roles role WHERE role.institution_id=${institutionId}::uuid
  `;
  const metrics = rows[0];
  const cards = [
    ["Total students", Number(metrics.total_students)], ["Active students", Number(metrics.active_students)],
    ["Faculty", Number(metrics.total_faculty)], ["Departments", Number(metrics.departments)],
    ["Batches", Number(metrics.batches)], ["Active course assignments", Number(metrics.active_assignments)],
    ["Course completion", `${metrics.completion ?? 0}%`], ["Assessment participation", `${metrics.assessment_participation ?? 0}%`],
  ];
  return <DashboardShell {...session.user}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value])=><section className="glass-card" key={label}><p className="text-sm text-zinc-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></section>)}</div><div className="mt-6 grid gap-4 md:grid-cols-2"><Link className="glass-card hover:border-violet-400/40" href="/admin/departments"><h2 className="text-xl font-semibold">Departments</h2><p className="mt-2 text-zinc-400">Create, edit, activate and deactivate departments.</p></Link><Link className="glass-card hover:border-violet-400/40" href="/admin/academics"><h2 className="text-xl font-semibold">Academic years and batches</h2><p className="mt-2 text-zinc-400">Manage academic periods and institution batches.</p></Link></div></DashboardShell>;
}
