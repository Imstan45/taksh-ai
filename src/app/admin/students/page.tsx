import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { prisma } from "@/lib/prisma";
import { bulkUpdateStudents } from "../actions";

type Filters = { q?: string; department?: string; batch?: string; page?: string };

export default async function Students({ searchParams }: { searchParams: Promise<Filters> }) {
  const { session, institutionId } = await requireCollegeAdmin();
  const filters = await searchParams;
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = filters.q ?? "";
  const department = filters.department ?? "";
  const batch = filters.batch ?? "";

  const [students, departments, batches, courses, totals] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; email: string; account_status: string; department_name: string | null; batch_name: string | null; roll_number: string | null }>>`
      SELECT role.user_id id,account.email,role.account_status,department.name department_name,
        academic_batch.name batch_name,membership.roll_number
      FROM public.user_roles role
      JOIN auth.users account ON account.id=role.user_id
      LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
      LEFT JOIN public.departments department ON department.id=membership.department_id
      LEFT JOIN public.academic_batches academic_batch ON academic_batch.id=membership.batch_id
      WHERE role.institution_id=${institutionId}::uuid AND role.role='STUDENT'
        AND (${search}='' OR account.email ILIKE ${`%${search}%`})
        AND (${department}='' OR membership.department_id=${department || null}::uuid)
        AND (${batch}='' OR membership.batch_id=${batch || null}::uuid)
      ORDER BY account.email LIMIT ${limit} OFFSET ${offset}`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id,name FROM public.departments WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id,name FROM public.academic_batches WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ course: string }>>`SELECT course FROM public.institution_course_access WHERE institution_id=${institutionId}::uuid AND active ORDER BY course`,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(DISTINCT role.user_id)::bigint count
      FROM public.user_roles role
      JOIN auth.users account ON account.id=role.user_id
      LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
      WHERE role.institution_id=${institutionId}::uuid AND role.role='STUDENT'
        AND (${search}='' OR account.email ILIKE ${`%${search}%`})
        AND (${department}='' OR membership.department_id=${department || null}::uuid)
        AND (${batch}='' OR membership.batch_id=${batch || null}::uuid)`,
  ]);

  const total = Number(totals[0]?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / limit));
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (department) params.set("department", department);
    if (batch) params.set("batch", batch);
    params.set("page", String(target));
    return `/admin/students?${params}`;
  };

  return <DashboardShell {...session.user}>
    <form className="flex flex-wrap gap-3">
      <input className="field" name="q" placeholder="Search email" defaultValue={search}/>
      <select className="field" name="department" defaultValue={department}><option value="">All departments</option>{departments.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <select className="field" name="batch" defaultValue={batch}><option value="">All batches</option>{batches.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <button className="btn-ghost">Filter</button>
    </form>
    <ActionFeedbackForm action={bulkUpdateStudents} successMessage="Selected students updated successfully." pendingMessage="Updating selected students…" confirmMessage="Apply this action to all selected students?" className="glass-card mt-6">
      <div className="flex flex-wrap gap-3">
        <select className="field" name="operation" required><option value="">Bulk action</option><option value="suspend">Suspend</option><option value="reactivate">Reactivate</option><option value="department">Move department</option><option value="batch">Move batch</option><option value="course">Assign course</option></select>
        <select className="field" name="value"><option value="">Target (if needed)</option><optgroup label="Departments">{departments.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</optgroup><optgroup label="Batches">{batches.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</optgroup><optgroup label="Courses">{courses.map(item=><option value={item.course} key={item.course}>{item.course}</option>)}</optgroup></select>
        <button className="btn-primary">Apply to selected</button>
      </div>
      <div className="mt-5 space-y-2">{students.map(student=><label className="grid grid-cols-[30px_1fr_1fr_1fr] rounded-xl border border-white/10 p-3" key={student.id}><input type="checkbox" name="userId" value={student.id}/><Link href={`/admin/students/${student.id}`}><b>{student.email}</b><small className="block">{student.roll_number}</small></Link><span>{student.department_name??"No department"} · {student.batch_name??"No batch"}</span><span>{student.account_status}</span></label>)}</div>
    </ActionFeedbackForm>
    <nav className="mt-5 flex items-center justify-between" aria-label="Student pages">
      <span className="text-sm text-zinc-400">{total ? `${offset + 1}–${Math.min(offset + limit, total)} of ${total}` : "No students found"}</span>
      <div className="flex gap-2">{page > 1 && <Link className="btn-ghost" href={pageHref(page - 1)}>Previous</Link>}{page < pages && <Link className="btn-ghost" href={pageHref(page + 1)}>Next</Link>}</div>
    </nav>
  </DashboardShell>;
}
