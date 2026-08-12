import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { SubmissionForm } from "@/components/activities/submission-form";
import { prisma } from "@/lib/prisma";

export default async function StudentActivity({ params }: { params: Promise<{ activityId: string }> }) {
  const session=await auth(); if(!session?.user||session.user.role!=="STUDENT")redirect("/login"); const{activityId}=await params;
  const rows=await prisma.$queryRaw<Array<{ title:string;description:string;activity_type:string;course:string;due_at:Date|null;max_marks:number;faculty_email:string;allow_resubmission:boolean;submission_id:string|null;text_content:string|null;file_name:string|null;status:string|null;submitted_at:Date|null;marks:number|null;grade:string|null;feedback:string|null;graded_at:Date|null }>>`
    SELECT activity.title,activity.description,activity.activity_type,activity.course,activity.due_at,activity.max_marks::float max_marks,
      faculty.email faculty_email,activity.allow_resubmission,submission.id submission_id,submission.text_content,submission.file_name,
      submission.status,submission.submitted_at,submission.marks::float marks,submission.grade,submission.feedback,submission.graded_at
    FROM public.learning_activities activity JOIN auth.users faculty ON faculty.id=activity.faculty_id
    LEFT JOIN public.user_academic_memberships membership ON membership.user_id=${session.user.id}::uuid AND membership.active
    LEFT JOIN public.activity_submissions submission ON submission.activity_id=activity.id AND submission.student_id=${session.user.id}::uuid
    WHERE activity.id=${activityId}::uuid AND activity.status IN ('published','closed')
      AND (activity.student_id=${session.user.id}::uuid OR activity.batch_id=membership.batch_id) LIMIT 1`;
  const activity=rows[0]; if(!activity)notFound();
  const locked=activity.status==='graded'||(!activity.allow_resubmission&&Boolean(activity.submission_id));
  return <DashboardShell {...session.user}><section className="glass-card"><p className="eyebrow">{activity.activity_type}</p><h2 className="mt-4 text-3xl font-semibold">{activity.title}</h2><p className="mt-2 text-zinc-400">{activity.course} · {activity.max_marks} marks · {activity.faculty_email}</p><p className="mt-1 text-sm text-zinc-500">{activity.due_at?`Due ${activity.due_at.toLocaleString()}`:'No deadline'}</p><div className="mt-6 whitespace-pre-wrap leading-7 text-zinc-200">{activity.description}</div></section>{activity.status==='graded'&&<section className="glass-card mt-6 border-emerald-400/20"><p className="eyebrow">Result</p><h2 className="mt-4 text-3xl font-semibold">{activity.marks}/{activity.max_marks}{activity.grade?` · ${activity.grade}`:''}</h2><p className="mt-4 whitespace-pre-wrap text-zinc-300">{activity.feedback||'No written feedback was added.'}</p><p className="mt-3 text-xs text-zinc-500">Graded {activity.graded_at?.toLocaleString()}</p></section>}<section className="glass-card mt-6"><h2 className="text-xl font-semibold">Your submission</h2>{activity.submitted_at&&<p className="mt-2 text-sm text-zinc-400">{activity.status} · {activity.submitted_at.toLocaleString()}</p>}{activity.file_name&&activity.submission_id&&<a className="mt-3 inline-block text-sm text-violet-300" href={`/api/activities/submissions/${activity.submission_id}/file`}>Download {activity.file_name}</a>}<div className="mt-5"><SubmissionForm activityId={activityId} initialText={activity.text_content??''} canResubmit={!locked}/></div></section></DashboardShell>;
}
