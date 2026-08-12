import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { inviteInstitutionUser, updateInstitutionMember } from "../actions";
import { StudentCsvImport } from "@/components/admin/student-csv-import";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { session, institutionId } = await requireCollegeAdmin();
  const filters = await searchParams;
  const [people, departments, batches, courses] = await Promise.all([
    prisma.$queryRaw<Array<{ user_id: string; email: string; role: string; account_status: string; department_id: string | null; batch_id: string | null; course: string | null }>>`
      SELECT role.user_id,user_account.email,role.role::text,role.account_status,
        membership.department_id,membership.batch_id,teaching.course
      FROM public.user_roles role JOIN auth.users user_account ON user_account.id=role.user_id
      LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
      LEFT JOIN LATERAL (
        SELECT assignment.course FROM public.faculty_assignments assignment
        WHERE assignment.faculty_id=role.user_id AND assignment.institution_id=role.institution_id AND assignment.active
        ORDER BY assignment.created_at DESC LIMIT 1
      ) teaching ON true
      WHERE role.institution_id=${institutionId}::uuid AND role.role IN ('STUDENT','FACULTY')
        AND (${filters.q ?? ""}='' OR user_account.email ILIKE ${`%${filters.q ?? ""}%`})
        AND (${filters.role ?? ""}='' OR role.role::text=${filters.role ?? ""})
      ORDER BY role.role,user_account.email`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id,name FROM public.departments WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; name: string; department_id: string | null; semester_name: string | null; year_name: string }>>`
      SELECT batch.id,batch.name,batch.department_id,semester.name semester_name,batch.academic_year year_name
      FROM public.academic_batches batch LEFT JOIN public.semesters semester ON semester.id=batch.semester_id
      WHERE batch.institution_id=${institutionId}::uuid AND batch.status='active'
      ORDER BY batch.academic_year DESC,semester.sequence_number,batch.name`,
    prisma.$queryRaw<Array<{ course: string }>>`
      SELECT course FROM public.institution_course_access
      WHERE institution_id=${institutionId}::uuid AND active ORDER BY course`,
  ]);

  return <DashboardShell {...session.user}>
    <ActionFeedbackForm action={inviteInstitutionUser} successMessage="Invitation sent successfully." pendingMessage="Sending invitation…" className="glass-card grid gap-3 md:grid-cols-[1fr_180px_auto]"><input className="field" name="email" type="email" placeholder="Email" required/><select className="field" name="role"><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option></select><button className="btn-primary">Invite</button></ActionFeedbackForm>
    <form className="mt-6 flex gap-3"><input className="field" name="q" placeholder="Search email" defaultValue={filters.q}/><select className="field" name="role" defaultValue={filters.role}><option value="">All roles</option><option value="STUDENT">Students</option><option value="FACULTY">Faculty</option></select><button className="btn-ghost">Search</button></form>
    <section className="glass-card mt-6">
      <h2 className="text-xl font-semibold">Institution people</h2>
      <p className="mt-2 text-sm text-zinc-400">Map students and faculty to their department and section. Faculty may also receive one teaching course for this deployment phase.</p>
      <div className="mt-5 space-y-3">{people.map(person=><ActionFeedbackForm action={updateInstitutionMember} successMessage={`${person.email} updated successfully.`} pendingMessage="Updating member…" className="grid gap-3 rounded-xl border border-white/10 p-4 xl:grid-cols-[1.2fr_140px_1fr_1.2fr_1fr_auto]" key={person.user_id}>
        <input type="hidden" name="userId" value={person.user_id}/>
        <div><b>{person.email}</b><p className="text-xs text-zinc-500">{person.role} · {person.account_status}</p></div>
        <select aria-label={`Status for ${person.email}`} className="field" name="status" defaultValue={person.account_status}><option value="active">Active</option><option value="suspended">Suspended</option></select>
        <select aria-label={`Department for ${person.email}`} className="field" name="departmentId" defaultValue={person.department_id??""}><option value="">No department</option>{departments.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <select aria-label={`Section for ${person.email}`} className="field" name="batchId" defaultValue={person.batch_id??""}><option value="">No section / batch</option>{batches.map(item=><option value={item.id} key={item.id}>{item.year_name} · {item.semester_name??"No semester"} · {item.name}</option>)}</select>
        <select aria-label={`Course for ${person.email}`} className="field" name="course" defaultValue={person.course??""} disabled={person.role!=="FACULTY"}><option value="">No faculty course</option>{courses.map(item=><option value={item.course} key={item.course}>{item.course}</option>)}</select>
        <button className="btn-primary">Save</button>
      </ActionFeedbackForm>)}</div>
    </section>
    <StudentCsvImport />
  </DashboardShell>;
}
