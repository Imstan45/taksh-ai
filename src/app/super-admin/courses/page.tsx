import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { CourseAssignmentForms } from "@/components/super-admin/course-assignment-forms";
import { assignStudentCourse, grantInstitutionCourse, revokeStudentCourse } from "../actions";

export default async function CourseOperationsPage() {
  const session=await auth(); if(!session?.user||session.user.role!=="SUPER_ADMIN")redirect("/super-admin/login");
  const [courses,institutions,students,assignments]=await Promise.all([
    prisma.$queryRaw<Array<{course:string}>>`SELECT DISTINCT course FROM public.taksh_content_assets WHERE status='published' ORDER BY course`,
    prisma.$queryRaw<Array<{id:string;name:string;institution_type:"school"|"college"}>>`SELECT id,name,institution_type FROM public.institutions WHERE status='active' ORDER BY name`,
    prisma.$queryRaw<Array<{id:string;email:string;institution_type:"school"|"college"}>>`SELECT account.id,account.email,institution.institution_type FROM auth.users account JOIN public.user_roles role ON role.user_id=account.id JOIN public.institutions institution ON institution.id=role.institution_id WHERE role.role='STUDENT' AND role.account_status='active' ORDER BY account.email`,
    prisma.$queryRaw<Array<{id:string;email:string;course:string;active:boolean}>>`SELECT assignment.id,users.email,assignment.course,assignment.active FROM public.student_course_assignments assignment JOIN auth.users users ON users.id=assignment.student_id ORDER BY assignment.assigned_at DESC LIMIT 100`,
  ]);
  return <DashboardShell {...session.user}>
    <CourseAssignmentForms courses={courses.map(item=>item.course)} institutions={institutions} students={students} grantAction={grantInstitutionCourse} assignAction={assignStudentCourse}/>
    <section className="glass-card mt-6"><h2 className="text-xl font-semibold">Student assignments</h2><div className="mt-4 divide-y divide-white/10">{assignments.map(item=><div className="flex items-center justify-between gap-4 py-4" key={item.id}><div><b>{item.email}</b><p className="text-sm text-zinc-500">{item.course}</p></div>{item.active?<ActionFeedbackForm action={revokeStudentCourse} successMessage="Course assignment revoked." pendingMessage="Revoking assignment…" confirmMessage={`Revoke ${item.course} from ${item.email}?`}><input type="hidden" name="assignmentId" value={item.id}/><button className="btn-ghost border border-white/10">Revoke</button></ActionFeedbackForm>:<span className="text-xs text-zinc-500">Revoked</span>}</div>)}</div></section>
  </DashboardShell>;
}
