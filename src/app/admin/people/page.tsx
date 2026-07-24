import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { inviteInstitutionUser, updateInstitutionMember } from "../actions";
import { StudentCsvImport } from "@/components/admin/student-csv-import";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { session, institutionId } = await requireCollegeAdmin();
  const filters = await searchParams;
  const [people, departments, batches] = await Promise.all([
    prisma.$queryRaw<Array<{ user_id: string; email: string; role: string; account_status: string; department_id: string | null; batch_id: string | null }>>`
      SELECT role.user_id,user_account.email,role.role::text,role.account_status,membership.department_id,membership.batch_id
      FROM public.user_roles role JOIN auth.users user_account ON user_account.id=role.user_id
      LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
      WHERE role.institution_id=${institutionId}::uuid AND role.role IN ('STUDENT','FACULTY')
        AND (${filters.q ?? ""}='' OR user_account.email ILIKE ${`%${filters.q ?? ""}%`})
        AND (${filters.role ?? ""}='' OR role.role::text=${filters.role ?? ""})
      ORDER BY role.role,user_account.email`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id,name FROM public.departments WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id,name FROM public.academic_batches WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
  ]);
  return <DashboardShell {...session.user}>
    <ActionFeedbackForm action={inviteInstitutionUser} successMessage="Invitation sent successfully." pendingMessage="Sending invitation…" className="glass-card grid gap-3 md:grid-cols-[1fr_180px_auto]"><input className="field" name="email" type="email" placeholder="Email" required/><select className="field" name="role"><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option></select><button className="btn-primary">Invite</button></ActionFeedbackForm>
    <form className="mt-6 flex gap-3"><input className="field" name="q" placeholder="Search email" defaultValue={filters.q}/><select className="field" name="role" defaultValue={filters.role}><option value="">All roles</option><option value="STUDENT">Students</option><option value="FACULTY">Faculty</option></select><button className="btn-ghost">Search</button></form>
    <section className="glass-card mt-6"><h2 className="text-xl font-semibold">Institution people</h2><div className="mt-5 space-y-3">{people.map((person)=><form action={updateInstitutionMember} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_140px_1fr_1fr_auto]" key={person.user_id}><input type="hidden" name="userId" value={person.user_id}/><div><b>{person.email}</b><p className="text-xs text-zinc-500">{person.role} · {person.account_status}</p></div><select className="field" name="status" defaultValue={person.account_status}><option value="active">Active</option><option value="suspended">Suspended</option></select><select className="field" name="departmentId" defaultValue={person.department_id??""}><option value="">No department</option>{departments.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><select className="field" name="batchId" defaultValue={person.batch_id??""}><option value="">No batch</option>{batches.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="btn-primary">Save</button></form>)}</div></section>
    <StudentCsvImport />
  </DashboardShell>;
}
