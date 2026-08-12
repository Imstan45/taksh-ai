import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";
import { createLearningActivity, setActivityStatus } from "./actions";

export default async function FacultyActivities() {
  const { session, institutionId } = await requireFaculty();
  const [classes, activities] = await Promise.all([
    prisma.$queryRaw<Array<{ batch_id: string; batch_name: string; department_name: string | null; course: string | null }>>`
      SELECT DISTINCT assignment.batch_id,batch.name batch_name,department.name department_name,assignment.course
      FROM public.faculty_assignments assignment JOIN public.academic_batches batch ON batch.id=assignment.batch_id
      LEFT JOIN public.departments department ON department.id=assignment.department_id
      WHERE assignment.faculty_id=${session.user.id}::uuid AND assignment.institution_id=${institutionId}::uuid AND assignment.active
      ORDER BY department.name,batch.name,assignment.course`,
    prisma.$queryRaw<Array<{ id: string; title: string; activity_type: string; course: string; batch_name: string; due_at: Date | null; status: string; submitted: bigint; total: bigint }>>`
      SELECT activity.id,activity.title,activity.activity_type,activity.course,batch.name batch_name,activity.due_at,activity.status,
        count(submission.id) FILTER(WHERE submission.status IN ('submitted','late','graded'))::bigint submitted,
        (SELECT count(*) FROM public.user_academic_memberships membership WHERE membership.batch_id=activity.batch_id AND membership.membership_type='STUDENT' AND membership.active)::bigint total
      FROM public.learning_activities activity JOIN public.academic_batches batch ON batch.id=activity.batch_id
      LEFT JOIN public.activity_submissions submission ON submission.activity_id=activity.id
      WHERE activity.faculty_id=${session.user.id}::uuid AND activity.institution_id=${institutionId}::uuid
      GROUP BY activity.id,batch.name ORDER BY activity.created_at DESC`,
  ]);
  return <DashboardShell {...session.user}>
    <ActionFeedbackForm action={createLearningActivity} successMessage="Activity saved successfully." pendingMessage="Saving activity…" className="glass-card grid gap-3 lg:grid-cols-2">
      <div className="lg:col-span-2"><h2 className="text-xl font-semibold">Create activity</h2><p className="mt-2 text-sm text-zinc-400">One workflow for homework, classwork and assignments.</p></div>
      <select className="field" name="batchId" required><option value="">Class / section</option>{classes.filter(item=>item.batch_id).map(item=><option value={item.batch_id} key={`${item.batch_id}-${item.course}`}>{item.department_name} · {item.batch_name}</option>)}</select>
      <select className="field" name="course" required><option value="">Course</option>{[...new Set(classes.map(item=>item.course).filter(Boolean))].map(course=><option key={course!}>{course}</option>)}</select>
      <select className="field" name="activityType" required><option value="homework">Homework</option><option value="classwork">Classwork</option><option value="assignment">Assignment</option></select>
      <input className="field" name="title" placeholder="Activity title" required/>
      <textarea className="field min-h-28 lg:col-span-2" name="description" placeholder="Instructions and expected outcome" required/>
      <input aria-label="Due date" className="field" name="dueAt" type="datetime-local"/>
      <input className="field" name="maxMarks" type="number" min="1" step="0.5" defaultValue="100" required/>
      <div className="flex gap-3 lg:col-span-2"><button className="btn-ghost border border-white/10" name="status" value="draft">Save draft</button><button className="btn-primary" name="status" value="published">Publish to class</button></div>
    </ActionFeedbackForm>
    <section className="glass-card mt-6"><h2 className="text-xl font-semibold">Recent activities</h2><div className="mt-5 space-y-3">{activities.length ? activities.map(activity=><div className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[1fr_auto]" key={activity.id}><div><Link className="font-semibold hover:text-violet-300" href={`/admin/faculty/activities/${activity.id}`}>{activity.title}</Link><p className="mt-1 text-sm text-zinc-400">{activity.activity_type} · {activity.course} · {activity.batch_name}</p><p className="mt-1 text-xs text-zinc-500">{Number(activity.submitted)}/{Number(activity.total)} submitted · {activity.due_at ? `Due ${activity.due_at.toLocaleString()}` : "No deadline"}</p></div><ActionFeedbackForm action={setActivityStatus} successMessage="Activity status updated." pendingMessage="Updating…"><input type="hidden" name="id" value={activity.id}/>{activity.status==="draft"&&<button className="btn-primary" name="status" value="published">Publish</button>}{activity.status==="published"&&<button className="btn-ghost" name="status" value="closed">Close</button>}{activity.status==="closed"&&<button className="btn-ghost" name="status" value="archived">Archive</button>}</ActionFeedbackForm></div>) : <p className="text-zinc-400">No activities created yet.</p>}</div></section>
  </DashboardShell>;
}
