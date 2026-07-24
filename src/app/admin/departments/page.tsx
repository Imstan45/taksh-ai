import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { saveDepartment, setDepartmentStatus } from "../actions";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";

export default async function DepartmentsPage() {
  const { session, institutionId } = await requireCollegeAdmin();
  const departments = await prisma.$queryRaw<Array<{ id: string; name: string; code: string; status: string }>>`
    SELECT id,name,code,status FROM public.departments WHERE institution_id=${institutionId}::uuid ORDER BY name
  `;
  return <DashboardShell {...session.user}><div className="grid gap-6 lg:grid-cols-[340px_1fr]">
    <ActionFeedbackForm action={saveDepartment} successMessage="Department created successfully." pendingMessage="Creating department…" className="glass-card h-fit space-y-3"><h2 className="text-xl font-semibold">Create department</h2><input className="field" name="name" placeholder="Department name" required /><input className="field" name="code" placeholder="Code" required /><button className="btn-primary">Create</button></ActionFeedbackForm>
    <section className="glass-card"><h2 className="text-xl font-semibold">Departments</h2><div className="mt-5 space-y-3">{departments.map((department) =>
      <form action={saveDepartment} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_130px_120px_auto]" key={department.id}>
        <input type="hidden" name="id" value={department.id} /><input className="field" name="name" defaultValue={department.name} /><input className="field" name="code" defaultValue={department.code} />
        <span className="self-center capitalize">{department.status}</span><div className="flex gap-2 md:col-span-4 md:justify-end"><button className="btn-primary">Save</button><button className="btn-ghost" formAction={setDepartmentStatus} name="status" value={department.status === "active" ? "inactive" : "active"}>{department.status === "active" ? "Deactivate" : "Activate"}</button></div>
      </form>)}</div></section>
  </div></DashboardShell>;
}
