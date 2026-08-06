import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

export default async function InstitutionDetail({params}:{params:Promise<{institutionId:string}>}) {
  const session=await auth(); if(!session?.user||session.user.role!=="SUPER_ADMIN")redirect("/login");
  const {institutionId}=await params;
  const institutions=await prisma.$queryRaw<Array<{id:string;name:string;slug:string;status:string;institution_type:string;created_at:Date}>>`SELECT id,name,slug,status,institution_type,created_at FROM public.institutions WHERE id=${institutionId}::uuid`;
  if(!institutions[0])notFound(); const institution=institutions[0];
  const [counts,people,courses,invitations]=await Promise.all([
    prisma.$queryRaw<Array<{students:bigint;faculty:bigint;admins:bigint;active_assignments:bigint}>>`SELECT count(*) FILTER(WHERE role='STUDENT')::bigint students,count(*) FILTER(WHERE role='FACULTY')::bigint faculty,count(*) FILTER(WHERE role='COLLEGE_ADMIN')::bigint admins,(SELECT count(*) FROM public.student_course_assignments WHERE institution_id=${institutionId}::uuid AND active)::bigint active_assignments FROM public.user_roles WHERE institution_id=${institutionId}::uuid`,
    prisma.$queryRaw<Array<{email:string;role:string;account_status:string}>>`SELECT account.email,role.role::text,role.account_status FROM public.user_roles role JOIN auth.users account ON account.id=role.user_id WHERE role.institution_id=${institutionId}::uuid ORDER BY role.role,account.email LIMIT 25`,
    prisma.$queryRaw<Array<{course:string;active:boolean}>>`SELECT course,active FROM public.institution_course_access WHERE institution_id=${institutionId}::uuid ORDER BY course`,
    prisma.$queryRaw<Array<{email:string;role:string;status:string}>>`SELECT email,role::text,status FROM public.invitations WHERE institution_id=${institutionId}::uuid ORDER BY created_at DESC LIMIT 10`,
  ]);
  const metrics=[["Students",counts[0]?.students],["Faculty",counts[0]?.faculty],["Admins",counts[0]?.admins],["Active assignments",counts[0]?.active_assignments]];
  return <DashboardShell {...session.user}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link className="text-sm text-violet-300" href="/super-admin/institutions">← Institutions</Link><h2 className="mt-3 text-3xl font-semibold">{institution.name}</h2><p className="mt-2 text-zinc-400">{institution.slug} · {institution.institution_type} · <span className="capitalize">{institution.status}</span></p></div><Link className="btn-primary" href={`/super-admin/users?institution=${institution.id}`}>Manage people</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value])=><section className="glass-card" key={String(label)}><p className="text-sm text-zinc-400">{String(label)}</p><b className="mt-2 block text-3xl">{Number(value??0)}</b></section>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="glass-card"><h3 className="text-xl font-semibold">People</h3><div className="mt-4 divide-y divide-white/10">{people.map(person=><div className="flex justify-between gap-3 py-3" key={person.email}><span>{person.email}</span><small className="text-zinc-500">{person.role.replaceAll("_"," ")} · {person.account_status}</small></div>)}{!people.length&&<p className="text-zinc-500">No people assigned.</p>}</div></section>
    <section className="glass-card"><h3 className="text-xl font-semibold">Enabled courses</h3><div className="mt-4 divide-y divide-white/10">{courses.map(course=><div className="flex justify-between py-3" key={course.course}><span>{course.course}</span><small className={course.active?"text-emerald-400":"text-zinc-500"}>{course.active?"Active":"Revoked"}</small></div>)}{!courses.length&&<p className="text-zinc-500">No courses enabled.</p>}</div></section>
    <section className="glass-card lg:col-span-2"><h3 className="text-xl font-semibold">Recent invitations</h3><div className="mt-4 divide-y divide-white/10">{invitations.map((invite,index)=><div className="grid gap-2 py-3 md:grid-cols-3" key={`${invite.email}-${index}`}><span>{invite.email}</span><span>{invite.role.replaceAll("_"," ")}</span><span className="capitalize text-zinc-500">{invite.status}</span></div>)}{!invitations.length&&<p className="text-zinc-500">No invitations.</p>}</div></section></div>
  </DashboardShell>;
}
