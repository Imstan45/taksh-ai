import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

export default async function LearnersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { session, institutionId }=await requireFaculty(); const { q="" }=await searchParams;
  const learners=await prisma.$queryRaw<Array<{ id:string;email:string;batch_name:string|null;completion:number|null;last_activity:Date|null;xp:bigint;streak:number|null }>>`
    SELECT DISTINCT role.user_id id,user_account.email,batch.name batch_name,
      (SELECT round(avg(progress_percentage),1) FROM public.student_content_progress WHERE student_id=role.user_id)::float completion,
      (SELECT max(last_viewed_at) FROM public.student_content_progress WHERE student_id=role.user_id) last_activity,
      (SELECT coalesce(sum(points),0) FROM public.student_xp_ledger WHERE student_id=role.user_id)::bigint xp,
      streak.current_streak streak
    FROM public.user_roles role JOIN auth.users user_account ON user_account.id=role.user_id
    JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
    JOIN public.faculty_assignments assignment ON assignment.faculty_id=${session.user.id}::uuid AND assignment.active
      AND assignment.institution_id=membership.institution_id AND (assignment.batch_id IS NULL OR assignment.batch_id=membership.batch_id)
      AND (assignment.cohort_id IS NULL OR assignment.cohort_id=membership.cohort_id)
    LEFT JOIN public.academic_batches batch ON batch.id=membership.batch_id LEFT JOIN public.student_streaks streak ON streak.student_id=role.user_id
    WHERE role.institution_id=${institutionId}::uuid AND role.role='STUDENT' AND user_account.email ILIKE ${`%${q}%`}
    ORDER BY user_account.email`;
  return <DashboardShell {...session.user}><form className="flex gap-3"><input className="field" name="q" defaultValue={q} placeholder="Search learner"/><button className="btn-ghost">Search</button></form><section className="glass-card mt-6"><div className="space-y-3">{learners.map((learner)=><Link className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-5" href={`/admin/faculty/learners/${learner.id}`} key={learner.id}><b>{learner.email}</b><span>{learner.batch_name??"No batch"}</span><span>{learner.completion??0}% complete</span><span>{Number(learner.xp)} XP · {learner.streak??0} day streak</span><span>{learner.last_activity?learner.last_activity.toLocaleDateString():"No activity"}</span></Link>)}</div></section></DashboardShell>;
}
