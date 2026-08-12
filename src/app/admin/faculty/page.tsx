import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireFaculty } from "@/lib/admin-scope";

export default async function FacultyDashboard() {
  const { session, institutionId } = await requireFaculty();
  const rows = await prisma.$queryRaw<Array<{ batches: bigint; learners: bigint; courses: bigint; average_completion: number | null; falling_behind: bigint; pending_submissions: bigint; recent_graded: bigint }>>`
    WITH learners AS (
      SELECT DISTINCT membership.user_id FROM public.user_academic_memberships membership
      JOIN public.faculty_assignments assignment ON assignment.faculty_id=${session.user.id}::uuid AND assignment.active
        AND assignment.institution_id=membership.institution_id
        AND (assignment.batch_id IS NULL OR assignment.batch_id=membership.batch_id)
        AND (assignment.cohort_id IS NULL OR assignment.cohort_id=membership.cohort_id)
      WHERE membership.institution_id=${institutionId}::uuid AND membership.membership_type='STUDENT' AND membership.active
    )
    SELECT (SELECT count(DISTINCT batch_id) FROM public.faculty_assignments WHERE faculty_id=${session.user.id}::uuid AND active)::bigint batches,
      (SELECT count(*) FROM learners)::bigint learners,
      (SELECT count(*) FROM public.institution_course_access WHERE institution_id=${institutionId}::uuid AND active)::bigint courses,
      (SELECT round(avg(progress_percentage),1) FROM public.student_content_progress WHERE student_id IN (SELECT user_id FROM learners))::float average_completion,
      (SELECT count(*) FROM learners learner WHERE NOT EXISTS (SELECT 1 FROM public.student_content_progress progress WHERE progress.student_id=learner.user_id AND progress.last_viewed_at>now()-interval '14 days'))::bigint falling_behind,
      (SELECT count(*) FROM public.activity_submissions submission JOIN public.learning_activities activity ON activity.id=submission.activity_id WHERE activity.faculty_id=${session.user.id}::uuid AND submission.status IN ('submitted','late'))::bigint pending_submissions,
      (SELECT count(*) FROM public.activity_submissions submission JOIN public.learning_activities activity ON activity.id=submission.activity_id WHERE activity.faculty_id=${session.user.id}::uuid AND submission.status='graded' AND submission.graded_at>=now()-interval '7 days')::bigint recent_graded
  `;
  const metrics=rows[0];
  return <DashboardShell {...session.user}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["My classes",metrics.batches],["Assigned students",metrics.learners],["Pending submissions",metrics.pending_submissions],["Recently graded",metrics.recent_graded],["Available courses",metrics.courses],["Average completion",`${metrics.average_completion??0}%`],["Falling behind",metrics.falling_behind]].map(([label,value])=><section className="glass-card" key={label}><p className="text-sm text-zinc-400">{label}</p><p className="mt-3 text-3xl font-semibold">{String(value)}</p></section>)}</div><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Link className="glass-card hover:border-violet-400/40" href="/admin/faculty/activities"><h2 className="text-xl font-semibold">Create and grade activities</h2><p className="mt-2 text-zinc-400">Publish homework, classwork or assignments and grade submissions.</p></Link><Link className="glass-card hover:border-violet-400/40" href="/admin/faculty/learners"><h2 className="text-xl font-semibold">Students</h2><p className="mt-2 text-zinc-400">Open student profiles, review learning activity and provide feedback.</p></Link><Link className="glass-card hover:border-violet-400/40" href="/admin/faculty/content"><h2 className="text-xl font-semibold">Teaching content</h2><p className="mt-2 text-zinc-400">View published lessons available to your institution.</p></Link><Link className="glass-card hover:border-violet-400/40" href="/admin/faculty/assessments"><h2 className="text-xl font-semibold">Assessments</h2><p className="mt-2 text-zinc-400">Create, assign and review institutional assessments.</p></Link></div></DashboardShell>;
}
