import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { saveAcademicYear, saveBatch, setBatchStatus } from "../actions";

export default async function AcademicsPage() {
  const { session, institutionId } = await requireCollegeAdmin();
  const [years, departments, batches] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; name: string; starts_on: Date; ends_on: Date; status: string }>>`SELECT id,name,starts_on,ends_on,status FROM public.academic_years WHERE institution_id=${institutionId}::uuid ORDER BY starts_on DESC`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`SELECT id,name FROM public.departments WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; name: string; status: string; department_id: string | null; academic_year_id: string | null; department_name: string | null; year_name: string }>>`
      SELECT batch.id,batch.name,batch.status,batch.department_id,batch.academic_year_id,department.name department_name,batch.academic_year year_name
      FROM public.academic_batches batch LEFT JOIN public.departments department ON department.id=batch.department_id
      WHERE batch.institution_id=${institutionId}::uuid ORDER BY batch.academic_year DESC,batch.name`,
  ]);
  return <DashboardShell {...session.user}><div className="grid gap-6 md:grid-cols-2">
    <form action={saveAcademicYear} className="glass-card space-y-3"><h2 className="text-xl font-semibold">Academic year</h2><input className="field" name="name" placeholder="2026–2027" required /><div className="grid grid-cols-2 gap-3"><input className="field" name="startsOn" type="date" required /><input className="field" name="endsOn" type="date" required /></div><button className="btn-primary">Create or update</button><div className="space-y-2 pt-3">{years.map((year) => <p className="rounded-xl border border-white/10 p-3" key={year.id}><b>{year.name}</b><br/><small>{year.starts_on.toLocaleDateString()} – {year.ends_on.toLocaleDateString()} · {year.status}</small></p>)}</div></form>
    <form action={saveBatch} className="glass-card space-y-3"><h2 className="text-xl font-semibold">Create batch</h2><input className="field" name="name" placeholder="Batch name" required /><select className="field" name="departmentId" required><option value="">Department</option>{departments.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><select className="field" name="academicYearId" required><option value="">Academic year</option>{years.filter((item)=>item.status==="active").map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="btn-primary">Create batch</button></form>
  </div><section className="glass-card mt-6"><h2 className="text-xl font-semibold">Batches</h2><div className="mt-5 space-y-3">{batches.map((batch)=><form action={setBatchStatus} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4" key={batch.id}><input type="hidden" name="id" value={batch.id}/><div><b>{batch.name}</b><p className="text-sm text-zinc-400">{batch.department_name} · {batch.year_name}</p></div><button className="btn-ghost" name="status" value={batch.status==="active"?"inactive":"active"}>{batch.status==="active"?"Deactivate":"Activate"}</button></form>)}</div></section></DashboardShell>;
}
