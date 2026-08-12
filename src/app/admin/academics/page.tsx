import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { saveAcademicYear, saveBatch, saveSemester, setBatchStatus, setSemesterStatus } from "../actions";

export default async function AcademicsPage() {
  const { session, institutionId } = await requireCollegeAdmin();
  const [years, semesters, departments, batches] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; name: string; starts_on: Date; ends_on: Date; status: string }>>`
      SELECT id,name,starts_on,ends_on,status FROM public.academic_years
      WHERE institution_id=${institutionId}::uuid ORDER BY starts_on DESC`,
    prisma.$queryRaw<Array<{ id: string; name: string; sequence_number: number; academic_year_id: string; year_name: string; status: string }>>`
      SELECT semester.id,semester.name,semester.sequence_number,semester.academic_year_id,
        year.name year_name,semester.status
      FROM public.semesters semester JOIN public.academic_years year ON year.id=semester.academic_year_id
      WHERE semester.institution_id=${institutionId}::uuid
      ORDER BY year.starts_on DESC,semester.sequence_number`,
    prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id,name FROM public.departments
      WHERE institution_id=${institutionId}::uuid AND status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{ id: string; name: string; status: string; department_name: string | null; year_name: string; semester_name: string | null }>>`
      SELECT batch.id,batch.name,batch.status,department.name department_name,
        batch.academic_year year_name,semester.name semester_name
      FROM public.academic_batches batch
      LEFT JOIN public.departments department ON department.id=batch.department_id
      LEFT JOIN public.semesters semester ON semester.id=batch.semester_id
      WHERE batch.institution_id=${institutionId}::uuid
      ORDER BY batch.academic_year DESC,semester.sequence_number,batch.name`,
  ]);

  return <DashboardShell {...session.user}>
    <div className="grid gap-6 lg:grid-cols-3">
      <ActionFeedbackForm action={saveAcademicYear} successMessage="Academic year saved successfully." pendingMessage="Saving academic year…" className="glass-card space-y-3">
        <h2 className="text-xl font-semibold">Academic year</h2>
        <input className="field" name="name" placeholder="2026–2027" required/>
        <div className="grid grid-cols-2 gap-3"><input aria-label="Academic year starts on" className="field" name="startsOn" type="date" required/><input aria-label="Academic year ends on" className="field" name="endsOn" type="date" required/></div>
        <button className="btn-primary">Create or update</button>
        <div className="space-y-2 pt-3">{years.map(year=><p className="rounded-xl border border-white/10 p-3" key={year.id}><b>{year.name}</b><br/><small>{year.starts_on.toLocaleDateString()} – {year.ends_on.toLocaleDateString()} · {year.status}</small></p>)}</div>
      </ActionFeedbackForm>

      <ActionFeedbackForm action={saveSemester} successMessage="Semester saved successfully." pendingMessage="Saving semester…" className="glass-card space-y-3">
        <h2 className="text-xl font-semibold">Semester</h2>
        <input className="field" name="name" placeholder="Semester 1" required/>
        <select className="field" name="academicYearId" required><option value="">Academic year</option>{years.filter(item=>item.status==="active").map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <input className="field" name="sequenceNumber" type="number" min="1" placeholder="Sequence number" required/>
        <div className="grid grid-cols-2 gap-3"><input aria-label="Semester starts on" className="field" name="startsOn" type="date"/><input aria-label="Semester ends on" className="field" name="endsOn" type="date"/></div>
        <button className="btn-primary">Create or update</button>
      </ActionFeedbackForm>

      <ActionFeedbackForm action={saveBatch} successMessage="Section or batch created successfully." pendingMessage="Creating section or batch…" className="glass-card space-y-3">
        <h2 className="text-xl font-semibold">Section / batch</h2>
        <input className="field" name="name" placeholder="Section A" required/>
        <select className="field" name="departmentId" required><option value="">Department</option>{departments.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <select className="field" name="academicYearId" required><option value="">Academic year</option>{years.filter(item=>item.status==="active").map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <select className="field" name="semesterId" required><option value="">Semester</option>{semesters.filter(item=>item.status==="active").map(item=><option value={item.id} key={item.id}>{item.year_name} · {item.name}</option>)}</select>
        <button className="btn-primary">Create section / batch</button>
      </ActionFeedbackForm>
    </div>

    <section className="glass-card mt-6">
      <h2 className="text-xl font-semibold">Semesters</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{semesters.map(semester=><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4" key={semester.id}><div><b>{semester.name}</b><p className="text-sm text-zinc-400">{semester.year_name} · Semester {semester.sequence_number}</p></div><ActionFeedbackForm action={setSemesterStatus} successMessage={`Semester ${semester.status==="active"?"deactivated":"activated"}.`} pendingMessage="Updating semester…" confirmMessage={`${semester.status==="active"?"Deactivate":"Activate"} ${semester.name}?`}><input type="hidden" name="id" value={semester.id}/><button className="btn-ghost" name="status" value={semester.status==="active"?"inactive":"active"}>{semester.status==="active"?"Deactivate":"Activate"}</button></ActionFeedbackForm></div>)}</div>
    </section>

    <section className="glass-card mt-6">
      <h2 className="text-xl font-semibold">Sections / batches</h2>
      <div className="mt-5 space-y-3">{batches.map(batch=><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4" key={batch.id}><div><b>{batch.name}</b><p className="text-sm text-zinc-400">{batch.department_name} · {batch.year_name} · {batch.semester_name??"No semester"}</p></div><ActionFeedbackForm action={setBatchStatus} successMessage={`Section/batch ${batch.status==="active"?"deactivated":"activated"}.`} pendingMessage="Updating section or batch…" confirmMessage={`${batch.status==="active"?"Deactivate":"Activate"} ${batch.name}?`}><input type="hidden" name="id" value={batch.id}/><button className="btn-ghost" name="status" value={batch.status==="active"?"inactive":"active"}>{batch.status==="active"?"Deactivate":"Activate"}</button></ActionFeedbackForm></div>)}</div>
    </section>
  </DashboardShell>;
}
