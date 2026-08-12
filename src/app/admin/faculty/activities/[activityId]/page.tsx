import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";
import { gradeSubmission } from "../actions";

export default async function ActivityDetail({ params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const { session, institutionId } = await requireFaculty();
  const activities = await prisma.$queryRaw<Array<{ title: string; description: string; course: string; activity_type: string; due_at: Date | null; max_marks: number; batch_name: string }>>`
    SELECT activity.title,activity.description,activity.course,activity.activity_type,activity.due_at,activity.max_marks::float max_marks,batch.name batch_name
    FROM public.learning_activities activity JOIN public.academic_batches batch ON batch.id=activity.batch_id
    WHERE activity.id=${activityId}::uuid AND activity.institution_id=${institutionId}::uuid AND activity.faculty_id=${session.user.id}::uuid
  `;
  const activity = activities[0]; if (!activity) notFound();
  const submissions = await prisma.$queryRaw<Array<{ id: string | null; student_id: string; email: string; text_content: string | null; file_url: string | null; file_name: string | null; status: string; submitted_at: Date | null; marks: number | null; grade: string | null; feedback: string | null }>>`
    SELECT submission.id,membership.user_id student_id,account.email,submission.text_content,submission.file_url,submission.file_name,
      coalesce(submission.status,'pending') status,submission.submitted_at,submission.marks::float marks,submission.grade,submission.feedback
      FROM public.user_academic_memberships membership JOIN auth.users account ON account.id=membership.user_id
    JOIN public.learning_activities activity ON activity.id=${activityId}::uuid AND activity.batch_id=membership.batch_id
    LEFT JOIN public.activity_submissions submission ON submission.activity_id=activity.id AND submission.student_id=membership.user_id
    WHERE membership.institution_id=${institutionId}::uuid AND membership.membership_type='STUDENT' AND membership.active ORDER BY account.email
  `;
  return <DashboardShell {...session.user}><section className="glass-card"><p className="eyebrow">{activity.activity_type}</p><h2 className="mt-4 text-2xl font-semibold">{activity.title}</h2><p className="mt-2 text-zinc-400">{activity.course} · {activity.batch_name} · {activity.max_marks} marks</p><p className="mt-4 whitespace-pre-wrap">{activity.description}</p></section><section className="glass-card mt-6"><h2 className="text-xl font-semibold">Student submissions</h2><div className="mt-5 space-y-4">{submissions.map(item=><article className="rounded-xl border border-white/10 p-4" key={item.student_id}><div className="flex flex-wrap justify-between gap-3"><div><b>{item.email}</b><p className="text-sm text-zinc-400">{item.status}{item.submitted_at ? ` · ${item.submitted_at.toLocaleString()}` : ""}</p></div>{item.marks!==null&&<strong>{item.marks}/{activity.max_marks}{item.grade?` · ${item.grade}`:""}</strong>}</div>{item.text_content&&<p className="mt-4 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm">{item.text_content}</p>}{item.file_url&&item.id&&<a className="mt-3 inline-block text-sm text-violet-300" href={`/api/activities/submissions/${item.id}/file`} target="_blank" rel="noreferrer">Open {item.file_name??"attachment"}</a>}{item.id&&<ActionFeedbackForm action={gradeSubmission} successMessage="Grade released to the student." pendingMessage="Saving grade…" className="mt-4 grid gap-3 md:grid-cols-[140px_140px_1fr_auto]"><input type="hidden" name="submissionId" value={item.id}/><input aria-label={`Marks for ${item.email}`} className="field" name="marks" type="number" min="0" max={activity.max_marks} step="0.5" defaultValue={item.marks??""} required/><input aria-label={`Grade for ${item.email}`} className="field" name="grade" placeholder="Grade (optional)" defaultValue={item.grade??""}/><input aria-label={`Feedback for ${item.email}`} className="field" name="feedback" placeholder="Actionable feedback" defaultValue={item.feedback??""}/><button className="btn-primary">Release grade</button></ActionFeedbackForm>}</article>)}</div></section></DashboardShell>;
}
