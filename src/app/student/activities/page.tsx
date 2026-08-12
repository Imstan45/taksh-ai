import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

type Filter = "todo" | "submitted" | "graded" | "all";
export default async function StudentActivities({ searchParams }: { searchParams: Promise<{ view?: string; type?: string }> }) {
  const session=await auth(); if(!session?.user||session.user.role!=="STUDENT")redirect("/login");
  const query=await searchParams; const view=(['todo','submitted','graded','all'].includes(query.view??'')?query.view:'todo') as Filter; const type=query.type??'';
  const rows=await prisma.$queryRaw<Array<{ id:string;title:string;description:string;activity_type:string;course:string;due_at:Date|null;max_marks:number;faculty_email:string;status:string;submission_status:string|null;marks:number|null;grade:string|null;overdue:boolean }>>`
    SELECT activity.id,activity.title,activity.description,activity.activity_type,activity.course,activity.due_at,
      activity.max_marks::float max_marks,faculty.email faculty_email,activity.status,submission.status submission_status,
      submission.marks::float marks,submission.grade,(activity.due_at<now() AND submission.id IS NULL) overdue
    FROM public.learning_activities activity JOIN auth.users faculty ON faculty.id=activity.faculty_id
    LEFT JOIN public.activity_submissions submission ON submission.activity_id=activity.id AND submission.student_id=${session.user.id}::uuid
    WHERE activity.status IN ('published','closed') AND (activity.student_id=${session.user.id}::uuid OR EXISTS (
      SELECT 1 FROM public.user_academic_memberships membership
      WHERE membership.user_id=${session.user.id}::uuid AND membership.active AND membership.batch_id=activity.batch_id
    ))
      AND (${type}='' OR activity.activity_type=${type})
      AND (${view}='all' OR (${view}='todo' AND submission.status IS NULL) OR (${view}='submitted' AND submission.status IN ('submitted','late','returned')) OR (${view}='graded' AND submission.status='graded'))
    ORDER BY (activity.due_at IS NULL),activity.due_at,activity.created_at DESC`;
  const href=(nextView:string)=>`/student/activities?view=${nextView}${type?`&type=${type}`:""}`;
  return <DashboardShell {...session.user}><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">Learning activities</h2><p className="mt-2 text-zinc-400">Homework, classwork and assignments from your faculty.</p></div><form className="flex gap-2"><input type="hidden" name="view" value={view}/><select className="field" name="type" defaultValue={type}><option value="">All types</option><option value="homework">Homework</option><option value="classwork">Classwork</option><option value="assignment">Assignments</option></select><button className="btn-ghost">Filter</button></form></div><nav className="mt-6 flex flex-wrap gap-2">{['todo','submitted','graded','all'].map(item=><Link className={view===item?'btn-primary':'btn-ghost border border-white/10'} href={href(item)} key={item}>{item.replace(/^./,c=>c.toUpperCase())}</Link>)}</nav><div className="mt-6 grid gap-4 md:grid-cols-2">{rows.length?rows.map(item=><Link className="glass-card hover:border-violet-400/40" href={`/student/activities/${item.id}`} key={item.id}><div className="flex justify-between gap-3"><p className="eyebrow">{item.activity_type}</p><span className={`text-xs ${item.submission_status==='graded'?'text-emerald-300':item.overdue?'text-red-300':'text-zinc-400'}`}>{item.submission_status??(item.overdue?'Overdue':'To do')}</span></div><h3 className="mt-4 text-xl font-semibold">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.description}</p><p className="mt-4 text-sm">{item.course} · {item.max_marks} marks</p><p className="mt-1 text-xs text-zinc-500">{item.due_at?`Due ${item.due_at.toLocaleString()}`:'No deadline'} · {item.faculty_email}</p>{item.marks!==null&&<p className="mt-3 font-semibold text-emerald-300">{item.marks}/{item.max_marks}{item.grade?` · ${item.grade}`:''}</p>}</Link>):<section className="learning-empty md:col-span-2"><h3>Nothing here right now</h3><p>Your activities will appear as faculty publish them.</p></section>}</div></DashboardShell>;
}
