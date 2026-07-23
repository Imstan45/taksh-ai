import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { assignStudentCourse, grantInstitutionCourse, revokeStudentCourse } from "../actions";

export default async function CourseOperationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/super-admin/login");
  const [courses, institutions, students, assignments] = await Promise.all([
    prisma.$queryRaw<Array<{ course: string }>>`SELECT DISTINCT course FROM public.taksh_content_assets WHERE status = 'published' ORDER BY course`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id, name FROM public.institutions WHERE status = 'active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT u.id, u.email FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
      WHERE r.role = 'STUDENT' AND r.account_status = 'active' ORDER BY u.email
    `,
    prisma.$queryRaw<Array<{ id: string; email: string; course: string; active: boolean }>>`
      SELECT assignment.id, users.email, assignment.course, assignment.active
      FROM public.student_course_assignments assignment
      JOIN auth.users users ON users.id = assignment.student_id
      ORDER BY assignment.assigned_at DESC LIMIT 100
    `,
  ]);
  return (
    <DashboardShell {...session.user}>
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={grantInstitutionCourse} className="glass-card space-y-4">
          <h2 className="text-xl font-semibold">Make course available</h2>
          <select className="field" name="institutionId" required><option value="">Choose institution</option>{institutions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          <select className="field" name="course" required><option value="">Choose published course</option>{courses.map((item) => <option value={item.course} key={item.course}>{item.course}</option>)}</select>
          <button className="btn-primary">Grant course</button>
        </form>
        <form action={assignStudentCourse} className="glass-card space-y-4">
          <h2 className="text-xl font-semibold">Assign to student</h2>
          <select className="field" name="studentId" required><option value="">Choose student</option>{students.map((item) => <option value={item.id} key={item.id}>{item.email}</option>)}</select>
          <select className="field" name="course" required><option value="">Choose course</option>{courses.map((item) => <option value={item.course} key={item.course}>{item.course}</option>)}</select>
          <button className="btn-primary">Assign course</button>
        </form>
      </div>
      <section className="glass-card mt-6">
        <h2 className="text-xl font-semibold">Student assignments</h2>
        <div className="mt-4 divide-y divide-white/10">{assignments.map((item) => <div className="flex items-center justify-between gap-4 py-4" key={item.id}><div><b>{item.email}</b><p className="text-sm text-zinc-500">{item.course}</p></div>{item.active ? <form action={revokeStudentCourse}><input type="hidden" name="assignmentId" value={item.id} /><button className="btn-ghost border border-white/10">Revoke</button></form> : <span className="text-xs text-zinc-500">Revoked</span>}</div>)}</div>
      </section>
    </DashboardShell>
  );
}
