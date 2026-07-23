import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";
import { saveFacultyFeedback } from "../../actions";

export default async function LearnerDetail({ params }: { params: Promise<{ studentId:string }> }) {
  const { studentId }=await params; const { session,institutionId }=await requireFaculty();
  const allowed=await prisma.$queryRaw<Array<{ email:string }>>`
    SELECT user_account.email FROM public.user_academic_memberships membership JOIN auth.users user_account ON user_account.id=membership.user_id
    JOIN public.faculty_assignments assignment ON assignment.faculty_id=${session.user.id}::uuid AND assignment.active
      AND assignment.institution_id=membership.institution_id AND (assignment.batch_id IS NULL OR assignment.batch_id=membership.batch_id)
      AND (assignment.cohort_id IS NULL OR assignment.cohort_id=membership.cohort_id)
    WHERE membership.user_id=${studentId}::uuid AND membership.institution_id=${institutionId}::uuid AND membership.active`;
  if(!allowed[0]) notFound();
  const [progress,attempts,feedback]=await Promise.all([
    prisma.$queryRaw<Array<{course:string;module:string;topic:string;subtopic:string;progress_percentage:number;status:string;last_viewed_at:Date|null}>>`SELECT course,module,topic,subtopic,progress_percentage,status,last_viewed_at FROM public.student_content_progress WHERE student_id=${studentId}::uuid ORDER BY last_viewed_at DESC NULLS LAST`,
    prisma.$queryRaw<Array<{title:string;percentage:number|null;status:string;submitted_at:Date|null}>>`SELECT assessment.title,attempt.percentage,attempt.status,attempt.submitted_at FROM public.assessment_attempts attempt JOIN public.assessments assessment ON assessment.id=attempt.assessment_id WHERE attempt.student_id=${studentId}::uuid AND assessment.institution_id=${institutionId}::uuid ORDER BY attempt.started_at DESC`,
    prisma.$queryRaw<Array<{body:string;course:string|null;topic:string|null;created_at:Date}>>`SELECT body,course,topic,created_at FROM public.faculty_feedback WHERE faculty_id=${session.user.id}::uuid AND student_id=${studentId}::uuid ORDER BY created_at DESC`,
  ]);
  return <DashboardShell {...session.user}><h2 className="text-2xl font-semibold">{allowed[0].email}</h2><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="glass-card"><h3 className="text-lg font-semibold">Learning progress</h3><div className="mt-4 space-y-2">{progress.map((item)=><div className="rounded-xl border border-white/10 p-3" key={item.subtopic}><b>{item.subtopic}</b><p className="text-sm text-zinc-400">{item.course} · {item.module} · {item.progress_percentage}% · {item.status}</p></div>)}</div></section><section className="glass-card"><h3 className="text-lg font-semibold">Assessment history</h3><div className="mt-4 space-y-2">{attempts.map((item,index)=><p className="rounded-xl border border-white/10 p-3" key={index}><b>{item.title}</b><br/><small>{item.percentage??0}% · {item.status}</small></p>)}</div></section></div><form action={saveFacultyFeedback} className="glass-card mt-6 grid gap-3 md:grid-cols-2"><input type="hidden" name="studentId" value={studentId}/><h3 className="text-lg font-semibold md:col-span-2">Add feedback</h3><input className="field" name="course" placeholder="Course"/><input className="field" name="topic" placeholder="Topic (optional)"/><textarea className="field md:col-span-2" name="body" placeholder="Actionable feedback" required/><button className="btn-primary md:col-span-2">Save feedback</button></form><section className="glass-card mt-6"><h3 className="text-lg font-semibold">Your feedback</h3>{feedback.map((item,index)=><p className="mt-3 rounded-xl border border-white/10 p-3" key={index}>{item.body}<br/><small>{item.course} {item.topic} · {item.created_at.toLocaleDateString()}</small></p>)}</section></DashboardShell>;
}
