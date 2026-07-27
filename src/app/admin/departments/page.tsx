import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { saveDepartment, setDepartmentStatus } from "../actions";

export default async function DepartmentsPage() {
  const { session, institutionId } = await requireCollegeAdmin();
  const departments = await prisma.$queryRaw<Array<{ id: string; name: string; code: string; status: string }>>`
    SELECT id,name,code,status FROM public.departments WHERE institution_id=${institutionId}::uuid ORDER BY name`;
  return <DashboardShell {...session.user}><div className="grid gap-6 lg:grid-cols-[340px_1fr]">
    <ActionFeedbackForm action={saveDepartment} successMessage="Department created successfully." pendingMessage="Creating department…" className="glass-card h-fit space-y-3"><h2 className="text-xl font-semibold">Create department</h2><input className="field" name="name" placeholder="Department name" required/><input className="field" name="code" placeholder="Code" required/><button className="btn-primary">Create</button></ActionFeedbackForm>
    <section className="glass-card"><h2 className="text-xl font-semibold">Departments</h2><div className="mt-5 space-y-3">{departments.map(department=>
      <div className="rounded-xl border border-white/10 p-4" key={department.id}>
        <ActionFeedbackForm action={saveDepartment} successMessage={`${department.name} saved successfully.`} pendingMessage="Saving department…" className="grid gap-3 md:grid-cols-[1fr_130px_120px_auto]">
          <input type="hidden" name="id" value={department.id}/><input className="field" name="name" defaultValue={department.name}/><input className="field" name="code" defaultValue={department.code}/><span className="self-center capitalize">{department.status}</span><button className="btn-primary md:col-span-4 md:justify-self-end">Save</button>
        </ActionFeedbackForm>
        <ActionFeedbackForm action={setDepartmentStatus} successMessage={`Department ${department.status==="active"?"deactivated":"activated"}.`} pendingMessage="Updating department…" confirmMessage={`${department.status==="active"?"Deactivate":"Activate"} ${department.name}?`} className="mt-2 flex justify-end">
          <input type="hidden" name="id" value={department.id}/><button className="btn-ghost" name="status" value={department.status==="active"?"inactive":"active"}>{department.status==="active"?"Deactivate":"Activate"}</button>
        </ActionFeedbackForm>
      </div>)}</div></section>
  </div></DashboardShell>;
}
